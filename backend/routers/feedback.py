from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

from database import get_db
from .auth import get_current_user

router = APIRouter(
    prefix="/api/feedback",
    tags=["Feedback"]
)

# Pydantic Models
class FeedbackCreate(BaseModel):
    product_id: int
    customer_name: str = Field(..., min_length=1)
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class FeedbackProcess(BaseModel):
    action: str # 'process' or 'hide'
    reason: str

class FeedbackInDB(BaseModel):
    id: int
    product_id: int
    customer_name: str
    rating: int
    comment: Optional[str]
    status: str
    created_at: datetime
    product_name: Optional[str] = None

# Endpoints

@router.post("", status_code=status.HTTP_201_CREATED, summary="Khách hàng gửi đánh giá mới")
def create_feedback(feedback: FeedbackCreate, conn: sqlite3.Connection = Depends(get_db)):
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO feedback (product_id, customer_name, rating, comment) VALUES (?, ?, ?, ?)",
            (feedback.product_id, feedback.customer_name, feedback.rating, feedback.comment)
        )
        conn.commit()
        return {"message": "Gửi đánh giá thành công!", "feedback_id": cursor.lastrowid}
    except sqlite3.Error as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lỗi cơ sở dữ liệu: {e}")

@router.get("", response_model=List[FeedbackInDB], summary="Admin xem danh sách đánh giá")
def get_all_feedback(
    rating: Optional[int] = None,
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['admin', 'it']:
         raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập chức năng này.")

    cursor = conn.cursor()
    query = """
        SELECT f.*, p.name as product_name 
        FROM feedback f
        LEFT JOIN products p ON f.product_id = p.id
    """
    params = []
    conditions = []

    if rating:
        conditions.append("f.rating = ?")
        params.append(rating)
    if status:
        conditions.append("f.status = ?")
        params.append(status)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    
    query += " ORDER BY f.created_at DESC"

    cursor.execute(query, params)
    feedbacks = [dict(row) for row in cursor.fetchall()]
    return feedbacks

@router.put("/{feedback_id}/process", status_code=status.HTTP_200_OK, summary="Admin xử lý hoặc ẩn đánh giá")
def process_feedback(
    feedback_id: int, payload: FeedbackProcess, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)
):
    if current_user['role'] not in ['admin', 'it']:
         raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện hành động này.")

    if payload.action not in ['process', 'hide']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Hành động không hợp lệ. Chỉ chấp nhận 'process' hoặc 'hide'.")
    
    new_status = 'processed' if payload.action == 'process' else 'hidden'
    cursor = conn.cursor()
    cursor.execute("UPDATE feedback SET status = ? WHERE id = ?", (new_status, feedback_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản hồi này.")
    conn.commit()
    return {"message": f"Phản hồi #{feedback_id} đã được cập nhật trạng thái thành '{new_status}'."}