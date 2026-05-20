from fastapi import APIRouter, Depends, HTTPException
import sqlite3
from typing import Optional
from pydantic import BaseModel

from database import get_db
from .auth import get_warehouse_user
from .orders import update_order_status, OrderStatusUpdate

router = APIRouter(
    prefix="/api/warehouse",
    tags=["Warehouse"]
)

# ================= MODELS =================

class WarehouseSlipCreate(BaseModel):
    product_id: int; quantity: int; reason: Optional[str] = None

class InventoryCountCreate(BaseModel):
    product_id: int; actual_qty: int; reason: str

# ================= ENDPOINTS =================

@router.post("/inbound")
def create_inbound_slip(slip: WarehouseSlipCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    if slip.quantity <= 0:
        raise HTTPException(status_code=400, detail="WH_IN_03: Số lượng nhập kho phải lớn hơn 0.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM products WHERE id = ?", (slip.product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="WH_IN_03: Sản phẩm không tồn tại trong hệ thống.")

    # WH_IN_02: Cộng dồn tồn kho vào bảng products
    cursor.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (slip.quantity, slip.product_id))
    # WH_IN_01: Ghi nhận lịch sử vào bảng warehouse_slips
    cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES (?, ?, ?)", ('in', slip.product_id, slip.quantity))
    conn.commit()
    return {"message": "WH_IN_01: Lập phiếu nhập kho và cập nhật tồn kho thành công!", "slip_id": cursor.lastrowid}

@router.get("/inbound/history")
def get_inbound_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    cursor = conn.cursor()
    query = """
        SELECT ws.id, ws.type, ws.quantity, ws.created_at, ws.product_id, p.name as product_name
        FROM warehouse_slips ws
        LEFT JOIN products p ON ws.product_id = p.id
        WHERE ws.type = 'in' ORDER BY ws.created_at DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@router.put("/outbound/order/{order_id}")
def confirm_order_outbound(order_id: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    # Gọi hàm update_order_status đã được tái cấu trúc với quyền của nhân viên kho
    return update_order_status(order_id, OrderStatusUpdate(status='shipping'), conn, user)

@router.get("/returns/history")
def get_returns_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    cursor = conn.cursor()
    query = """
        SELECT ws.id, ws.product_id, p.name as product_name, ws.quantity, ws.created_at
        FROM warehouse_slips ws
        LEFT JOIN products p ON ws.product_id = p.id
        WHERE ws.type = 'return' ORDER BY ws.created_at DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@router.post("/inventory-count")
def perform_inventory_count(count: InventoryCountCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    cursor = conn.cursor()
    # WH_COUNT_02: Lấy số lượng tồn kho hiện tại từ hệ thống
    cursor.execute("SELECT stock FROM products WHERE id = ?", (count.product_id,))
    product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")
    
    system_qty = product['stock']
    # WH_COUNT_03: Tính toán chênh lệch
    difference = count.actual_qty - system_qty

    # WH_COUNT_01: Ghi nhận phiên kiểm kê vào bảng inventory_counts
    cursor.execute(
        "INSERT INTO inventory_counts (product_id, system_qty, actual_qty, difference, reason, status) VALUES (?, ?, ?, ?, ?, 'approved')",
        (count.product_id, system_qty, count.actual_qty, difference, count.reason)
    )
    # WH_COUNT_04: Cập nhật lại tồn kho trong bảng products theo số lượng thực tế
    cursor.execute("UPDATE products SET stock = ? WHERE id = ?", (count.actual_qty, count.product_id))
    conn.commit()
    return {"message": "WH_COUNT_04: Đã điều chỉnh tồn kho theo số lượng thực tế.", "count_id": cursor.lastrowid}

@router.get("/inventory-count")
def get_inventory_count_history(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    cursor = conn.cursor()
    query = """
        SELECT ic.id, ic.product_id, p.name as product_name, ic.system_qty, ic.actual_qty, ic.difference, ic.reason, ic.status
        FROM inventory_counts ic
        LEFT JOIN products p ON ic.product_id = p.id
        ORDER BY ic.id DESC
    """
    cursor.execute(query)
    return [dict(row) for row in cursor.fetchall()]

@router.post("/returns")
def process_return(req: WarehouseSlipCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_warehouse_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM products WHERE id = ?", (req.product_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")

    if req.reason == 'good':
        cursor.execute("UPDATE products SET stock = stock + ? WHERE id = ?", (req.quantity, req.product_id))
        cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES ('return', ?, ?)", (req.product_id, req.quantity))
        conn.commit()
        return {"message": "WH_RETURN_03: Hàng tốt, đã nhập lại tồn kho."}
    elif req.reason == 'bad':
        cursor.execute("INSERT INTO warehouse_slips (type, product_id, quantity) VALUES ('return', ?, ?)", (req.product_id, req.quantity))
        conn.commit()
        return {"message": "WH_RETURN_04: Hàng lỗi, đã chuyển sang khu vực hàng hỏng."}
    
    raise HTTPException(status_code=400, detail="Tình trạng hàng không hợp lệ.")