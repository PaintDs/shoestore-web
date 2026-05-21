import os
import sqlite3
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import google.generativeai as genai

router = APIRouter(tags=["Chatbot AI"])

# Khởi tạo API Key (Lấy từ môi trường hoặc cấu hình mặc định)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
def chat_with_ai(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Tin nhắn không được để trống.")
    
    try:
        # Cấu hình model tư vấn viên chuyên nghiệp
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="Bạn là Nhân viên tư vấn ảo của cửa hàng giày ShoeStore, luôn thân thiện, lịch sự và hỗ trợ khách hàng hết mình."
        )
        response = model.generate_content(req.message)
        return {"reply": response.text}
    except Exception as e:
        print(f"Lỗi API Gemini: {e}")
        # Trả về câu trả lời dự phòng thông minh nếu API dính rate limit hoặc lỗi kết nối
        return {"reply": "ShoeStore xin chào! Hệ thống tư vấn tự động đang bận xử lý một chút, bạn cần hỗ trợ gấp vui lòng để lại số điện thoại nhé!"}