import sqlite3
import random
import re
from typing import Optional, Dict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import get_db
from core.config import (
    SECRET_KEY,
    DEBUG_MODE,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

# ================= CONFIG & GLOBAL VARS =================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

otp_store: Dict[str, str] = {}

router = APIRouter(
    prefix="/api",
    tags=["Authentication"]
)

# ================= MODELS =================

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ForgotPasswordReq(BaseModel):
    email: str

class ResetPasswordReq(BaseModel):
    email: str
    otp: str
    new_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# ================= JWT UTILS & DEPENDENCIES =================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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
    cursor.execute("SELECT * FROM users WHERE email = ?", (token_data.email,))
    user = cursor.fetchone()
    
    if user is None:
        raise credentials_exception
    return dict(user)

async def get_accounting_user(current_user: dict = Depends(get_current_user)):
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

# ================= ENDPOINTS =================

@router.post("/register")
def register(user: UserRegister, conn: sqlite3.Connection = Depends(get_db)):
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="INT_REG_06: Mật khẩu phải có ít nhất 6 ký tự.")
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', user.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký!")
    
    hashed_password = pwd_context.hash(user.password)
    cursor.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", (user.name, user.email, hashed_password, "customer"))
    conn.commit()
    return {"message": "Đăng ký thành công!"}

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, conn: sqlite3.Connection = Depends(get_db)):
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', user_in.email):
        raise HTTPException(status_code=422, detail="Invalid email format")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (user_in.email,))
    db_user = cursor.fetchone()
    
    if not db_user:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác!")
    if db_user["status"] == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khóa do nhập sai quá nhiều lần! Vui lòng liên hệ Admin.")

    # Check password và đếm failed_attempts
    if not pwd_context.verify(user_in.password, db_user["password"]):
        new_attempts = db_user["failed_attempts"] + 1
        if new_attempts >= 3:
            cursor.execute("UPDATE users SET status = 'locked', failed_attempts = ? WHERE email = ?", (new_attempts, user_in.email))
            conn.commit()
            raise HTTPException(status_code=403, detail="Bạn đã nhập sai mật khẩu 3 lần. Tài khoản đã tự động khóa bảo mật!")
        
        cursor.execute("UPDATE users SET failed_attempts = ? WHERE email = ?", (new_attempts, user_in.email))
        conn.commit()
        raise HTTPException(status_code=401, detail=f"Sai mật khẩu! Bạn còn {3 - new_attempts} lần thử trước khi bị khóa.")

    cursor.execute("UPDATE users SET failed_attempts = 0 WHERE email = ?", (user_in.email,))
    conn.commit()
    
    access_token = create_access_token(data={"sub": db_user["email"], "role": db_user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me")
def read_users_me(current_user: dict = Depends(get_current_user)):
    user_info = {k: v for k, v in current_user.items() if k != 'password'}
    return user_info

@router.get("/users/employees")
def list_employees(
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Danh sách nhân viên tính lương (sale, kho, ketoan) cho màn hình Quản lý lương."""
    if current_user["role"] not in ("admin", "ketoan"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem danh sách nhân viên.",
        )
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, role, status FROM users WHERE role IN ('sale', 'kho', 'ketoan') ORDER BY name"
    )
    return [dict(row) for row in cursor.fetchall()]


@router.get("/users")
def get_all_users(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_it_user)):
    """Endpoint để lấy danh sách người dùng cho màn hình RBAC của IT."""
    cursor = conn.cursor()
    # Chỉ lấy các user có role là nhân viên, không lấy customer
    # IT_ROLE_02: Đảm bảo chỉ admin/it mới có quyền xem danh sách này
    cursor.execute("SELECT id, name, email, role, status FROM users WHERE role != 'customer'")

    return [dict(row) for row in cursor.fetchall()]

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordReq, conn: sqlite3.Connection = Depends(get_db)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Email chưa từng đăng ký trên hệ thống!")
    
    otp = str(random.randint(100000, 999999))
    otp_store[req.email] = otp
    print(f"\n🔑 [MÃ OTP CỦA BẠN]: {otp} (Dành cho email: {req.email})\n")
    payload = {"message": "Mã OTP đã được khởi tạo!"}
    if DEBUG_MODE:
        payload["otp_dev"] = otp
    return payload

@router.post("/reset-password")
def reset_password(req: ResetPasswordReq, conn: sqlite3.Connection = Depends(get_db)):
    if req.email not in otp_store or otp_store[req.email] != req.otp:
        raise HTTPException(status_code=400, detail="Mã OTP không chính xác!")
    
    cursor = conn.cursor()
    hashed_password = pwd_context.hash(req.new_password)
    cursor.execute("UPDATE users SET password = ? WHERE email = ?", (hashed_password, req.email))
    conn.commit()
    del otp_store[req.email]
    return {"message": "Đổi mật khẩu mới thành công!"}