import pytest
from fastapi.testclient import TestClient
import sqlite3
from datetime import datetime

# --- Fixtures ---
@pytest.fixture
def ketoan_token(client):
    """Fixture to get a token for the 'ketoan' role."""
    response = client.post("/api/login", json={"email": "ketoan@shoestore.vn", "password": "123456"})
    assert response.status_code == 200
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client):
    """Fixture to get a token for the 'admin' role."""
    response = client.post("/api/login", json={"email": "admin@shoestore.vn", "password": "123456"})
    assert response.status_code == 200
    return response.json()["access_token"]

# --- Test Suite ---

class TestAccountingAPI:
    """Test suite for Accounting module (ACC)"""

    # ACC_INV: Invoice Management
    def test_ACC_INV_01_create_invoice_success(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        invoice_data = {
            "order_id": 1, "customer_name": "Test Customer", "company_name": "Test Company",
            "tax_id": "0123456789", "address": "123 Test Street", "total_amount": 5000000
        }
        response = client.post("/api/accounting/invoices", headers=headers, json=invoice_data)
        assert response.status_code == 200
        assert "Xuất hóa đơn thành công" in response.json()["message"]
        assert "invoice_id" in response.json()

    def test_ACC_INV_02_create_invoice_missing_fields(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        invoice_data = {"order_id": 2, "customer_name": "Test Customer"} # Missing fields
        response = client.post("/api/accounting/invoices", headers=headers, json=invoice_data)
        assert response.status_code == 422 # Unprocessable Entity

    def test_ACC_INV_03_create_invoice_invalid_tax_id(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        invoice_data = {
            "order_id": 3, "customer_name": "Test Customer", "company_name": "Test Company",
            "tax_id": "INVALID_TAX_ID", "address": "123 Test Street", "total_amount": 100000
        }
        response = client.post("/api/accounting/invoices", headers=headers, json=invoice_data)
        assert response.status_code == 400
        assert "Mã số thuế không hợp lệ" in response.json()["detail"]

    def test_ACC_INV_04_search_invoice_success(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        response = client.get("/api/accounting/invoices?search_term=0123456789", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) > 0

    def test_ACC_INV_05_adjust_invoice_success(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        # Assuming an invoice with id=1 exists from previous test
        response = client.put("/api/accounting/invoices/1/adjust", headers=headers, json={"reason": "Điều chỉnh do sai sót"})
        assert response.status_code == 200
        assert "Hóa đơn đã được hủy/điều chỉnh thành công" in response.json()["message"]
        with sqlite3.connect("test_shoestore.db") as conn:
            status = conn.execute("SELECT status FROM invoices WHERE id = 1").fetchone()[0]
        assert status == "cancelled"

    # ACC_CASH: Cash Ledger Management
    def test_ACC_CASH_01_02_create_cash_entry_success(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        income_data = {"type": "income", "category": "Bán hàng", "amount": 10000000, "method": "Chuyển khoản", "description": "Doanh thu ngày"}
        response_income = client.post("/api/accounting/cash-ledger", headers=headers, json=income_data)
        assert response_income.status_code == 200
        assert "Ghi nhận bút toán thành công" in response_income.json()["message"]

        expense_data = {"type": "expense", "category": "Vận hành", "amount": 1500000, "method": "Tiền mặt", "description": "Chi phí điện"}
        response_expense = client.post("/api/accounting/cash-ledger", headers=headers, json=expense_data)
        assert response_expense.status_code == 200
        assert "Ghi nhận bút toán thành công" in response_expense.json()["message"]

    def test_ACC_CASH_03_create_cash_entry_invalid_amount(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        invalid_data = {"type": "income", "category": "Bán hàng", "amount": -5000, "method": "Tiền mặt", "description": "Lỗi"}
        response = client.post("/api/accounting/cash-ledger", headers=headers, json=invalid_data)
        assert response.status_code == 400
        assert "Số tiền phải là số dương" in response.json()["detail"]

    def test_ACC_CASH_05_get_cash_ledger_with_summary(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        response = client.get("/api/accounting/cash-ledger", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "transactions" in data
        assert "summary" in data
        assert "income" in data["summary"]
        assert "expense" in data["summary"]
        assert data["summary"]["income"] >= 10000000

    # ACC_FIN: Financial Closing & Reporting
    def test_ACC_FIN_03_get_report_fail_period_not_locked(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        current_year = datetime.now().year
        current_month = datetime.now().month
        response = client.get(f"/api/accounting/reports?year={current_year}&month={current_month}", headers=headers)
        assert response.status_code == 400
        assert "Kỳ báo cáo chưa được khóa sổ" in response.json()["detail"]

    def test_ACC_FIN_06_lock_period_and_check_block(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        # Lock the period
        lock_payload = {"year": current_year, "month": current_month}
        response_lock = client.post("/api/accounting/periods/lock", headers=headers, json=lock_payload)
        assert response_lock.status_code == 200
        assert "Đã khóa thành công" in response_lock.json()["message"]

        # Try to add a new cash entry to the locked period
        entry_data = {"type": "income", "category": "Bán hàng", "amount": 5000, "method": "Tiền mặt", "description": "Giao dịch muộn"}
        response_entry = client.post("/api/accounting/cash-ledger", headers=headers, json=entry_data)
        assert response_entry.status_code == 400
        assert "đã khóa, không thể ghi nhận" in response_entry.json()["detail"]

    def test_ACC_FIN_01_get_report_success_after_lock(self, client, ketoan_token):
        headers = {"Authorization": f"Bearer {ketoan_token}"}
        current_year = datetime.now().year
        current_month = datetime.now().month
        # Assuming the period is locked from the previous test
        response = client.get(f"/api/accounting/reports?year={current_year}&month={current_month}", headers=headers)
        assert response.status_code == 200
        assert "total_revenue" in response.json()

    def test_ACC_FIN_05_access_denied_for_wrong_role(self, client):
        # Use a token from another role, e.g., 'kho'
        response_login = client.post("/api/login", json={"email": "kho@shoestore.vn", "password": "123456"})
        kho_token = response_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {kho_token}"}
        
        response = client.get("/api/accounting/invoices", headers=headers)
        assert response.status_code == 403
        assert "Bạn không có quyền truy cập" in response.json()["detail"]