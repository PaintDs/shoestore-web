from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
import sqlite3
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from datetime import datetime, timezone, timedelta
import calendar
import csv
import io

from database import get_db
from .auth import get_current_user, get_accounting_user

router = APIRouter(
    prefix="/api",
    tags=["Accounting & Reports"]
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
    discount_type: str = "percentage" # Fallback bảo vệ khi Frontend thiếu
    discount_value: float
    max_discount_amount: Optional[int] = None
    min_order_value: int = 0
    usage_limit: int = 1000 # Giá trị an toàn mặc định
    start_date: datetime
    end_date: datetime

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    @model_validator(mode='before')
    @classmethod
    def clean_frontend_payload(cls, data: any) -> any:
        if isinstance(data, dict):
            # Tự động map loại giảm giá nếu Frontend gửi lên bị thiếu
            if 'discountType' not in data and 'discount_type' not in data:
                data['discountType'] = 'percentage'
            
            # Xử lý dứt điểm chuỗi ngày tháng tiếng Việt "21/05/2026 04:56 SA"
            def parse_vn_date(val):
                if isinstance(val, str) and ('SA' in val or 'CH' in val):
                    try:
                        val_en = val.replace(' SA', ' AM').replace(' CH', ' PM')
                        return datetime.strptime(val_en, '%d/%m/%Y %I:%M %p')
                    except ValueError:
                        pass
                return val

            for key in ['startDate', 'start_date', 'endDate', 'end_date']:
                if key in data:
                    data[key] = parse_vn_date(data[key])
                    
        return data

# ================= ENDPOINTS: ACCOUNTING =================

@router.post("/accounting/invoices")
def create_invoice(invoice: InvoiceCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    if not invoice.tax_id.isdigit() or len(invoice.tax_id) not in [10, 13]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ACC_INV_03: MÃ£ sá»‘ thuáº¿ khÃ´ng há»£p lá»‡.")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO invoices (order_id, customer_name, company_name, tax_id, address, total_amount, issued_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (invoice.order_id, invoice.customer_name, invoice.company_name, invoice.tax_id, invoice.address, invoice.total_amount, datetime.now(timezone.utc))
    )
    conn.commit()
    return {"message": "ACC_INV_01: Xuáº¥t hÃ³a Ä‘Æ¡n thÃ nh cÃ´ng!", "invoice_id": cursor.lastrowid}

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

@router.put("/accounting/invoices/{invoice_id}/cancel")
def cancel_invoice(invoice_id: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("UPDATE invoices SET status = 'cancelled' WHERE id = ? AND status = 'issued'", (invoice_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hóa đơn hoặc hóa đơn đã được hủy trước đó.")
    conn.commit()
    return {"message": "Hủy hóa đơn thành công."}

@router.get("/accounting/invoices/{invoice_id}/download")
def download_invoice(invoice_id: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,))
    invoice = cursor.fetchone()
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hóa đơn.")
    
    invoice = dict(invoice)

    # Format the invoice into a text receipt
    receipt = io.StringIO()
    receipt.write("========================================\n")
    receipt.write("         HÓA ĐƠN BÁN HÀNG (TXT)         \n")
    receipt.write("             SHOESTORE                  \n")
    receipt.write("========================================\n\n")
    receipt.write(f"Số HĐ       : HD-{str(invoice['id']).zfill(5)}\n")
    receipt.write(f"Ngày phát hành: {datetime.fromisoformat(invoice['issued_at']).strftime('%d/%m/%Y %H:%M:%S')}\n")
    receipt.write(f"Mã ĐH gốc    : ORD-2026-{str(invoice['order_id']).zfill(3)}\n")
    receipt.write("-" * 40 + "\n")
    receipt.write("THÔNG TIN KHÁCH HÀNG\n")
    receipt.write(f"Tên người mua : {invoice['customer_name']}\n")
    receipt.write(f"Tên đơn vị    : {invoice['company_name']}\n")
    receipt.write(f"Mã số thuế    : {invoice['tax_id']}\n")
    receipt.write(f"Địa chỉ       : {invoice['address']}\n")
    receipt.write("-" * 40 + "\n\n")
    receipt.write("CHI TIẾT THANH TOÁN\n")
    receipt.write(f"TỔNG CỘNG      : {invoice['total_amount']:,} VND\n\n")
    receipt.write("========================================\n")
    receipt.write("      Cảm ơn quý khách đã mua hàng!     \n")
    receipt.write("========================================\n")

    content = receipt.getvalue()
    receipt.close()

    return PlainTextResponse(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="Hoa_Don_{invoice_id}.txt"'}
    )

@router.post("/accounting/cash-ledger")
def create_cash_entry(entry: CashLedgerCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_accounting_user)):
    # ACC_FIN_06: Kiá»ƒm tra xem ká»³ káº¿ toÃ¡n hiá»‡n táº¡i Ä‘Ã£ bá»‹ khÃ³a chÆ°a
    now = datetime.now(timezone.utc)
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM accounting_periods WHERE month = ? AND year = ?", (now.month, now.year))
    period = cursor.fetchone()

    if period and period['status'] == 'locked':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"ACC_FIN_06: Ká»³ káº¿ toÃ¡n {now.month}/{now.year} Ä‘Ã£ Ä‘Æ°á»£c khÃ³a sá»•. KhÃ´ng thá»ƒ ghi nháº­n giao dá»‹ch má»›i."
        )
    
    if entry.amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ACC_CASH_03: Sá»‘ tiá»n pháº£i lÃ  sá»‘ dÆ°Æ¡ng.")

    cursor.execute("INSERT INTO cash_ledger (type, category, amount, method, description, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                   (entry.type, entry.category, entry.amount, entry.method, entry.description, now))
    conn.commit()
    return {"message": "ACC_CASH_01/02: Ghi nháº­n giao dá»‹ch vÃ o sá»• quá»¹ thÃ nh cÃ´ng!", "entry_id": cursor.lastrowid}

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
    
    # TÃ­nh toÃ¡n summary
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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ká»³ káº¿ toÃ¡n {req.month}/{req.year} Ä‘Ã£ Ä‘Æ°á»£c khÃ³a trÆ°á»›c Ä‘Ã³.")
    
    cursor.execute("INSERT OR REPLACE INTO accounting_periods (month, year, status) VALUES (?, ?, 'locked')", (req.month, req.year))
    conn.commit()
    return {"message": f"ACC_FIN_06: ÄÃ£ khÃ³a sá»• thÃ nh cÃ´ng ká»³ káº¿ toÃ¡n {req.month}/{req.year}."}

@router.get("/accounting/reports")
def get_financial_report(
    start_time: Optional[str] = None, 
    end_time: Optional[str] = None, 
    conn: sqlite3.Connection = Depends(get_db), 
    user: dict = Depends(get_accounting_user)
):
    cursor = conn.cursor()
    
    # Default to current month if no time range is provided
    if not start_time or not end_time:
        now = datetime.now(timezone.utc)
        _, last_day = calendar.monthrange(now.year, now.month)
        start_time_sql = f"{now.year}-{now.month:02d}-01 00:00:00"
        end_time_sql = f"{now.year}-{now.month:02d}-{last_day} 23:59:59"
    else:
        # Convert datetime-local format (YYYY-MM-DDTHH:MM) to SQLite format (YYYY-MM-DD HH:MM:SS)
        start_time_sql = start_time.replace('T', ' ') + ':00'
        end_time_sql = end_time.replace('T', ' ') + ':59'

    query = "SELECT type, SUM(amount) as total FROM cash_ledger WHERE created_at BETWEEN ? AND ? GROUP BY type"
    params = (start_time_sql, end_time_sql)
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    
    total_income = next((row['total'] for row in results if row['type'] == 'income'), 0) or 0
    total_expense = next((row['total'] for row in results if row['type'] == 'expense'), 0) or 0
    net_profit = total_income - total_expense

    return {
        "start_time": start_time_sql,
        "end_time": end_time_sql,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_profit": net_profit
    }

# ================= ENDPOINTS: REPORTS =================

@router.get("/reports/performance")
def get_performance_report(
    report_type: str = "monthly",
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ["admin", "ketoan", "sale"]:
        raise HTTPException(status_code=403, detail="ACC_FIN_05: Báº¡n khÃ´ng cÃ³ quyá»n xem bÃ¡o cÃ¡o.")
    cursor = conn.cursor()
    period_fmt = "%Y-%m" if report_type == "monthly" else "%Y-%m-%d"
    cursor.execute(
        f"""
        SELECT strftime('{period_fmt}', created_at) AS period,
               COUNT(*) AS order_count,
               COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE status IN ('completed', 'shipping', 'confirmed')
        GROUP BY period
        ORDER BY period DESC
        LIMIT 24
        """
    )
    rows = [dict(r) for r in cursor.fetchall()]
    total_revenue = sum(r["revenue"] for r in rows)
    total_orders = sum(r["order_count"] for r in rows)
    cogs = int(total_revenue * 0.6)
    gross_profit = total_revenue - cogs
    cursor.execute("SELECT COUNT(DISTINCT customer_id) FROM orders WHERE customer_id IS NOT NULL")
    new_customers = cursor.fetchone()[0] or 0
    return {
        "report_type": report_type,
        "series": rows,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "gross_profit": gross_profit,
        "net_profit": gross_profit,
        "new_customers": new_customers,
    }


@router.get("/reports/top-products")
def get_top_products_report(
    limit: int = 5,
    sort_by: str = "quantity",
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ["admin", "ketoan", "sale"]:
        raise HTTPException(status_code=403, detail="ACC_FIN_05: Báº¡n khÃ´ng cÃ³ quyá»n xem bÃ¡o cÃ¡o.")
    order_col = "total_quantity" if sort_by == "quantity" else "total_revenue"
    cursor = conn.cursor()
    cursor.execute(
        f"""
        SELECT oi.product_id, oi.product_name,
               SUM(oi.quantity) AS total_quantity,
               SUM(oi.quantity * p.price) AS total_revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        GROUP BY oi.product_id, oi.product_name
        ORDER BY {order_col} DESC
        LIMIT ?
        """,
        (limit,),
    )
    return [dict(row) for row in cursor.fetchall()]


@router.get("/reports/export")
def export_manager_report(
    report_type: str = "monthly",
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=403, detail="MGR_RPT_06: Báº¡n khÃ´ng cÃ³ quyá»n xuáº¥t bÃ¡o cÃ¡o.")
    perf = get_performance_report(report_type=report_type, conn=conn, current_user=current_user)
    top = get_top_products_report(limit=10, sort_by="quantity", conn=conn, current_user=current_user)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["=== BAO CAO HIEU SUAT ==="])
    writer.writerow(["period", "order_count", "revenue"])
    for row in perf["series"]:
        writer.writerow([row["period"], row["order_count"], row["revenue"]])
    writer.writerow([])
    writer.writerow(["=== TOP SAN PHAM ==="])
    writer.writerow(["product_name", "quantity", "revenue"])
    for row in top:
        writer.writerow([row["product_name"], row["total_quantity"], row["total_revenue"]])
    return PlainTextResponse(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="manager_report.csv"'},
    )

@router.post("/promotions")
def create_promotion(promo: PromotionCreate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền tạo khuyến mãi.")

    start_date_obj = promo.start_date
    end_date_obj = promo.end_date

    # CHỈ THỊ 1.1: Kiểm tra ngày
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
