"""
Payroll calculation and persistence helpers.
Single source of truth for salary formulas used by preview and finalize.
"""
from __future__ import annotations

import calendar
import sqlite3
from datetime import datetime
from typing import Any, Optional

# Standard working days per month (Vietnamese payroll convention in test design)
STANDARD_MONTH_WORK_DAYS = 26
HOURS_PER_WORK_DAY = 8
SALES_COMMISSION_RATE = 0.05
PAYROLL_STATUS_DRAFT = "draft"
PAYROLL_STATUS_LOCKED = "locked"
EMPLOYEE_ROLES = ("sale", "kho", "ketoan")


def month_date_range(year: int, month: int) -> tuple[str, str]:
    last_day = calendar.monthrange(year, month)[1]
    start = f"{year}-{month:02d}-01"
    end = f"{year}-{month:02d}-{last_day} 23:59:59"
    return start, end


def compute_work_days_from_timesheets(
    cursor: sqlite3.Cursor, user_id: int, year: int, month: int, fallback: float = 0.0
) -> float:
    cursor.execute(
        """
        SELECT COALESCE(SUM(hours_worked), 0) FROM timesheets
        WHERE user_id = ? AND strftime('%Y', work_date) = ? AND strftime('%m', work_date) = ?
        """,
        (user_id, str(year), f"{month:02d}"),
    )
    total_hours = cursor.fetchone()[0] or 0
    if total_hours > 0:
        return round(total_hours / HOURS_PER_WORK_DAY, 2)
    return float(fallback or 0)


def compute_sale_commission(
    cursor: sqlite3.Cursor, user_id: int, user_role: str, year: int, month: int
) -> int:
    if user_role != "sale":
        return 0
    start, end = month_date_range(year, month)
    # Prefer sales_person_id; fall back to legacy user_id on in-store orders only
    cursor.execute(
        """
        SELECT COALESCE(SUM(total_amount), 0) FROM orders
        WHERE status = 'completed'
          AND strftime('%Y', created_at) = ? AND strftime('%m', created_at) = ?
          AND (
            sales_person_id = ?
            OR (
              sales_person_id IS NULL
              AND user_id = ?
              AND COALESCE(order_type, '') != 'online'
            )
          )
        """,
        (str(year), f"{month:02d}", user_id, user_id),
    )
    total_sales = cursor.fetchone()[0] or 0
    return int(total_sales * SALES_COMMISSION_RATE)


def calculate_total_salary(
    base_salary: int,
    coefficient: float,
    work_days: float,
    commission: int = 0,
    bonus: int = 0,
    penalty: int = 0,
) -> int:
    if base_salary < 0 or coefficient <= 0:
        base_salary = max(base_salary, 0)
        coefficient = max(coefficient, 1.0) if coefficient <= 0 else coefficient
    daily_rate = (base_salary * coefficient) / STANDARD_MONTH_WORK_DAYS
    gross = int(daily_rate * work_days) + commission + bonus - penalty
    return max(gross, 0)


def build_payroll_row(
    cursor: sqlite3.Cursor,
    *,
    user_id: int,
    name: str,
    role: str,
    year: int,
    month: int,
    base_salary: Optional[int],
    coefficient: Optional[float],
    stored_work_days: Optional[float],
    stored_commission: Optional[int],
    bonus: int,
    penalty: int,
    status: Optional[str],
    stored_total: Optional[int],
    locked: bool,
) -> dict[str, Any]:
    base_salary = int(base_salary or 0)
    coefficient = float(coefficient if coefficient is not None else 1.0)
    bonus = int(bonus or 0)
    penalty = int(penalty or 0)

    if locked and stored_total is not None and status == PAYROLL_STATUS_LOCKED:
        return {
            "user_id": user_id,
            "name": name,
            "role": role,
            "year": year,
            "month": month,
            "base_salary": base_salary,
            "coefficient": coefficient,
            "work_days": float(stored_work_days or 0),
            "commission": int(stored_commission or 0),
            "bonus": bonus,
            "penalty": penalty,
            "total_salary": int(stored_total),
            "status": PAYROLL_STATUS_LOCKED,
        }

    work_days = compute_work_days_from_timesheets(
        cursor, user_id, year, month, fallback=stored_work_days or 0
    )
    commission = (
        int(stored_commission)
        if stored_commission is not None and locked
        else compute_sale_commission(cursor, user_id, role, year, month)
    )
    total_salary = calculate_total_salary(
        base_salary, coefficient, work_days, commission, bonus, penalty
    )
    return {
        "user_id": user_id,
        "name": name,
        "role": role,
        "year": year,
        "month": month,
        "base_salary": base_salary,
        "coefficient": coefficient,
        "work_days": work_days,
        "commission": commission,
        "bonus": bonus,
        "penalty": penalty,
        "total_salary": total_salary,
        "status": status or PAYROLL_STATUS_DRAFT,
    }


def is_period_locked(cursor: sqlite3.Cursor, year: int, month: int) -> bool:
    cursor.execute(
        "SELECT status FROM payroll_periods WHERE year = ? AND month = ?",
        (year, month),
    )
    row = cursor.fetchone()
    if row and row["status"] == PAYROLL_STATUS_LOCKED:
        return True
    cursor.execute(
        """
        SELECT COUNT(*) FROM payrolls
        WHERE year = ? AND month = ? AND status = ?
        """,
        (year, month, PAYROLL_STATUS_LOCKED),
    )
    return (cursor.fetchone()[0] or 0) > 0


def assert_payroll_editable(cursor: sqlite3.Cursor, user_id: int, month: int, year: int) -> None:
    if is_period_locked(cursor, year, month):
        raise ValueError(f"Kỳ lương {month}/{year} đã chốt. Không thể chỉnh sửa.")
    cursor.execute(
        "SELECT status FROM payrolls WHERE user_id = ? AND month = ? AND year = ?",
        (user_id, month, year),
    )
    row = cursor.fetchone()
    if row and row["status"] == PAYROLL_STATUS_LOCKED:
        raise ValueError(f"Bảng lương nhân viên đã chốt cho kỳ {month}/{year}.")


def ensure_user_exists(cursor: sqlite3.Cursor, user_id: int) -> dict:
    cursor.execute(
        "SELECT id, name, role FROM users WHERE id = ? AND role NOT IN ('customer', 'it', 'admin')",
        (user_id,),
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError("Nhân viên không tồn tại hoặc không thuộc diện tính lương.")
    return dict(row)


def validate_timesheet_date(work_date: str) -> datetime:
    try:
        return datetime.strptime(work_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Ngày chấm công phải đúng định dạng YYYY-MM-DD.") from exc
