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
    # ... (logic giữ nguyên)
    pass

@router.post("/it/rollback")
def rollback_deployment(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    return {"message": "IT_MAINT_02: Đã gửi yêu cầu rollback về phiên bản ổn định trước đó."}

@router.put("/it/users/role")
def update_user_role(req: UserRoleUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # ... (logic giữ nguyên)
    pass

@router.post("/it/integrate-api")
def simulate_api_integration(api_name: str = Form(...), conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # ... (logic giữ nguyên)
    pass

@router.post("/it/chatbot")
def create_chatbot_intent(intent: ChatbotIntentCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # ... (logic giữ nguyên)
    pass

@router.get("/it/chatbot")
def get_chatbot_intents(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    # ... (logic giữ nguyên)
    pass

# ================= ENDPOINTS: CHAT =================

@router.post("/chat/message")
def send_chat_message(message: dict, current_user: dict = Depends(get_current_user)):
    if not message.get("text"): raise HTTPException(status_code=400, detail="Nội dung tin nhắn không được trống.")
    print(f"[{current_user['name']}] gửi tin nhắn: {message['text']}")
    return {"message": "Tin nhắn đã được gửi!", "status": "success"}

@router.post("/chat/file")
async def send_chat_file(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    max_file_size = 1 * 1024 * 1024 # 1MB
    file.file.seek(0, os.SEEK_END); file_size = file.file.tell(); file.file.seek(0)
    
    if file_size > max_file_size:
        raise HTTPException(status_code=400, detail=f"File quá lớn! Kích thước tối đa là {max_file_size / (1024*1024)}MB.")
    if file.content_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Định dạng file không được hỗ trợ.")
    return {"message": "File đã được gửi!", "filename": file.filename, "status": "success"}