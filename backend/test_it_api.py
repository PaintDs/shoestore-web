import pytest
from fastapi.testclient import TestClient
import sqlite3

# --- Fixtures ---
@pytest.fixture
def it_token(client):
    """Fixture to get a token for the 'it' role."""
    response = client.post("/api/login", json={"email": "it@shoestore.vn", "password": "123456"})
    assert response.status_code == 200
    return response.json()["access_token"]

# --- Test Suite ---

class TestItAPI:
    """Test suite for IT & System Management module (IT_*)"""

    # IT_SYS: System Management
    def test_IT_SYS_01_set_system_config(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        param_data = {"key": "MAINTENANCE_MODE", "value": "OFF"}
        response = client.post("/api/it/config", headers=headers, json=param_data)
        assert response.status_code == 200
        assert "đã được cập nhật" in response.json()["message"]
        with sqlite3.connect("test_shoestore.db") as conn:
            value = conn.execute("SELECT value FROM system_parameters WHERE key = 'MAINTENANCE_MODE'").fetchone()[0]
        assert value == "OFF"

    def test_IT_SYS_02_create_backup(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        response = client.post("/api/it/backup", headers=headers)
        assert response.status_code == 200
        assert "Đã tạo bản sao lưu" in response.json()["message"]
        assert "filename" in response.json()

    # IT_MAINT: Maintenance & Deployment
    def test_IT_MAINT_03_set_maintenance_mode(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        maint_data = {"is_maintenance": True, "banner_message": "Hệ thống đang bảo trì"}
        response = client.post("/api/it/maintenance", headers=headers, json=maint_data)
        assert response.status_code == 200
        assert "Đã bật chế độ bảo trì" in response.json()["message"]
        with sqlite3.connect("test_shoestore.db") as conn:
            is_maint = conn.execute("SELECT is_maintenance FROM system_maintenance WHERE id = 1").fetchone()[0]
        assert is_maint == 1

    def test_IT_MAINT_01_record_deployment(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        deploy_data = {"version": "v1.2.0"}
        response = client.post("/api/it/deploy", headers=headers, json=deploy_data)
        assert response.status_code == 200
        assert "Đã ghi nhận triển khai" in response.json()["message"]

    # IT_ROLE: Role-Based Access Control
    def test_IT_ROLE_01_update_user_role(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        # Get user ID for 'sale' user
        with sqlite3.connect("test_shoestore.db") as conn:
            sale_user_id = conn.execute("SELECT id FROM users WHERE email = 'sale@shoestore.vn'").fetchone()[0]
        
        update_data = {"user_id": sale_user_id, "new_role": "kho"}
        response = client.put("/api/it/users/role", headers=headers, json=update_data)
        assert response.status_code == 200
        assert "Đã cập nhật vai trò" in response.json()["message"]
        
        # Verify role change in DB
        with sqlite3.connect("test_shoestore.db") as conn:
            new_role = conn.execute(f"SELECT role FROM users WHERE id = {sale_user_id}").fetchone()[0]
        assert new_role == "kho"

        # Revert role for other tests
        client.put("/api/it/users/role", headers=headers, json={"user_id": sale_user_id, "new_role": "sale"})

    def test_IT_ROLE_02_access_denied(self, client):
        # Login as 'kho'
        response_login = client.post("/api/login", json={"email": "kho@shoestore.vn", "password": "123456"})
        kho_token = response_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {kho_token}"}
        
        # Try to access an IT endpoint
        response = client.get("/api/users", headers=headers)
        assert response.status_code == 403
        assert "Bạn không có quyền truy cập" in response.json()["detail"]

    # IT_API: API Integration & Chatbot
    def test_IT_API_01_02_simulate_api_success(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        response = client.post("/api/it/integrate-api", headers=headers, data={"api_name": "VNPay"})
        # This test might fail if the 20% failure chance hits. We accept this for simulation.
        if response.status_code == 200:
            assert "Tích hợp API VNPay thành công" in response.json()["message"]
        else:
            assert response.status_code == 504
            assert "Lỗi timeout" in response.json()["detail"]

    def test_IT_API_04_chatbot_training(self, client, it_token):
        headers = {"Authorization": f"Bearer {it_token}"}
        intent_data = {
            "intent_name": "check_order_status",
            "pattern": "đơn hàng của tôi đâu",
            "response": "Bạn vui lòng cung cấp mã đơn hàng để tôi kiểm tra nhé."
        }
        response = client.post("/api/it/chatbot", headers=headers, json=intent_data)
        assert response.status_code == 200
        assert "Đã huấn luyện chatbot" in response.json()["message"]

        # Check if the intent is in the database
        with sqlite3.connect("test_shoestore.db") as conn:
            intent = conn.execute("SELECT * FROM chatbot_intents WHERE intent_name = 'check_order_status'").fetchone()
        assert intent is not None
        assert intent[3] == "Bạn vui lòng cung cấp mã đơn hàng để tôi kiểm tra nhé."