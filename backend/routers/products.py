from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db
from .auth import get_current_user

router = APIRouter(
    prefix="/api",
    tags=["Products & Feedback"]
)

# ================= MODELS =================

class ProductCreate(BaseModel):
    name: str; price: int; category: str; image: str; stock: int; bin: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[int] = Field(default=None, gt=0)
    category: Optional[str] = None
    image: Optional[str] = None
    stock: Optional[int] = None
    bin: Optional[str] = None
    status: Optional[str] = None

class FeedbackCreate(BaseModel):
    product_id: int
    rating: int = Field(..., gt=0, le=5)
    comment: str

class FeedbackProcess(BaseModel):
    action: str
    reason: str

# ================= ENDPOINTS =================

@router.get("/products")
def get_products(
    conn: sqlite3.Connection = Depends(get_db),
    name: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    stock_lt: Optional[int] = None,
    stock_gt: Optional[int] = None
):
    cursor = conn.cursor()
    query = "SELECT * FROM products WHERE 1=1"
    params = []
    if name:
        query += " AND name LIKE ?"
        params.append(f"%{name}%")
    if category:
        query += " AND category = ?"
        params.append(category)
    if min_price:
        query += f" AND price >= {min_price}"
    if max_price:
        query += f" AND price <= {max_price}"
    if stock_lt is not None:
        query += " AND stock < ?"
        params.append(stock_lt)
    if stock_gt is not None:
        query += " AND stock > ?"
        params.append(stock_gt)
        
    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]

@router.post("/products")
def create_product(product: ProductCreate, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("INSERT INTO products (name, price, category, image, stock, bin) VALUES (?, ?, ?, ?, ?, ?)", 
                   (product.name, product.price, product.category, product.image, product.stock, product.bin))
    conn.commit()
    return {"message": "Thành công", "id": cursor.lastrowid}

@router.delete("/products/{product_id}")
def delete_product(product_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    return {"message": "Đã xóa thành công!"}

@router.get("/products/{product_id}")
def get_product_detail(product_id: int, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    product = cursor.fetchone()
    if not product:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại.")
    return dict(product)

@router.put("/products/{product_id}")
def update_product(product_id: int, product_update: ProductUpdate, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    set_clauses = []
    params = []
    update_dict = product_update.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        set_clauses.append(f"{key} = ?")
        params.append(value)

    if not set_clauses:
        raise HTTPException(status_code=400, detail="Không có thông tin để cập nhật.")

    query = f"UPDATE products SET {', '.join(set_clauses)} WHERE id = ?"
    params.append(product_id)
    
    cursor.execute(query, tuple(params))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    conn.commit()
    return {"message": "Cập nhật sản phẩm thành công!"}

@router.get("/feedback")
def get_all_feedback(product_id: Optional[int] = None, status: Optional[str] = None, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập phản hồi khách hàng.")
    
    cursor = conn.cursor()
    query = "SELECT * FROM feedback WHERE 1=1"
    params = []
    if product_id: query += " AND product_id = ?"; params.append(product_id)
    if status: query += " AND status = ?"; params.append(status)
    
    cursor.execute(query, params)
    return [dict(row) for row in cursor.fetchall()]

@router.post("/feedback")
def create_feedback(feedback: FeedbackCreate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO feedback (product_id, user_id, rating, comment, status, created_at) VALUES (?, ?, ?, ?, ?, ?)", (feedback.product_id, user_id, feedback.rating, feedback.comment, 'pending', datetime.now()))
    conn.commit()
    return {"message": "Cảm ơn bạn đã gửi đánh giá!"}

@router.put("/feedback/{feedback_id}/process")
def process_feedback(feedback_id: int, req: FeedbackProcess, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xử lý phản hồi.")
    
    cursor = conn.cursor()
    new_status = 'processed' if req.action == 'process' else 'hidden'
    cursor.execute("UPDATE feedback SET status = ?, comment = ? WHERE id = ?", (new_status, req.reason, feedback_id))
    conn.commit()
    return {"message": f"Phản hồi {feedback_id} đã được xử lý."}