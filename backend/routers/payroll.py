from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
import sqlite3
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
import csv
import io

from database import get_db
from .auth import get_current_user, get_accounting_user

router = APIRouter(
    prefix="/api",
    tags=["Payroll & Salaries"],
)

class SalarySetup(BaseModel):
    user_id: int
    base_salary: int
    coefficient: float = 1.0
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class TimesheetEntry(BaseModel):
    user_id: int
    work_date: str
    hours_worked: float
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class BonusPenaltyRequest(BaseModel):
    user_id: int
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2000, le=2100)
    amount: int
    reason: str = Field(..., min_length=1, max_length=500)
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ================= ENDPOINTS: SALARIES / PAYROLL =================

@router.get("/salaries/payroll/{year}/{month}")
def get_payroll_data(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id as user_id, u.name, u.role, 
               COALESCE(s.base_salary, 0) as base_salary, COALESCE(s.coefficient, 1.0) as coefficient,
               COALESCE(p.work_days, 0) as work_days, COALESCE(p.commission, 0) as commission,
               COALESCE(p.bonus, 0) as bonus, COALESCE(p.penalty, 0) as penalty,
               COALESCE(p.total_salary, 0) as total_salary, COALESCE(p.status, 'draft') as status
        FROM users u
        LEFT JOIN salaries s ON u.id = s.user_id
        LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ?
        WHERE u.role IN ('sale', 'kho', 'ketoan')
        ORDER BY u.name
    """, (year, month))
    return [dict(row) for row in cursor.fetchall()]

@router.post("/salaries/setup")
def setup_salary(data: SalarySetup, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO salaries (user_id, base_salary, coefficient) VALUES (?, ?, ?)", 
                   (data.user_id, data.base_salary, data.coefficient))
    conn.commit()
    return {"message": "Thiết lập lương thành công!"}

@router.post("/salaries/timesheet")
def update_timesheet(data: TimesheetEntry, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO timesheets (user_id, work_date, hours_worked) VALUES (?, ?, ?)",
                   (data.user_id, data.work_date, data.hours_worked))
    
    # DEMO LOGIC: Tổng hợp giờ làm theo tháng và cập nhật ngày công (8 giờ/ngày)
    year, month = map(int, data.work_date.split('-')[:2])
    cursor.execute("SELECT COALESCE(SUM(hours_worked), 0) FROM timesheets WHERE user_id = ? AND work_date LIKE ?", 
                   (data.user_id, f"{year}-{month:02d}-%"))
    total_hours = cursor.fetchone()[0]
    work_days = round(total_hours / 8.0, 1)
    
    cursor.execute("""
        INSERT INTO payrolls (user_id, month, year, work_days, status) 
        VALUES (?, ?, ?, ?, 'draft')
        ON CONFLICT(user_id, month, year) DO UPDATE SET work_days = excluded.work_days
    """, (data.user_id, month, year, work_days))
    conn.commit()
    return {"message": "Chấm công thành công!", "work_days": work_days}

@router.post("/salaries/bonus-penalty")
def add_bonus_penalty(req: BonusPenaltyRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    adj_type = "bonus" if req.amount > 0 else "penalty"
    abs_amount = abs(req.amount)
    
    cursor.execute("INSERT INTO payroll_adjustments (user_id, month, year, amount, adjustment_type, reason, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
                   (req.user_id, req.month, req.year, abs_amount, adj_type, req.reason, current_user['id']))
    
    if req.amount > 0:
        cursor.execute(
            "INSERT INTO payrolls (user_id, month, year, bonus) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id, month, year) DO UPDATE SET bonus = bonus + excluded.bonus",
            (req.user_id, req.month, req.year, abs_amount)
        )
    else:
        cursor.execute(
            "INSERT INTO payrolls (user_id, month, year, penalty) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(user_id, month, year) DO UPDATE SET penalty = penalty + excluded.penalty",
            (req.user_id, req.month, req.year, abs_amount)
        )
        
    conn.commit()
    return {"message": "Cập nhật thưởng/phạt thành công!"}

@router.post("/salaries/finalize/{year}/{month}")
def finalize_payroll(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    
    # Check if already locked
    cursor.execute("SELECT status FROM payroll_periods WHERE year = ? AND month = ?", (year, month))
    period = cursor.fetchone()
    if period and period['status'] == 'locked':
        raise HTTPException(status_code=400, detail="Kỳ lương này đã bị chốt!")
        
    cursor.execute("""
        SELECT u.id as user_id, COALESCE(s.base_salary, 0) as base_salary, COALESCE(s.coefficient, 1.0) as coefficient, 
               COALESCE(p.work_days, 0) as work_days, COALESCE(p.bonus, 0) as bonus, COALESCE(p.penalty, 0) as penalty, 
               COALESCE(p.commission, 0) as commission 
        FROM users u 
        LEFT JOIN salaries s ON u.id = s.user_id 
        LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ? 
        WHERE u.role IN ('sale', 'kho', 'ketoan')
    """, (year, month))
    employees = cursor.fetchall()
    
    for emp in employees:
        # DEMO LOGIC: Tính lương cơ bản dựa trên chuẩn 26 ngày công/tháng, làm tròn số tiền.
        gross = (emp['base_salary'] * emp['coefficient'] / 26.0) * emp['work_days']
        total = int(round(gross + emp['commission'] + emp['bonus'] - emp['penalty']))
        total = max(0, total) # Không để lương âm
        
        cursor.execute(
            "INSERT INTO payrolls (user_id, month, year, total_salary, status, base_salary, work_days, commission, bonus, penalty) "
            "VALUES (?, ?, ?, ?, 'locked', ?, ?, ?, ?, ?) "
            "ON CONFLICT(user_id, month, year) DO UPDATE SET total_salary = excluded.total_salary, status = 'locked', base_salary = excluded.base_salary",
            (emp['user_id'], month, year, total, emp['base_salary'], emp['work_days'], emp['commission'], emp['bonus'], emp['penalty'])
        )
        
    cursor.execute(
        "INSERT OR REPLACE INTO payroll_periods (year, month, status, locked_at, locked_by) VALUES (?, ?, 'locked', CURRENT_TIMESTAMP, ?)", 
        (year, month, current_user['id'])
    )
    conn.commit()
    return {"message": "Chốt bảng lương thành công!"}

@router.get("/salaries/export")
def export_payroll_report(year: int, month: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_accounting_user)):
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.name, u.role, COALESCE(p.work_days, 0) as work_days, COALESCE(s.base_salary, 0) as base_salary, COALESCE(s.coefficient, 1.0) as coefficient, 
               COALESCE(p.commission, 0) as commission, COALESCE(p.bonus, 0) as bonus, COALESCE(p.penalty, 0) as penalty, COALESCE(p.total_salary, 0) as total_salary, COALESCE(p.status, 'draft') as status 
        FROM users u 
        LEFT JOIN payrolls p ON u.id = p.user_id AND p.year = ? AND p.month = ? 
        LEFT JOIN salaries s ON u.id = s.user_id 
        WHERE u.role IN ('sale', 'kho', 'ketoan')
    """, (year, month))
    rows = cursor.fetchall()
    
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Tên nhân viên", "Vai trò", "Ngày công", "Lương CB", "Hệ số", "Hoa hồng", "Thưởng", "Phạt", "Tổng lương", "Trạng thái"])
    for row in rows:
        writer.writerow([row['name'], row['role'], row['work_days'], row['base_salary'], row['coefficient'], row['commission'], row['bonus'], row['penalty'], row['total_salary'], row['status']])
        
    return PlainTextResponse(content=buffer.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="payroll_{year}_{month}.csv"'})
