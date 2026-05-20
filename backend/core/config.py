import os

SECRET_KEY = os.getenv(
    "SHOESTORE_SECRET_KEY",
    "d5e4f3b2a1c0d9e8f7g6h5j4k3l2m1n0",
)
DEBUG_MODE = os.getenv("SHOESTORE_DEBUG", "").lower() in ("1", "true", "yes")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
