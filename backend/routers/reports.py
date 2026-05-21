from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from typing import Optional

from database import get_db
from .auth import get_current_user, get_it_user

router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"]
)

@router.get("/performance")
def get_performance_report(
    report_type: Optional[str] = None, # Thêm tham số để khớp với API call từ frontend
    conn: sqlite3.Connection = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['admin', 'it', 'ketoan']:
        raise HTTPException(status_code=403, detail="Không có quyền")
    
    cursor = conn.cursor()
    
    # 1. Tổng doanh thu (Tính cả trạng thái pending/completed để demo dễ nhảy số)
    cursor.execute("SELECT SUM(total_amount) FROM orders")
    total_revenue = cursor.fetchone()[0] or 0
    
    # 2. Tổng đơn hàng
    cursor.execute("SELECT COUNT(id) FROM orders")
    total_orders = cursor.fetchone()[0] or 0
    
    # 3. Đếm số khách hàng duy nhất dựa trên đơn hàng
    cursor.execute("SELECT COUNT(DISTINCT customer_name) FROM orders")
    new_customers = cursor.fetchone()[0] or 0
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "new_customers": new_customers,
    }

@router.get("/top-products")
def get_top_products(
    limit: int = 5,
    sort_by: str = 'quantity',
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['admin', 'it', 'ketoan', 'sale']:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập báo cáo này.")

    cursor = conn.cursor()

    query = """
        SELECT 
            p.name as product_name, 
            SUM(oi.quantity) as quantity_sold,
            SUM(oi.quantity * p.price) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'completed'
        GROUP BY p.id, p.name
        ORDER BY quantity_sold DESC
        LIMIT ?
    """
    
    cursor.execute(query, (limit,))
    top_products = [dict(row) for row in cursor.fetchall()]
    return top_products

@router.get("/backups")
def get_system_backups(conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_it_user)):
    """Endpoint để IT xem lịch sử backup hệ thống."""
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM system_backups ORDER BY created_at DESC")
    backups = [dict(row) for row in cursor.fetchall()]
    return backups