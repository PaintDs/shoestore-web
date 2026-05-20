from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import calendar

from database import get_db
from .auth import get_current_user, get_accounting_user

router = APIRouter(
    prefix="/api",
    tags=["Accounting, Reports & Salaries"]
)

# ================= MODELS =================

class InvoiceCreate(BaseModel):
    order_id: int; customer_name: str; company_name: str; tax_id: str; address: str; total_amount: int

class InvoiceAdjust(BaseModel):
    reason: str

class CashLedgerCreate(BaseModel):
    type: str; category: str; amount: int; method: str; description: str

class PeriodLockRequest(BaseModel):
    month: int
    year: int

class PromotionCreate(BaseModel):
    name: str
    code: str
    discount_type: str # 'percentage' hoặc 'fixed'
    discount_value: float
    max_discount_amount: Optional[int] = None # Bắt buộc nếu type là 'percentage'
    min_order_value: int = 0
    usage_limit: int
    start_date: str # Sửa thành string để nhận định dạng từ client
    end_date: str   # Sửa thành string để nhận định dạng từ client

class SalarySetup(BaseModel):
    user_id: int; base_salary: int; coefficient: float = 1.0

class TimesheetEntry(BaseModel):
    user_id: int; work_date: str; hours_worked: float

class BonusPenaltyRequest(BaseModel):
    user_id: int; month: int; year: int; amount: int; reason: str

# Constants
SALES_COMMISSION_RATE = 0.05 # 5% commission for sales

# ================= ENDPOINTS: ACCOUNTING =================

@router.post("/accounting/invoices")
def create_invoice(invoice: InvoiceCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    if not invoice.tax_id.isdigit() or len(invoice.tax_id) not in [10, 13]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ACC_INV_03: Mã số thuế không hợp lệ.")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO invoices (order_id, customer_name, company_name, tax_id, address, total_amount, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (invoice.order_id, invoice.customer_name, invoice.company_name, invoice.tax_id, invoice.address, invoice.total_amount, datetime.now(timezone.utc))
    )
    conn.commit()
    return {"message": "ACC_INV_01: Xuất hóa đơn thành công!", "invoice_id": cursor.lastrowid}

@router.get("/accounting/invoices")
def search_invoices(search_term: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    query = "SELECT * FROM invoices"
    params = []
    if search_term:
        query += " WHERE id LIKE ? OR customer_name LIKE ? OR tax_id LIKE ? OR company_name LIKE ?"
        term = f"%{search_term}%"
        params.extend([term, term, term, term])
    query += " ORDER BY issued_at DESC"
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]

@router.put("/accounting/invoices/{invoice_id}/adjust")
def adjust_invoice(invoice_id: int, req: InvoiceAdjust, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET status = 'cancelled', adjustment_reason = ? WHERE id = ?", (req.reason, invoice_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hóa đơn để điều chỉnh.")
    conn.commit()
    return {"message": "ACC_INV_05: Hóa đơn đã được điều chỉnh/hủy thành công."}

@router.post("/accounting/cash-ledger")
def create_cash_entry(entry: CashLedgerCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    # ACC_FIN_06: Kiểm tra xem kỳ kế toán hiện tại đã bị khóa chưa
    now = datetime.now(timezone.utc)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM accounting_periods WHERE month = ? AND year = ?", (now.month, now.year))
    period = cursor.fetchone()

    if period and period['status'] == 'locked':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"ACC_FIN_06: Kỳ kế toán {now.month}/{now.year} đã được khóa sổ. Không thể ghi nhận giao dịch mới."
        )
    
    if entry.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ACC_CASH_03: Số tiền phải là số dương.")

    cursor.execute("INSERT INTO cash_ledger (type, category, amount, method, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                   (entry.type, entry.category, entry.amount, entry.method, entry.description, now))
    conn.commit()
    return {"message": "ACC_CASH_01/02: Ghi nhận giao dịch vào sổ quỹ thành công!", "entry_id": cursor.lastrowid}

@router.get("/accounting/cash-ledger")
def get_cash_ledger(start: Optional[str] = None, end: Optional[str] = None, method: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    
    query = "SELECT * FROM cash_ledger WHERE 1=1"
    params = []
    
    if start:
        query += " AND created_at >= ?"
        params.append(start)
    if end:
        query += " AND created_at <= ?"
        params.append(end)
    if method and method != 'all':
        query += " AND method = ?"
        params.append(method)
        
    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    transactions = [dict(row) for row in cursor.fetchall()]
    
    # Tính toán summary
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    
    summary = {
        "income": total_income,
        "expense": total_expense,
    }
    
    return {"transactions": transactions, "summary": summary}

@router.post("/accounting/periods/lock")
def lock_accounting_period(req: PeriodLockRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM accounting_periods WHERE month = ? AND year = ?", (req.month, req.year))
    period = cursor.fetchone()
    if period and period['status'] == 'locked':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kỳ kế toán {req.month}/{req.year} đã được khóa trước đó.")
    
    cursor.execute("INSERT OR REPLACE INTO accounting_periods (month, year, status) VALUES (?, ?, 'locked')", (req.month, req.year))
    conn.commit()
    return {"message": f"ACC_FIN_06: Đã khóa sổ thành công kỳ kế toán {req.month}/{req.year}."}

@router.get("/accounting/reports")
def get_financial_report(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM accounting_periods WHERE month = ? AND year = ?", (month, year))
    period = cursor.fetchone()

    if not period or period['status'] != 'locked':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ACC_FIN_03: Không thể lập báo cáo cho kỳ chưa khóa sổ hoặc chưa có dữ liệu."
        )
    
    start_date_str = f"{year}-{str(month).zfill(2)}-01"
    last_day = calendar.monthrange(year, month)[1]
    end_date_str = f"{year}-{str(month).zfill(2)}-{last_day} 23:59:59"

    cursor.execute(
        "SELECT SUM(total_amount) as revenue FROM orders WHERE status = 'completed' AND created_at BETWEEN ? AND ?",
        (start_date_str, end_date_str)
    )
    revenue_data = cursor.fetchone()
    total_revenue = revenue_data['revenue'] if revenue_data and revenue_data['revenue'] else 0

    # Giả lập Giá vốn hàng bán (COGS) = 60% doanh thu để demo
    cogs = total_revenue * 0.6
    gross_profit = total_revenue - cogs

    return {
        "period": f"{month}/{year}",
        "total_revenue": total_revenue,
        "cogs": cogs,
        "gross_profit": gross_profit,
        "net_profit": gross_profit # Giả lập lợi nhuận ròng = lợi nhuận gộp
    }

# ================= ENDPOINTS: REPORTS =================

@router.get("/reports/performance")
def get_performance_report(start_date: Optional[datetime] = None, end_date: Optional[datetime] = None, report_type: str = "daily", conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    # ... (logic giữ nguyên)
    pass

@router.get("/reports/top-products")
def get_top_products_report(limit: int = 5, sort_by: str = "quantity", current_user: dict = Depends(get_current_user)):
    # ... (logic giữ nguyên)
    pass

@router.get("/reports/export")
def export_report(report_name: str, current_user: dict = Depends(get_current_user)):
    # ... (logic giữ nguyên)
    pass

@router.post("/promotions")
def create_promotion(promo: PromotionCreate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền tạo khuyến mãi.")

    # BƯỚC 2: SỬA LOGIC PARSE DATETIME TRONG API ROUTER
    try:
        # Chuẩn hóa SA/CH và parse chuỗi ngày tháng từ client
        start_date_str = promo.start_date.replace(' SA', ' AM').replace(' CH', ' PM')
        end_date_str = promo.end_date.replace(' SA', ' AM').replace(' CH', ' PM')
        
        # Sử dụng strptime để parse và gán múi giờ UTC
        start_date_obj = datetime.strptime(start_date_str, '%d/%m/%Y %I:%M %p').replace(tzinfo=timezone.utc)
        end_date_obj = datetime.strptime(end_date_str, '%d/%m/%Y %I:%M %p').replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng định dạng DD/MM/YYYY HH:MM SA/CH.")

    # CHỈ THỊ 1.1: Kiểm tra ngày (sử dụng object đã parse)
    if end_date_obj <= start_date_obj:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ngày kết thúc phải lớn hơn ngày bắt đầu.")

    # CHỈ THỊ 1.2: Ràng buộc định mức (Mã TC_PROMO_01)
    if promo.discount_type not in ['percentage', 'fixed']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loại giảm giá chỉ có thể là 'percentage' hoặc 'fixed'.")
    
    if promo.discount_type == 'percentage':
        if not (0 < promo.discount_value <= 100):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Với loại 'percentage', giá trị giảm phải lớn hơn 0 và nhỏ hơn hoặc bằng 100.")
        if promo.max_discount_amount is None or promo.max_discount_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Với loại 'percentage', bắt buộc phải có 'max_discount_amount' (số tiền giảm tối đa) và phải lớn hơn 0.")
    
    if promo.discount_type == 'fixed':
        if promo.discount_value <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Với loại 'fixed', giá trị giảm phải lớn hơn 0.")
        promo.max_discount_amount = None # Không áp dụng cho loại fixed

    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO promotions 
            (name, code, discount_type, discount_value, max_discount_amount, min_order_value, usage_limit, start_date, end_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                promo.name, promo.code.upper(), promo.discount_type, promo.discount_value,
                promo.max_discount_amount, promo.min_order_value, promo.usage_limit,
                start_date_obj, end_date_obj
            )
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Mã khuyến mãi '{promo.code.upper()}' đã tồn tại.")

    return {"message": "Tạo mã giảm giá thành công!", "id": cursor.lastrowid}


# Helper to check if payroll is locked
def _check_payroll_locked(conn: sqlite3.Connection, user_id: int, month: int, year: int):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM payrolls WHERE user_id = ? AND month = ? AND year = ?", (user_id, month, year))
    payroll_entry = cursor.fetchone()
    if payroll_entry and payroll_entry['status'] == 'locked':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Bảng lương của nhân viên này cho kỳ {month}/{year} đã bị chốt. Không thể chỉnh sửa.")


# ================= ENDPOINTS: SALARIES =================

@router.post("/salaries/setup")
def setup_salary(salary_data: SalarySetup, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thiết lập lương.")
    if salary_data.base_salary <= 0 or salary_data.coefficient <= 0:
        # MGR_SAL_02: Chặn dữ liệu lỗi
        raise HTTPException(status_code=400, detail="Mức lương cơ bản và hệ số phải lớn hơn 0.")
    
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO salaries (user_id, base_salary, coefficient) VALUES (?, ?, ?)",
                   (salary_data.user_id, salary_data.base_salary, salary_data.coefficient))
    conn.commit()
    return {"message": "Thiết lập lương thành công!"}

@router.get("/salaries/setup/{user_id}")
def get_salary_setup(user_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"] and current_user["id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xem thiết lập lương này.")
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, base_salary, coefficient FROM salaries WHERE user_id = ?", (user_id,))
    return dict(cursor.fetchone()) if cursor.fetchone() else {"user_id": user_id, "base_salary": 0, "coefficient": 1.0}

@router.post("/salaries/timesheet")
def update_timesheet(timesheet_entry: TimesheetEntry, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chấm công.")
    
    _check_payroll_locked(conn, timesheet_entry.user_id, datetime.strptime(timesheet_entry.work_date, '%Y-%m-%d').month, datetime.strptime(timesheet_entry.work_date, '%Y-%m-%d').year)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO timesheets (user_id, work_date, hours_worked) VALUES (?, ?, ?)",
        (timesheet_entry.user_id, timesheet_entry.work_date, timesheet_entry.hours_worked)
    )
    conn.commit()
    return {"message": "MGR_SAL_03: Chấm công thành công!"}

@router.get("/salaries/commission/{user_id}/{year}/{month}")
def get_commission(user_id: int, year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"] and current_user["id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xem hoa hồng này.")
    
    cursor = conn.cursor()
    # MGR_SAL_04: Tính hoa hồng tự động
    # Giả định orders có sales_person_id
    cursor.execute(
        """
        SELECT SUM(total_amount) FROM orders 
        WHERE sales_person_id = ? AND status = 'completed' 
        AND STRFTIME('%Y', created_at) = ? AND STRFTIME('%m', created_at) = ? AND user_id = ?
        """,
        (user_id, str(year), str(month).zfill(2))
    )
    total_sales = cursor.fetchone()[0] or 0
    
    # Lấy vai trò của người dùng để xác định tỷ lệ hoa hồng
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    user_role = cursor.fetchone()
    if user_role and user_role['role'] == 'sale':
        commission = int(total_sales * SALES_COMMISSION_RATE)
    else:
        commission = 0 # Chỉ nhân viên sale mới có hoa hồng

    return {"user_id": user_id, "year": year, "month": month, "commission": commission}

@router.post("/salaries/bonus-penalty")
def add_bonus_penalty(req: BonusPenaltyRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thêm thưởng/phạt.")
    
    # MGR_SAL_05: Chặn dữ liệu lỗi
    if req.amount == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Số tiền thưởng/phạt không thể bằng 0.")
    
    _check_payroll_locked(conn, req.user_id, req.month, req.year)

    cursor = conn.cursor()
    # Kiểm tra xem đã có bản ghi payroll cho user/tháng/năm này chưa
    cursor.execute("SELECT bonus, penalty FROM payrolls WHERE user_id = ? AND month = ? AND year = ?", (req.user_id, req.month, req.year))
    existing_payroll = cursor.fetchone()

    if existing_payroll:
        if req.amount > 0: # Thưởng
            cursor.execute("UPDATE payrolls SET bonus = bonus + ? WHERE user_id = ? AND month = ? AND year = ?", (req.amount, req.user_id, req.month, req.year))
        else: # Phạt
            cursor.execute("UPDATE payrolls SET penalty = penalty + ? WHERE user_id = ? AND month = ? AND year = ?", (abs(req.amount), req.user_id, req.month, req.year))
    else: # Chưa có bản ghi, tạo mới
        cursor.execute("INSERT INTO payrolls (user_id, month, year, bonus, penalty, status) VALUES (?, ?, ?, ?, ?, 'unlocked')", (req.user_id, req.month, req.year, req.amount if req.amount > 0 else 0, abs(req.amount) if req.amount < 0 else 0))
    conn.commit()
    return {"message": "Thêm thưởng/phạt thành công!"}

@router.post("/salaries/finalize/{year}/{month}")
def finalize_payroll(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chốt bảng lương.")
    
    cursor = conn.cursor()
    
    # MGR_SAL_06: Chốt và Khóa bảng lương
    # 1. Kiểm tra xem kỳ lương đã bị khóa chưa
    cursor.execute("SELECT status FROM payrolls WHERE month = ? AND year = ? LIMIT 1", (month, year))
    existing_status = cursor.fetchone()
    if existing_status and existing_status['status'] == 'locked':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Kỳ lương {month}/{year} đã được chốt trước đó. Không thể chốt lại.")

    # 2. Lấy danh sách tất cả nhân viên (trừ admin, it, customer)
    cursor.execute("SELECT id, role FROM users WHERE role NOT IN ('admin', 'it', 'customer')")
    employees = cursor.fetchall()

    if not employees:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không có nhân viên nào để chốt bảng lương.")

    days_in_month = calendar.monthrange(year, month)[1]
    start_date_month = f"{year}-{str(month).zfill(2)}-01"
    end_date_month = f"{year}-{str(month).zfill(2)}-{days_in_month} 23:59:59"

    for employee in employees:
        user_id = employee['id']
        user_role = employee['role']

        # Lấy thiết lập lương cơ bản
        cursor.execute("SELECT base_salary, coefficient FROM salaries WHERE user_id = ?", (user_id,))
        salary_setup = cursor.fetchone()
        base_salary = salary_setup['base_salary'] if salary_setup else 0
        coefficient = salary_setup['coefficient'] if salary_setup else 1.0

        # Tính ngày công
        cursor.execute(
            """
            SELECT SUM(hours_worked) FROM timesheets 
            WHERE user_id = ? AND STRFTIME('%Y', work_date) = ? AND STRFTIME('%m', work_date) = ?
            """,
            (user_id, str(year), str(month).zfill(2))
        )
        total_hours_worked = cursor.fetchone()[0] or 0
        work_days = round(total_hours_worked / 8, 2) # Giả định 8 giờ/ngày

        # Tính hoa hồng (chỉ cho nhân viên sale)
        commission = 0
        if user_role == 'sale':
            cursor.execute(
                """
                SELECT SUM(total_amount) FROM orders 
                WHERE user_id = ? AND status = 'completed' 
                AND created_at BETWEEN ? AND ?
                """,
                (user_id, start_date_month, end_date_month)
            )
            total_sales = cursor.fetchone()[0] or 0
            commission = int(total_sales * SALES_COMMISSION_RATE)

        # Lấy thưởng/phạt đã ghi nhận
        cursor.execute("SELECT bonus, penalty FROM payrolls WHERE user_id = ? AND month = ? AND year = ?", (user_id, month, year))
        existing_bp = cursor.fetchone()
        bonus = existing_bp['bonus'] if existing_bp else 0
        penalty = existing_bp['penalty'] if existing_bp else 0

        # Tính tổng lương
        # Giả định lương cơ bản được tính theo ngày công thực tế
        daily_base_salary = (base_salary * coefficient) / days_in_month if days_in_month > 0 else 0
        total_salary = int((daily_base_salary * work_days) + commission + bonus - penalty)
        if total_salary < 0: total_salary = 0 # Lương không thể âm

        # Cập nhật hoặc chèn vào bảng payrolls
        cursor.execute(
            """
            INSERT OR REPLACE INTO payrolls 
            (user_id, month, year, base_salary, work_days, commission, bonus, penalty, total_salary, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'locked')
            """,
            (user_id, month, year, base_salary, work_days, commission, bonus, penalty, total_salary)
        )
    
    conn.commit()
    return {"message": f"MGR_SAL_06: Đã chốt bảng lương thành công cho kỳ {month}/{year}."}

@router.get("/salaries/export")
def export_payroll_report(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xuất báo cáo lương.")
    # MGR_SAL_07: Xuất file Excel/PDF
    # Logic xuất file thực tế sẽ phức tạp hơn, cần thư viện như openpyxl hoặc reportlab.
    # Hiện tại, chỉ trả về một thông báo thành công.
    # Frontend sẽ nhận thông báo này và có thể kích hoạt download một file mock hoặc thông báo thành công.
    return {"message": "MGR_SAL_07: Đã yêu cầu xuất báo cáo lương. File sẽ được tạo và gửi đến bạn."}

@router.get("/salaries/payroll/{year}/{month}")
def get_payroll_data(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập bảng lương.")
    cursor = conn.cursor()

    try:
        # Kiểm tra xem kỳ lương đã bị khóa chưa
        cursor.execute("SELECT status FROM payrolls WHERE month = ? AND year = ? LIMIT 1", (month, year))
        payroll_status = cursor.fetchone()
        is_locked = payroll_status and payroll_status['status'] == 'locked'

        query = """
            SELECT
                u.id as user_id, u.name, u.role,
                s.base_salary, s.coefficient,
                p.month, p.year,
                p.work_days, p.commission, p.bonus, p.penalty, p.total_salary, p.status
            FROM users u
            LEFT JOIN salaries s ON u.id = s.user_id
            LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ?
            WHERE u.role NOT IN ('admin', 'it', 'customer')
            ORDER BY u.name
        """
        cursor.execute(query, (year, month))
        raw_payroll_data = [dict(row) for row in cursor.fetchall()]

        processed_payroll_data = []
        days_in_month = 26 # Quy định số ngày công chuẩn trong tháng, theo yêu cầu
        start_date_month = f"{year}-{str(month).zfill(2)}-01"
        end_date_month = f"{year}-{str(month).zfill(2)}-{calendar.monthrange(year, month)[1]} 23:59:59"

        for entry in raw_payroll_data:
            user_id = entry['user_id']
            user_role = entry['role']
            
            # Nếu trạng thái là 'locked', lấy dữ liệu trực tiếp từ payrolls
            if entry.get('status') == 'locked' and entry.get('total_salary') is not None:
                processed_payroll_data.append(entry)
                continue
            
            # NHIỆM VỤ 2: VÁ LOGIC PHÒNG THỦ
            # Sử dụng .get() kèm giá trị mặc định dự phòng để chặn hoàn toàn lỗi KeyError
            base_salary = entry.get('base_salary') if entry.get('base_salary') is not None else 0
            coefficient = entry.get('coefficient') if entry.get('coefficient') is not None else 1.0
            work_days = entry.get('work_days') if entry.get('work_days') is not None else 0
            bonus = entry.get('bonus') if entry.get('bonus') is not None else 0 # Lấy thưởng từ payrolls nếu có
            penalty = entry.get('penalty') if entry.get('penalty') is not None else 0 # Lấy phạt từ payrolls nếu có

            # Logic tính hoa hồng (commission) - giữ nguyên
            commission = 0
            if user_role == 'sale':
                cursor.execute(
                    """
                    SELECT SUM(total_amount) FROM orders 
                    WHERE user_id = ? AND status = 'completed' AND created_at BETWEEN ? AND ?
                    """,
                    (user_id, start_date_month, end_date_month) # user_id ở đây là sales_person_id
                )
                total_sales = cursor.fetchone()[0] or 0
                commission = int(total_sales * SALES_COMMISSION_RATE)

            # Tính toán tổng lương an toàn theo cấu trúc phòng thủ
            daily_base_salary = (base_salary * coefficient) / days_in_month if days_in_month > 0 else 0
            total_salary = int((daily_base_salary * work_days) + commission + bonus - penalty)
            if total_salary < 0: total_salary = 0

            processed_payroll_data.append({
                **entry, 
                'base_salary': base_salary, 'coefficient': coefficient, 'work_days': work_days, 
                'commission': commission, 'bonus': bonus, 'penalty': penalty, 'total_salary': total_salary, 
                'status': entry.get('status') or 'unlocked'
            })
        return processed_payroll_data
    except Exception as e:
        # In lỗi chí mạng ra terminal của uvicorn để xem tên cột/bảng bị sai
        print("====== LỖI CHÍ MẠNG TẠI API PAYROLL ======")
        print(str(e))
        print("==========================================")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Lỗi SQL nghiệp vụ: {str(e)}")