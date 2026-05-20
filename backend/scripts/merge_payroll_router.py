"""Build payroll router from enhanced in-repo logic (payroll_service)."""
from pathlib import Path

HEADER = '''from fastapi import APIRouter, Depends, HTTPException, status
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

'''

# Endpoint bodies copied from last known good payroll implementation
BODY = Path(__file__).resolve().parent / "_payroll_endpoints.py"
if not BODY.exists():
    raise SystemExit(f"Missing {BODY}")

out = Path(__file__).resolve().parent.parent / "routers" / "payroll.py"
out.write_text(HEADER + BODY.read_text(encoding="utf-8"), encoding="utf-8")
print("written", out)
