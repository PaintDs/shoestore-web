import os
import sys
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

SECRET_KEY: str = os.getenv("SHOESTORE_SECRET_KEY", "")
if not SECRET_KEY:
    print(
        "\n[FATAL] Biến môi trường 'SHOESTORE_SECRET_KEY' chưa được thiết lập!\n"
        "  → Vui lòng thêm vào file backend/.env hoặc export trước khi khởi động server.\n"
        "  → Ví dụ:  SHOESTORE_SECRET_KEY=$(python -c \"import secrets; print(secrets.token_hex(32))\")\n",
        file=sys.stderr,
    )
    sys.exit(1)

DEBUG_MODE = os.getenv("SHOESTORE_DEBUG", "").lower() in ("1", "true", "yes")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
