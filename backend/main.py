from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db as initialize_database
from fastapi.responses import FileResponse
import os

# Import các router con 
from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.orders import router as orders_router
from routers.warehouse import router as warehouse_router
from routers.accounting import router as accounting_router
from routers.payroll import router as payroll_router
from routers.system import router as system_router
from routers.feedback import router as feedback_router
from routers.reports import router as reports_router
from routers.chat import router as chat_router

app = FastAPI(
    title="ShoeStore API",
    description="Hệ thống API cho ứng dụng Quản lý & Kinh doanh Giày.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo cơ sở dữ liệu khi ứng dụng khởi động
initialize_database()

# Gắn kết các router vào ứng dụng chính
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(orders_router)
app.include_router(warehouse_router)
app.include_router(accounting_router)
app.include_router(payroll_router)
app.include_router(system_router)
app.include_router(feedback_router)
app.include_router(reports_router)
app.include_router(chat_router, prefix="/api")

# Cấu hình phục vụ file tĩnh và SPA (Single Page Application)
# Endpoint này sẽ bắt tất cả các request không khớp với các API đã định nghĩa ở trên.
@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    # Đường dẫn đến thư mục build của frontend
    dist_dir = os.path.join(os.path.dirname(__file__), "..", "dist")
    # Xây dựng đường dẫn đầy đủ đến file được yêu cầu
    file_path = os.path.join(dist_dir, catchall)

    # Nếu request trỏ đến một file thực sự tồn tại (vd: /assets/index.js), thì phục vụ file đó.
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    # Nếu không, trả về file index.html để React Router xử lý.
    return FileResponse(os.path.join(dist_dir, "index.html"))