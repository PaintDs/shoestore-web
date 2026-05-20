import pytest
from fastapi.testclient import TestClient
import sqlite3

# --- Fixtures ---
@pytest.fixture
def sale_token(client):
    """Fixture to get a token for the 'sale' role."""
    response = client.post("/api/login", json={"email": "sale@shoestore.vn", "password": "123456"})
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def kho_token(client):
    """Fixture to get a token for the 'kho' role."""
    response = client.post("/api/login", json={"email": "kho@shoestore.vn", "password": "123456"})
    assert response.status_code == 200
    return response.json()["access_token"]

# --- Test Suite ---

class TestSalesWarehouseAPI:
    """Test suite for Sales and Warehouse modules (SALE_*, WH_*)"""

    # SALE_CUS: Customer Management
    def test_SALE_CUS_01_create_customer_success(self, client, sale_token):
        headers = {"Authorization": f"Bearer {sale_token}"}
        customer_data = {"name": "Khách hàng mới", "phone": "0987654321"}
        response = client.post("/api/sales/customers", headers=headers, json=customer_data)
        assert response.status_code == 200
        assert "Thêm khách hàng thành công" in response.json()["message"]

    def test_SALE_CUS_02_create_customer_duplicate_phone(self, client, sale_token):
        headers = {"Authorization": f"Bearer {sale_token}"}
        customer_data = {"name": "Khách hàng trùng SĐT", "phone": "0987654321"}
        response = client.post("/api/sales/customers", headers=headers, json=customer_data)
        assert response.status_code == 400
        assert "Số điện thoại đã tồn tại" in response.json()["detail"]

    # SALE_ORDER & SALE_ORDM: Order Management
    def test_SALE_ORDER_01_create_instore_order_success(self, client, sale_token):
        headers = {"Authorization": f"Bearer {sale_token}"}
        
        # 1. Create a customer for this specific test to ensure a clean state
        # FIX: Use a valid phone number format to pass backend validation (regex)
        customer_name = "Khách hàng cho đơn POS"
        customer_phone = "0911223344"
        customer_create_data = {"name": customer_name, "phone": customer_phone}
        response_customer = client.post("/api/sales/customers", headers=headers, json=customer_create_data)
        assert response_customer.status_code == 200
        customer_id = response_customer.json()["customer_id"]

        # Ensure product 1 has sufficient stock for this test
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            conn.execute("UPDATE products SET stock = 100 WHERE id = 1")
            conn.commit()

        # 2. Get product price and initial stock for calculation
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            conn.row_factory = sqlite3.Row # FIX: Ensure we can access columns by name
            product_info = conn.execute("SELECT price, stock FROM products WHERE id = 1").fetchone()
        product_price = product_info["price"]
        initial_stock = product_info["stock"]

        # 3. Create the order
        product_id = 1 # Nike Air Force 1, price 2,500,000
        quantity = 1
        order_data = {
            "customer_id": customer_id,
            "customer_name": customer_name,
            "phone": customer_phone,
            "order_type": "in-store",
            "items": [{"product_id": product_id, "quantity": quantity}]
        }
        response_order = client.post("/api/sales/orders", headers=headers, json=order_data)
        print(" BACKEND RETURNED ERROR DETAIL:", response_order.json()) # In ra chi tiết lỗi
        assert response_order.status_code == 200
        assert "Tạo đơn hàng thành công" in response_order.json()["message"]
        order_id = response_order.json()["order_id"]
        order_total_amount = product_price * quantity # 2,500,000 * 1 = 2,500,000
        
        # Check stock reduction
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            current_stock = conn.execute(f"SELECT stock FROM products WHERE id = {product_id}").fetchone()[0]
        assert current_stock == initial_stock - quantity # Initial stock was 10, sold 1, so 9

        # 4. Follow the correct workflow to complete the order (SALE_ORDM_05)
        # Transition 1: awaiting_pickup -> shipping
        response_shipping = client.put(f"/api/sales/orders/{order_id}/status", headers=headers, json={"status": "shipping"})
        print(" BACKEND RETURNED ERROR DETAIL (Shipping):", response_shipping.json())
        assert response_shipping.status_code == 200
        assert "Cập nhật trạng thái đơn hàng" in response_shipping.json()["message"]

        # Transition 2: shipping -> completed (to trigger loyalty points update)
        response_completed = client.put(f"/api/sales/orders/{order_id}/status", headers=headers, json={"status": "completed"})
        print(" BACKEND RETURNED ERROR DETAIL (Completed):", response_completed.json())
        assert response_completed.status_code == 200
        assert "Cập nhật trạng thái đơn hàng" in response_completed.json()["message"]

        # 5. Check loyalty points for the customer (SALE_CUS_03)
        with sqlite3.connect("test_shoestore.db", check_same_thread=False) as conn:
            conn.row_factory = sqlite3.Row
            customer_info = conn.execute(f"SELECT loyalty_points FROM customers WHERE id = {customer_id}").fetchone()
        
        # Calculate expected loyalty points: total_amount / 10,000
        expected_loyalty_points = int(order_total_amount / 10000) # 2,500,000 / 10,000 = 250 points
        assert customer_info["loyalty_points"] == expected_loyalty_points
        # This replaces the problematic 'assert 11 == 9' with a correct calculation.

    def test_SALE_ORDER_04_create_order_insufficient_stock(self, client, sale_token):
        headers = {"Authorization": f"Bearer {sale_token}"}
        order_data = {
            "customer_name": "Khách hàng A", "phone": "0111222333", "order_type": "online",
            "items": [{"product_id": 2, "quantity": 10}] # Adidas Ultraboost, stock is 5
        }
        response = client.post("/api/sales/orders", headers=headers, json=order_data)
        assert response.status_code == 400
        assert "không đủ tồn kho" in response.json()["detail"]

    def test_SALE_ORDM_05_invalid_status_transition(self, client, sale_token):
        headers = {"Authorization": f"Bearer {sale_token}"}
        # Assuming order with id=1 exists and is 'awaiting_pickup'
        response = client.put("/api/sales/orders/1/status", headers=headers, json={"status": "completed"})
        assert response.status_code == 400
        assert "Không thể chuyển trạng thái" in response.json()["detail"]

    # WH_IN: Warehouse Inbound
    def test_WH_IN_01_02_create_inbound_slip_success(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        slip_data = {"product_id": 2, "quantity": 20} # Adidas Ultraboost
        response = client.post("/api/warehouse/inbound", headers=headers, json=slip_data)
        assert response.status_code == 200
        assert "Lập phiếu nhập kho thành công" in response.json()["message"]
        # Check stock increase
        with sqlite3.connect("test_shoestore.db") as conn:
            stock = conn.execute("SELECT stock FROM products WHERE id = 2").fetchone()[0]
        assert stock == 25 # Initial 5 + 20

    def test_WH_IN_03_create_inbound_slip_invalid_qty(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        slip_data = {"product_id": 2, "quantity": -5}
        response = client.post("/api/warehouse/inbound", headers=headers, json=slip_data)
        assert response.status_code == 400
        assert "Số lượng nhập kho phải lớn hơn 0" in response.json()["detail"]

    # WH_OUT: Warehouse Outbound
    def test_WH_OUT_01_02_create_outbound_slip_success(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        slip_data = {"product_id": 4, "quantity": 2} # Converse Chuck 70
        response = client.post("/api/warehouse/outbound", headers=headers, json=slip_data)
        assert response.status_code == 200
        assert "Lập phiếu xuất kho thành công" in response.json()["message"]
        # Check stock decrease
        with sqlite3.connect("test_shoestore.db") as conn:
            stock = conn.execute("SELECT stock FROM products WHERE id = 4").fetchone()[0]
        assert stock == 18 # Initial 20 - 2

    def test_WH_OUT_03_create_outbound_slip_insufficient_stock(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        slip_data = {"product_id": 4, "quantity": 100} # Converse Chuck 70, stock is now 18
        response = client.post("/api/warehouse/outbound", headers=headers, json=slip_data)
        assert response.status_code == 400
        assert "Không đủ tồn kho" in response.json()["detail"]

    # WH_COUNT: Inventory Count
    def test_WH_COUNT_01_04_perform_inventory_count(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        # Product 4 (Converse) has stock 18. Let's say we count 17.
        count_data = {"product_id": 4, "actual_qty": 17, "reason": "Thất thoát 1 sản phẩm"}
        response = client.post("/api/warehouse/inventory-count", headers=headers, json=count_data)
        assert response.status_code == 200
        assert "Đã điều chỉnh tồn kho" in response.json()["message"]
        # Check stock adjustment
        with sqlite3.connect("test_shoestore.db") as conn:
            stock = conn.execute("SELECT stock FROM products WHERE id = 4").fetchone()[0]
        assert stock == 17

    # WH_RETURN: Return Handling
    def test_WH_RETURN_03_process_good_return(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        return_data = {"product_id": 4, "quantity": 1, "reason": "good"}
        response = client.post("/api/warehouse/returns", headers=headers, json=return_data)
        assert response.status_code == 200
        assert "Hàng tốt, đã nhập lại tồn kho" in response.json()["message"]
        # Check stock increase
        with sqlite3.connect("test_shoestore.db") as conn:
            stock = conn.execute("SELECT stock FROM products WHERE id = 4").fetchone()[0]
        assert stock == 18 # Back to 18

    def test_WH_RETURN_04_process_bad_return(self, client, kho_token):
        headers = {"Authorization": f"Bearer {kho_token}"}
        return_data = {"product_id": 4, "quantity": 1, "reason": "bad"}
        response = client.post("/api/warehouse/returns", headers=headers, json=return_data)
        assert response.status_code == 200
        assert "Hàng lỗi, đã chuyển sang khu vực hàng hỏng" in response.json()["message"]
        # Check stock is not changed
        with sqlite3.connect("test_shoestore.db") as conn:
            stock = conn.execute("SELECT stock FROM products WHERE id = 4").fetchone()[0]
        assert stock == 18