import sqlite3
from typing import Optional
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

# Import get_db from the newly created database.py
from database import get_db

# ================= CONFIG BẢO MẬT =================
# Cấu hình mã hóa mật khẩu bằng bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Cấu hình JWT
SECRET_KEY = "d5e4f3b2a1c0d9e8f7g6h5j4k3l2m1n0" # Tạm thời, nên chuyển vào file .env. Lệnh để tạo: openssl rand -hex 32
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2PasswordBearer sẽ trích xuất token từ Header Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# Pydantic model cho dữ liệu trong token
class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# ================= JWT UTILS =================
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ================= DEPENDENCIES PHÂN QUYỀN =================

async def get_current_user(token: str = Depends(oauth2_scheme), conn: sqlite3.Connection = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email, role=payload.get("role"))
    except JWTError:
        raise credentials_exception
    
    cursor = conn.cursor()
    # Tự động tạo bảng users nếu Database bị ghi đè (test env) mà quên init
    cursor.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL, status TEXT DEFAULT 'active', failed_attempts INTEGER DEFAULT 0)")
    cursor.execute("SELECT * FROM users WHERE email = ?", (token_data.email,))
    user = cursor.fetchone()
    
    if user is None:
        raise credentials_exception
    return dict(user)

# Dependency chuyên dụng để kiểm tra quyền Kế toán/Admin
async def get_accounting_user(current_user: dict = Depends(get_current_user)):
    # ACC_FIN_05: Phân quyền báo cáo thành công
    if current_user["role"] not in ["admin", "ketoan"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng kế toán.")
    return current_user

async def get_sale_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "sale"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng bán hàng.")
    return current_user

async def get_warehouse_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "kho"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng kho.")
    return current_user

async def get_it_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "it"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền truy cập chức năng IT.")
    return current_user