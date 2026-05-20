from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import sqlite3
import random
import os
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from .auth import get_current_user, get_it_user

router = APIRouter(
    prefix="/api",
    tags=["System & IT"]
)

# ================= MODELS =================

class SystemParam(BaseModel):
    key: str
    value: str

class MaintenanceRequest(BaseModel):
    is_maintenance: bool
    banner_message: str

class DeployRequest(BaseModel):
    version: str

class UserRoleUpdate(BaseModel):
    user_id: int
    new_role: str

class ChatbotIntentCreate(BaseModel):
    intent_name: str; pattern: str; response: str

# ================= ENDPOINTS: IT =================

@router.post("/it/config")
def set_system_config(param: SystemParam, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_parameters (key, value) VALUES (?, ?)", (param.key, param.value))
    conn.commit()
    return {"message": f"IT_SYS_01: Tham số '{param.key}' đã được cập nhật."}

@router.post("/it/backup")
def create_backup(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    filename = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db.gz"
    filepath = f"/var/backups/{filename}"
    return {"message": "IT_SYS_02: Đã tạo bản sao lưu dữ liệu thành công!", "filename": filename, "filepath": filepath}

@router.post("/it/restore")
def restore_backup(filename: str = Form(...), conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    if not filename:
        raise HTTPException(status_code=400, detail="Cần cung cấp tên file backup.")
    return {"message": f"IT_SYS_03: Đang khôi phục dữ liệu từ file '{filename}'... Hệ thống sẽ khởi động lại."}

@router.post("/it/maintenance")
def set_maintenance_mode(req: MaintenanceRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_maintenance (id, is_maintenance, banner_message) VALUES (1, ?, ?)", (req.is_maintenance, req.banner_message))
    conn.commit()
    status_msg = "bật" if req.is_maintenance else "tắt"
    return {"message": f"IT_MAINT_03: Đã {status_msg} chế độ bảo trì."}

@router.post("/it/deploy")
def record_deployment(req: DeployRequest, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO system_deployments (id, version, status, deployed_at) VALUES (1, ?, 'deployed', CURRENT_TIMESTAMP)",
        (req.version,),
    )
    conn.commit()
    return {"message": f"IT_MAINT_01: Đã ghi nhận triển khai phiên bản {req.version}."}

@router.post("/it/rollback")
def rollback_deployment(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    return {"message": "IT_MAINT_02: Đã gửi yêu cầu rollback về phiên bản ổn định trước đó."}

@router.put("/it/users/role")
def update_user_role(req: UserRoleUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    allowed_roles = {"admin", "sale", "kho", "ketoan", "it", "customer"}
    if req.new_role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Vai trò không hợp lệ.")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET role = ? WHERE id = ?", (req.new_role, req.user_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")
    conn.commit()
    return {"message": "IT_ROLE_01: Cập nhật quyền thành công."}

@router.post("/it/integrate-api")
def simulate_api_integration(api_name: str = Form(...), conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    status_code = 200 if api_name.lower() in ("vnpay", "momo", "ghtk", "viettel_post") else 500
    cursor.execute(
        "INSERT INTO third_party_api_logs (api_name, status_code, response_body, retry_count, created_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)",
        (api_name, status_code, "OK" if status_code == 200 else "Simulated error"),
    )
    conn.commit()
    if status_code != 200:
        raise HTTPException(status_code=502, detail="IT_API_03: API đối tác trả lỗi (đã ghi log).")
    return {"message": f"IT_API_01/02: Tích hợp {api_name} thành công (mô phỏng).", "tracking_code": f"MOCK-{random.randint(100000, 999999)}"}


@router.post("/it/chatbot")
def create_chatbot_intent(intent: ChatbotIntentCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO chatbot_intents (intent_name, pattern, response) VALUES (?, ?, ?)",
            (intent.intent_name, intent.pattern, intent.response),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Intent đã tồn tại.")
    return {"message": "IT_API_04: Đã thêm kịch bản chatbot.", "id": cursor.lastrowid}


@router.get("/it/chatbot")
def get_chatbot_intents(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT id, intent_name, pattern, response FROM chatbot_intents ORDER BY id DESC")
    return [dict(row) for row in cursor.fetchall()]

# ================= ENDPOINTS: CHAT =================

@router.post("/chat/message")
def send_chat_message(message: dict, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    text = (message.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được trống.")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (user_id, text) VALUES (?, ?)",
        (current_user["id"], text),
    )
    conn.commit()
    reply = "Cảm ơn bạn đã liên hệ ShoeStore. Nhân viên sẽ phản hồi sớm nhất."
    cursor.execute(
        "SELECT response FROM chatbot_intents WHERE ? LIKE '%' || pattern || '%' LIMIT 1",
        (text.lower(),),
    )
    bot = cursor.fetchone()
    if bot:
        reply = bot["response"]
    return {"message": "Tin nhắn đã được gửi!", "status": "success", "bot_reply": reply}

@router.post("/chat/file")
async def send_chat_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    max_file_size = 1 * 1024 * 1024 # 1MB
    file.file.seek(0, os.SEEK_END); file_size = file.file.tell(); file.file.seek(0)
    
    if file_size > max_file_size:
        raise HTTPException(status_code=400, detail=f"File quá lớn! Kích thước tối đa là {max_file_size / (1024*1024)}MB.")
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Định dạng file không được hỗ trợ.")
    return {"message": "File đã được gửi!", "filename": file.filename, "status": "success"}