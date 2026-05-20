import subprocess
from pathlib import Path

src = subprocess.check_output(
    ["git", "show", "HEAD:backend/routers/accounting.py"],
    text=True,
    encoding="utf-8",
    errors="replace",
)
lines = src.splitlines()
start = next(i for i, line in enumerate(lines) if line.startswith("def _require_payroll_role"))
body = "\n".join(lines[start:])
header = """from fastapi import APIRouter, Depends, HTTPException, status
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

"""
out = Path(__file__).resolve().parent.parent / "routers" / "payroll.py"
out.write_text(header + body, encoding="utf-8")
print("written", out, "lines", len((header + body).splitlines()))
