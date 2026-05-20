from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
import sqlite3
from typing import Optional, List
from pydantic import BaseModel, Field
import csv
import io

from database import get_db
from .auth import get_current_user, get_accounting_user
from services import payroll_service as ps

router = APIRouter(
    prefix="/api",
    tags=["Payroll & Salaries"],
)

class SalarySetup(BaseModel):
    user_id: int; base_salary: int; coefficient: float = 1.0

class TimesheetEntry(BaseModel):
    user_id: int; work_date: str; hours_worked: float

class BonusPenaltyRequest(BaseModel):
    user_id: int
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    amount: int
    reason: str = Field(..., min_length=1, max_length=500)


def _require_payroll_role(user: dict, allow_self_user_id: Optional[int] = None, target_user_id: Optional[int] = None) -> None:
    if user["role"] in ("admin", "ketoan"):
        return
    if allow_self_user_id is not None and target_user_id == allow_self_user_id and user["id"] == target_user_id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền thực hiện thao tác lương này.")


def _fetch_payroll_rows(cursor: sqlite3.Cursor, year: int, month: int) -> List[dict]:
    cursor.execute(
        """
        SELECT
            u.id AS user_id, u.name, u.role,
            s.base_salary, s.coefficient,
            p.work_days, p.commission, p.bonus, p.penalty,
            p.total_salary, p.status
        FROM users u
        LEFT JOIN salaries s ON u.id = s.user_id
        LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ?
        WHERE u.role IN ('sale', 'kho', 'ketoan')
        ORDER BY u.name
        """,
        (year, month),
    )
    rows = []
    for entry in cursor.fetchall():
        entry = dict(entry)
        locked_row = entry.get("status") == ps.PAYROLL_STATUS_LOCKED
        rows.append(
            ps.build_payroll_row(
                cursor,
                user_id=entry["user_id"],
                name=entry["name"],
                role=entry["role"],
                year=year,
                month=month,
                base_salary=entry.get("base_salary"),
                coefficient=entry.get("coefficient"),
                stored_work_days=entry.get("work_days"),
                stored_commission=entry.get("commission"),
                bonus=entry.get("bonus") or 0,
                penalty=entry.get("penalty") or 0,
                status=entry.get("status"),
                stored_total=entry.get("total_salary"),
                locked=locked_row,
            )
        )
    return rows

# ================= ENDPOINTS: SALARIES / PAYROLL =================

@router.post("/salaries/setup")
def setup_salary(
    salary_data: SalarySetup,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    if salary_data.base_salary <= 0 or salary_data.coefficient <= 0:
        raise HTTPException(status_code=400, detail="Mức lương cơ bản và hệ số phải lớn hơn 0.")
    cursor = conn.cursor()
    try:
        ps.ensure_user_exists(cursor, salary_data.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    cursor.execute(
        "INSERT OR REPLACE INTO salaries (user_id, base_salary, coefficient) VALUES (?, ?, ?)",
        (salary_data.user_id, salary_data.base_salary, salary_data.coefficient),
    )
    conn.commit()
    return {"message": "Thiết lập lương thành công!", "user_id": salary_data.user_id}


@router.get("/salaries/setup/{user_id}")
def get_salary_setup(
    user_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user, allow_self_user_id=current_user["id"], target_user_id=user_id)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT user_id, base_salary, coefficient FROM salaries WHERE user_id = ?",
        (user_id,),
    )
    row = cursor.fetchone()
    if row:
        return dict(row)
    return {"user_id": user_id, "base_salary": 0, "coefficient": 1.0}


@router.post("/salaries/timesheet")
def update_timesheet(
    timesheet_entry: TimesheetEntry,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    if timesheet_entry.hours_worked <= 0 or timesheet_entry.hours_worked > 24:
        raise HTTPException(status_code=400, detail="Số giờ làm việc phải từ 0 đến 24.")
    cursor = conn.cursor()
    try:
        work_dt = ps.validate_timesheet_date(timesheet_entry.work_date)
        ps.ensure_user_exists(cursor, timesheet_entry.user_id)
        ps.assert_payroll_editable(cursor, timesheet_entry.user_id, work_dt.month, work_dt.year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    cursor.execute(
        """
        INSERT INTO timesheets (user_id, work_date, hours_worked) VALUES (?, ?, ?)
        ON CONFLICT(user_id, work_date) DO UPDATE SET hours_worked = excluded.hours_worked
        """,
        (timesheet_entry.user_id, timesheet_entry.work_date, timesheet_entry.hours_worked),
    )
    conn.commit()
    return {
        "message": "Chấm công thành công!",
        "work_days": ps.compute_work_days_from_timesheets(
            cursor, timesheet_entry.user_id, work_dt.year, work_dt.month
        ),
    }


@router.get("/salaries/commission/{user_id}/{year}/{month}")
def get_commission(
    user_id: int,
    year: int,
    month: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user, allow_self_user_id=current_user["id"], target_user_id=user_id)
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhân viên.")
    commission = ps.compute_sale_commission(cursor, user_id, row["role"], year, month)
    return {"user_id": user_id, "year": year, "month": month, "commission": commission}


@router.post("/salaries/bonus-penalty")
def add_bonus_penalty(
    req: BonusPenaltyRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    if req.amount == 0:
        raise HTTPException(status_code=400, detail="Số tiền thưởng/phạt không thể bằng 0.")
    cursor = conn.cursor()
    try:
        ps.ensure_user_exists(cursor, req.user_id)
        ps.assert_payroll_editable(cursor, req.user_id, req.month, req.year)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    adjustment_type = "bonus" if req.amount > 0 else "penalty"
    amount_abs = abs(req.amount)
    try:
        cursor.execute("BEGIN IMMEDIATE")
        cursor.execute(
            """
            INSERT INTO payroll_adjustments
            (user_id, month, year, amount, adjustment_type, reason, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (req.user_id, req.month, req.year, amount_abs, adjustment_type, req.reason.strip(), current_user["id"]),
        )
        cursor.execute(
            "SELECT bonus, penalty FROM payrolls WHERE user_id = ? AND month = ? AND year = ?",
            (req.user_id, req.month, req.year),
        )
        existing = cursor.fetchone()
        if existing:
            if req.amount > 0:
                cursor.execute(
                    "UPDATE payrolls SET bonus = bonus + ?, status = COALESCE(status, 'draft') WHERE user_id = ? AND month = ? AND year = ?",
                    (req.amount, req.user_id, req.month, req.year),
                )
            else:
                cursor.execute(
                    "UPDATE payrolls SET penalty = penalty + ?, status = COALESCE(status, 'draft') WHERE user_id = ? AND month = ? AND year = ?",
                    (amount_abs, req.user_id, req.month, req.year),
                )
        else:
            cursor.execute(
                """
                INSERT INTO payrolls (user_id, month, year, bonus, penalty, status)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    req.user_id,
                    req.month,
                    req.year,
                    req.amount if req.amount > 0 else 0,
                    amount_abs if req.amount < 0 else 0,
                    ps.PAYROLL_STATUS_DRAFT,
                ),
            )
        conn.commit()
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi lưu thưởng/phạt: {exc}") from exc
    return {"message": "Thêm thưởng/phạt thành công!", "adjustment_type": adjustment_type}


@router.post("/salaries/finalize/{year}/{month}")
def finalize_payroll(
    year: int,
    month: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Tháng không hợp lệ.")
    cursor = conn.cursor()
    if ps.is_period_locked(cursor, year, month):
        raise HTTPException(status_code=400, detail=f"Kỳ lương {month}/{year} đã được chốt.")

    cursor.execute("SELECT id, role, name FROM users WHERE role IN ('sale', 'kho', 'ketoan')")
    employees = cursor.fetchall()
    if not employees:
        raise HTTPException(status_code=404, detail="Không có nhân viên nào để chốt bảng lương.")

    try:
        cursor.execute("BEGIN IMMEDIATE")
        for employee in employees:
            user_id = employee["id"]
            user_role = employee["role"]
            cursor.execute(
                "SELECT base_salary, coefficient FROM salaries WHERE user_id = ?",
                (user_id,),
            )
            salary_setup = cursor.fetchone()
            base_salary = int(salary_setup["base_salary"]) if salary_setup else 0
            coefficient = float(salary_setup["coefficient"]) if salary_setup else 1.0

            cursor.execute(
                "SELECT bonus, penalty, work_days FROM payrolls WHERE user_id = ? AND month = ? AND year = ?",
                (user_id, month, year),
            )
            existing_bp = cursor.fetchone()
            bonus = int(existing_bp["bonus"]) if existing_bp and existing_bp["bonus"] else 0
            penalty = int(existing_bp["penalty"]) if existing_bp and existing_bp["penalty"] else 0
            fallback_days = float(existing_bp["work_days"]) if existing_bp and existing_bp["work_days"] else 0.0

            work_days = ps.compute_work_days_from_timesheets(
                cursor, user_id, year, month, fallback=fallback_days
            )
            commission = ps.compute_sale_commission(cursor, user_id, user_role, year, month)
            total_salary = ps.calculate_total_salary(
                base_salary, coefficient, work_days, commission, bonus, penalty
            )
            cursor.execute(
                """
                INSERT INTO payrolls
                (user_id, month, year, base_salary, work_days, commission, bonus, penalty, total_salary, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, month, year) DO UPDATE SET
                    base_salary = excluded.base_salary,
                    work_days = excluded.work_days,
                    commission = excluded.commission,
                    bonus = excluded.bonus,
                    penalty = excluded.penalty,
                    total_salary = excluded.total_salary,
                    status = excluded.status
                """,
                (
                    user_id,
                    month,
                    year,
                    base_salary,
                    work_days,
                    commission,
                    bonus,
                    penalty,
                    total_salary,
                    ps.PAYROLL_STATUS_LOCKED,
                ),
            )
        cursor.execute(
            """
            INSERT INTO payroll_periods (year, month, status, locked_at, locked_by)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(year, month) DO UPDATE SET
                status = excluded.status,
                locked_at = CURRENT_TIMESTAMP,
                locked_by = excluded.locked_by
            """,
            (year, month, ps.PAYROLL_STATUS_LOCKED, current_user["id"]),
        )
        conn.commit()
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi chốt bảng lương: {exc}") from exc

    return {
        "message": f"Đã chốt bảng lương thành công cho kỳ {month}/{year}.",
        "employee_count": len(employees),
        "status": ps.PAYROLL_STATUS_LOCKED,
    }


@router.get("/salaries/payroll/{year}/{month}")
def get_payroll_data(
    year: int,
    month: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    cursor = conn.cursor()
    return _fetch_payroll_rows(cursor, year, month)


@router.get("/salaries/payroll/{year}/{month}/summary")
def get_payroll_summary(
    year: int,
    month: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    rows = _fetch_payroll_rows(conn.cursor(), year, month)
    total_payout = sum(r["total_salary"] for r in rows)
    return {
        "year": year,
        "month": month,
        "employee_count": len(rows),
        "total_payout": total_payout,
        "total_bonus": sum(r["bonus"] for r in rows),
        "total_penalty": sum(r["penalty"] for r in rows),
        "total_commission": sum(r["commission"] for r in rows),
        "period_locked": ps.is_period_locked(conn.cursor(), year, month),
        "rows": rows,
    }


@router.get("/salaries/payroll/{year}/{month}/employee/{user_id}")
def get_employee_payroll(
    year: int,
    month: int,
    user_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user, allow_self_user_id=current_user["id"], target_user_id=user_id)
    rows = _fetch_payroll_rows(conn.cursor(), year, month)
    match = next((r for r in rows if r["user_id"] == user_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi lương cho nhân viên này.")
    return match


@router.get("/salaries/payroll/history/{user_id}")
def get_payroll_history(
    user_id: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user, allow_self_user_id=current_user["id"], target_user_id=user_id)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT year, month, base_salary, work_days, commission, bonus, penalty, total_salary, status
        FROM payrolls WHERE user_id = ? ORDER BY year DESC, month DESC
        """,
        (user_id,),
    )
    return [dict(row) for row in cursor.fetchall()]


@router.get("/salaries/adjustments/{year}/{month}")
def list_payroll_adjustments(
    year: int,
    month: int,
    user_id: Optional[int] = None,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    cursor = conn.cursor()
    query = """
        SELECT a.id, a.user_id, u.name, a.amount, a.adjustment_type, a.reason, a.created_at, a.created_by
        FROM payroll_adjustments a
        JOIN users u ON u.id = a.user_id
        WHERE a.year = ? AND a.month = ?
    """
    params: list = [year, month]
    if user_id is not None:
        query += " AND a.user_id = ?"
        params.append(user_id)
    query += " ORDER BY a.created_at DESC"
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]


@router.get("/salaries/export")
def export_payroll_report(
    year: int,
    month: int,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_accounting_user),
):
    rows = _fetch_payroll_rows(conn.cursor(), year, month)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "user_id",
            "name",
            "role",
            "work_days",
            "base_salary",
            "coefficient",
            "commission",
            "bonus",
            "penalty",
            "total_salary",
            "status",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row["user_id"],
                row["name"],
                row["role"],
                row["work_days"],
                row["base_salary"],
                row["coefficient"],
                row["commission"],
                row["bonus"],
                row["penalty"],
                row["total_salary"],
                row["status"],
            ]
        )
    filename = f"payroll_{year}_{month:02d}.csv"
    return PlainTextResponse(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
