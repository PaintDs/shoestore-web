import pytest
from fastapi.testclient import TestClient
import sqlite3

# Import app và các biến cần thiết từ main.py
from main import app, get_db

# --- FIXTURES HỖ TRỢ ---
@pytest.fixture
def customer_token(client):
    """Khởi tạo một tài khoản khách hàng và trả về Access Token."""
    client.post("/api/register", json={"name": "Cart User", "email": "cart@example.com", "password": "password123"})
    response = client.post("/api/login", json={"email": "cart@example.com", "password": "password123"})
    return response.json()["access_token"]

@pytest.fixture
def customer_order_id(client, customer_token):
    """Tạo sẵn một đơn hàng Pending cho user."""
    headers = {"Authorization": f"Bearer {customer_token}"}
    client.post("/api/cart/add", headers=headers, json={
        "product_id": 1, "quantity": 1, "price": 2500000, "stock": 10
    })
    response = client.post("/api/checkout", headers=headers, json={
        "customer_name": "Cart User", "phone": "0987654321", "address": "123 Test St",
        "payment_method": "COD", "cart_items": [{"product_id": 1, "quantity": 1, "price": 2500000}]
    })
    return response.json()["order_id"]

# ================= BỘ KIỂM THỬ KHÁCH HÀNG =================
class TestCustomerFlow:
    
    # ---------------- 1. TÌM KIẾM (INT_SEARCH) ----------------
    def test_INT_SEARCH_01_by_name(self, client):
        response = client.get("/api/products?name=Nike")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all("nike" in p["name"].lower() for p in data)

    def test_INT_SEARCH_02_by_category(self, client):
        response = client.get("/api/products?category=Running")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all(p["category"] == "Running" for p in data)

    def test_INT_SEARCH_03_by_price_range(self, client):
        response = client.get("/api/products?min_price=1000000&max_price=2000000")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all(1000000 <= p["price"] <= 2000000 for p in data)

    def test_INT_SEARCH_04_no_result(self, client):
        response = client.get("/api/products?name=xyz123abc")
        assert response.status_code == 200
        assert len(response.json()) == 0

    def test_INT_SEARCH_05_empty_search(self, client):
        response = client.get("/api/products")
        assert response.status_code == 200
        assert len(response.json()) >= 3

    # ---------------- 2. GIỎ HÀNG (INT_CART) ----------------
    def test_INT_CART_01_add_success(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        assert response.status_code == 200
        assert "Đã thêm sản phẩm" in response.json()["message"]

    def test_INT_CART_02_add_failed_out_of_stock(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post("/api/cart/add", headers=headers, json={"product_id": 3, "quantity": 1, "price": 800000, "stock": 0})
        assert response.status_code == 400
        assert "hết hàng" in response.json()["detail"].lower()

    def test_INT_CART_03_update_quantity(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        response = client.put("/api/cart/update", headers=headers, json={"product_id": 1, "quantity": 3, "stock": 10})
        assert response.status_code == 200
        assert next(i for i in response.json()["cart"] if i["product_id"] == 1)["quantity"] == 3

    def test_INT_CART_04_exceed_stock(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post("/api/cart/add", headers=headers, json={"product_id": 2, "quantity": 10, "price": 1500000, "stock": 5})
        assert response.status_code == 400
        assert "vượt quá tồn kho" in response.json()["detail"].lower()

    def test_INT_CART_05_invalid_quantity(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        response = client.put("/api/cart/update", headers=headers, json={"product_id": 1, "quantity": -5, "stock": 10})
        assert response.status_code == 400

    def test_INT_CART_06_delete_item(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        response = client.delete("/api/cart/remove/1", headers=headers)
        assert response.status_code == 200

    # ---------------- 3. THANH TOÁN (INT_PAY) ----------------
    def test_INT_PAY_01_05_cod_checkout(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        response = client.post("/api/checkout", headers=headers, json={
            "customer_name": "Bob", "phone": "098", "address": "HN", "payment_method": "COD", 
            "cart_items": [{"product_id": 1, "quantity": 1, "price": 2500000}]
        })
        assert response.status_code == 200
        assert "thành công" in response.json()["message"].lower()

    def test_INT_PAY_03_valid_voucher(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        client.post("/api/cart/add", headers=headers, json={"product_id": 1, "quantity": 1, "price": 2500000, "stock": 10})
        response = client.post("/api/checkout", headers=headers, json={
            "customer_name": "Bob", "phone": "098", "address": "HN", "payment_method": "COD", 
            "cart_items": [{"product_id": 1, "quantity": 1, "price": 2500000}], "voucher_code": "SALE20"
        })
        assert response.status_code == 200
        assert response.json()["final_amount"] == 2000000.0  # 2.5m * 0.8

    # ---------------- 4. CHAT (INT_CHAT) ----------------
    def test_INT_CHAT_02_send_message(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post("/api/chat/message", headers=headers, json={"text": "Hello"})
        assert response.status_code == 200

    def test_INT_CHAT_04_send_file_too_large(self, client, customer_token):
        headers = {"Authorization": f"Bearer {customer_token}"}
        large_file = b"a" * (2 * 1024 * 1024)  # 2MB
        response = client.post("/api/chat/file", headers=headers, files={"file": ("test.jpg", large_file, "image/jpeg")})
        assert response.status_code == 400

    # ---------------- 5. ĐƠN HÀNG USER (INT_ORDER) ----------------
    def test_INT_ORDER_01_02_view_orders(self, client, customer_token, customer_order_id):
        headers = {"Authorization": f"Bearer {customer_token}"}
        res_list = client.get("/api/user/orders", headers=headers)
        assert res_list.status_code == 200
        assert any(o["id"] == customer_order_id for o in res_list.json())

        res_detail = client.get(f"/api/user/orders/{customer_order_id}", headers=headers)
        assert res_detail.status_code == 200
        assert res_detail.json()["id"] == customer_order_id

    def test_INT_ORDER_03_cancel_pending(self, client, customer_token, customer_order_id):
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = client.post(f"/api/user/orders/{customer_order_id}/cancel", headers=headers)
        assert response.status_code == 200
        
        # Verify in DB
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            status = conn.execute(f"SELECT status FROM orders WHERE id = {customer_order_id}").fetchone()[0]
        assert status == "cancelled"