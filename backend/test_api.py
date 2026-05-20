import pytest
from fastapi.testclient import TestClient
import sqlite3

# Import app và các dependency cần thiết từ file main
from main import app, get_db, pwd_context

# --- BỘ KIỂM THỬ TỰ ĐỘNG ---

class TestAuthFlow:
    def test_INT_REG_01_register_success(self, client):
        # Cleanup before test to ensure idempotency and avoid 400 Duplicate Email
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            conn.execute("DELETE FROM users WHERE email = 'new-user@example.com'")

        response = client.post("/api/register", json={
            "name": "New Test User", "email": "new-user@example.com", "password": "password123"
        })
        assert response.status_code == 200
        assert response.json() == {"message": "Đăng ký thành công!"}

        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            user_pass = conn.execute("SELECT password FROM users WHERE email = 'new-user@example.com'").fetchone()[0]
        assert user_pass != "password123" 
        assert pwd_context.verify("password123", user_pass) 

    def test_INT_REG_03_register_duplicate_email(self, client):
        response = client.post("/api/register", json={
            "name": "Admin User", "email": "admin@shoestore.vn", "password": "password456"
        })
        assert response.status_code == 400
        assert response.json()["detail"] == "Email này đã được đăng ký!"

    def test_INT_REG_02_register_empty_fields(self, client):
        response = client.post("/api/register", json={"name": "Test", "email": "test@test.com"}) 
        assert response.status_code == 422 

    def test_INT_REG_04_register_invalid_email(self, client):
        response = client.post("/api/register", json={"name": "Test", "email": "not-an-email", "password": "password"})
        assert response.status_code == 422

    @pytest.mark.parametrize("email, password", [
        ("admin@shoestore.vn", "123456"),
        ("kho@shoestore.vn", "123456"),
        ("ketoan@shoestore.vn", "123456"),
    ])
    def test_INT_LOGIN_01_02_login_success_roles(self, client, email, password):
        response = client.post("/api/login", json={"email": email, "password": password})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_INT_LOGIN_05_login_wrong_password(self, client):
        response = client.post("/api/login", json={"email": "admin@shoestore.vn", "password": "wrongpassword"})
        assert response.status_code == 401
        assert "Sai mật khẩu!" in response.json()["detail"]

    def test_INT_LOGIN_04_login_empty_fields(self, client):
        response = client.post("/api/login", json={"email": "admin@shoestore.vn"}) 
        assert response.status_code == 422

    def test_INT_LOGIN_07_login_invalid_email(self, client):
        response = client.post("/api/login", json={"email": "not-an-email", "password": "password"})
        assert response.status_code == 422

    def test_INT_FORGOT_01_forgot_password_success(self, client):
        # Use a non-admin user to avoid side-effects on other tests
        response = client.post("/api/forgot-password", json={"email": "kho@shoestore.vn"})
        assert response.status_code == 200
        data = response.json()
        assert "Mã OTP đã được khởi tạo!" in data["message"]
        assert "otp_dev" in data 

    def test_INT_FORGOT_05_06_reset_password_flow(self, client):
        # Use a dedicated user for this test to avoid side effects
        test_email = "reset@example.com"
        otp_res = client.post("/api/forgot-password", json={"email": test_email})
        otp = otp_res.json()["otp_dev"]

        wrong_reset_res = client.post("/api/reset-password", json={
            "email": test_email, "otp": "000000", "new_password": "newpassword123"
        })
        assert wrong_reset_res.status_code == 400
        assert "Mã OTP không chính xác!" in wrong_reset_res.json()["detail"]

        correct_reset_res = client.post("/api/reset-password", json={
            "email": test_email, "otp": otp, "new_password": "newpassword123"
        })
        assert correct_reset_res.status_code == 200
        assert "Đổi mật khẩu mới thành công!" in correct_reset_res.json()["message"]

        login_res = client.post("/api/login", json={"email": test_email, "password": "newpassword123"})
        assert login_res.status_code == 200

class TestProductFlow:
    def test_INT_SEARCH_01_get_products_list(self, client):
        response = client.get("/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert any(p['name'] == 'Nike Air Force 1' for p in data)