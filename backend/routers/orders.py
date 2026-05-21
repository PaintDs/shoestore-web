from fastapi import APIRouter, Depends, HTTPException, status
import sqlite3
import random
import re
import urllib.request
import json
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, model_validator
from pydantic.alias_generators import to_camel
from datetime import datetime, timezone

from database import get_db
from .auth import get_current_user, get_sale_user

router = APIRouter(
    prefix="/api",
    tags=["Orders, Cart & Promotions"]
)

# ================= MODELS =================

class CartItemAdd(BaseModel):
    product_id: int; quantity: int = 1; price: int; stock: int

class CartItemUpdate(BaseModel):
    product_id: int; quantity: int; stock: int

# 1. CHUẨN HÓA MODEL SẠCH
class CheckoutItem(BaseModel):
    # Bẫy trường: Khai báo cả 2 để Frontend gửi kiểu gì Backend cũng nhận được!
    id: Optional[int] = None
    product_id: Optional[int] = None
    quantity: int
    price: int
    name: Optional[str] = None
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,  # Chấp nhận cả product_id và productId
        from_attributes=True
    )

class CheckoutRequest(BaseModel):
    customer_name: str
    phone: str
    address: str
    payment_method: str
    cart_items: List[CheckoutItem]
    voucher_code: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True, # Chấp nhận cả customer_name và customerName
        from_attributes=True
    )

class ApplyVoucherRequest(BaseModel):
    voucher_code: str
    cart_total: int
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )

class CustomerUpdate(BaseModel):
    rank: str
    loyalty_points: int

class OrderInfoUpdate(BaseModel):
    customer_name: str
    # phone: Optional[str] = None # Cần nâng cấp DB để thêm cột này
    # address: Optional[str] = None # Cần nâng cấp DB để thêm cột này

class CustomerCreate(BaseModel):
    name: str; phone: str

class SaleOrderItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    product_id: int; quantity: int

class SaleOrderCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
    customer_id: Optional[int] = None
    customer_name: str; phone: str; order_type: str
    items: list[SaleOrderItem]
    voucher_code: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class OrderCancelRequest(BaseModel):
    reason: str

class PromotionUpdate(BaseModel):
    name: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    max_discount_amount: Optional[int] = None
    min_order_value: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: Optional[str] = None

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    @model_validator(mode='before')
    @classmethod
    def clean_frontend_payload(cls, data: any) -> any:
        if isinstance(data, dict):
            def parse_vn_date(val):
                if isinstance(val, str) and ('SA' in val or 'CH' in val):
                    try:
                        val_en = val.replace(' SA', ' AM').replace(' CH', ' PM')
                        return datetime.strptime(val_en, '%d/%m/%Y %I:%M %p')
                    except ValueError:
                        pass
                return val
            for key in ['startDate', 'start_date', 'endDate', 'end_date']:
                if key in data:
                    data[key] = parse_vn_date(data[key])
        return data

# ================= ENDPOINTS: CART =================

@router.post("/cart/add")
def add_to_cart(item: CartItemAdd, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    # ... (logic giỏ hàng trong bộ nhớ, không thay đổi)
    if item.stock <= 0:
        raise HTTPException(status_code=400, detail="Sản phẩm đã hết hàng!")
    
    if user_id not in mock_cart_items: mock_cart_items[user_id] = []
    
    existing_item = next((i for i in mock_cart_items[user_id] if i["product_id"] == item.product_id), None)
    if existing_item:
        if existing_item["quantity"] + item.quantity > item.stock:
            raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
        existing_item["quantity"] += item.quantity
    else:
        if item.quantity > item.stock:
             raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
        mock_cart_items[user_id].append({"product_id": item.product_id, "quantity": item.quantity, "price": item.price, "stock": item.stock})
    
    return {"message": "Đã thêm sản phẩm vào giỏ hàng!", "cart": mock_cart_items[user_id]}

@router.put("/cart/update")
def update_cart_item(item: CartItemUpdate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if user_id not in mock_cart_items: raise HTTPException(status_code=404, detail="Giỏ hàng trống!")
    
    existing_item = next((i for i in mock_cart_items[user_id] if i["product_id"] == item.product_id), None)
    if not existing_item: raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng!")
    if item.quantity <= 0: raise HTTPException(status_code=400, detail="Số lượng phải lớn hơn 0!")
    if item.quantity > item.stock: raise HTTPException(status_code=400, detail=f"Số lượng vượt quá tồn kho khả dụng ({item.stock})!")
    
    existing_item["quantity"] = item.quantity
    return {"message": "Đã cập nhật số lượng!", "cart": mock_cart_items[user_id]}

@router.delete("/cart/remove/{product_id}")
def remove_from_cart(product_id: int, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    if user_id not in mock_cart_items: raise HTTPException(status_code=404, detail="Giỏ hàng trống!")
    
    initial_len = len(mock_cart_items[user_id])
    mock_cart_items[user_id] = [item for item in mock_cart_items[user_id] if item["product_id"] != product_id]
    if len(mock_cart_items[user_id]) == initial_len:
        raise HTTPException(status_code=404, detail="Sản phẩm không có trong giỏ hàng!")
    return {"message": "Đã xóa sản phẩm khỏi giỏ hàng!"}

# ================= ENDPOINTS: VOUCHER & CHECKOUT =================

@router.post("/apply-voucher")
def apply_voucher(req: ApplyVoucherRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    user_id = current_user['id']
    
    # Bước 1: Kiểm tra tồn tại
    cursor.execute("SELECT * FROM promotions WHERE code = ?", (req.voucher_code.upper(),))
    voucher = cursor.fetchone()
    if not voucher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mã giảm giá không tồn tại.")
    
    voucher = dict(voucher)
    voucher_id = voucher['id']

    # CẢI TIẾN 2: CHẶN LỖI KHÁCH HÀNG DÙNG MỘT MÃ NHIỀU LẦN (MÃ TC_PROMO_05)
    cursor.execute("SELECT COUNT(*) FROM voucher_history WHERE user_id = ? AND voucher_id = ?", (user_id, voucher_id))
    if cursor.fetchone()[0] > 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mỗi tài khoản chỉ được phép sử dụng mã giảm giá này 1 lần duy nhất!")

    # Bước 2: Kiểm tra thời hạn
    now = datetime.now(timezone.utc)
    start_date = datetime.fromisoformat(voucher['start_date'])
    end_date = datetime.fromisoformat(voucher['end_date'])
    if not (start_date <= now <= end_date):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã giảm giá đã hết hạn hoặc chưa có hiệu lực.")

    # Bước 3: Kiểm tra số lượng (Mã TC_PROMO_02)
    if voucher['used_count'] >= voucher['usage_limit']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã giảm giá đã hết lượt sử dụng.")

    # Bước 4: Kiểm tra giá trị đơn hàng tối thiểu (Mã TC_PROMO_03)
    if req.cart_total < voucher['min_order_value']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Đơn hàng chưa đạt giá trị tối thiểu {voucher['min_order_value']:,}đ để áp dụng mã này.")

    # Tính toán số tiền được giảm
    discount_amount = 0
    if voucher['discount_type'] == 'fixed':
        discount_amount = voucher['discount_value']
    elif voucher['discount_type'] == 'percentage':
        discount_amount = req.cart_total * voucher['discount_value']
        if voucher['max_discount_amount'] and discount_amount > voucher['max_discount_amount']:
            discount_amount = voucher['max_discount_amount']
    
    final_amount = req.cart_total - discount_amount
    
    return {
        "message": "Áp dụng mã giảm giá thành công!",
        "discount_amount": int(discount_amount),
        "final_amount": int(final_amount) if final_amount > 0 else 0
    }

@router.post("/checkout")
def process_checkout(req: CheckoutRequest, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if not req.customer_name or not req.phone or not req.address or not req.payment_method or not req.cart_items:
        raise HTTPException(status_code=400, detail="Vui lòng điền đầy đủ thông tin giao hàng và giỏ hàng không được trống!")
    
    cursor = conn.cursor()
    voucher_id = None
    discount_amount = 0
    
    try:
        # CHỈ THỊ 3: Bọc toàn bộ logic trong một giao dịch (transaction)
        cart_total = sum(item.quantity * item.price for item in req.cart_items)

        # Tái xác thực voucher bên trong giao dịch để chống race condition
        if req.voucher_code:
            # Lặp lại toàn bộ 4 bước kiểm tra
            cursor.execute("SELECT * FROM promotions WHERE code = ?", (req.voucher_code.upper(),))
            voucher = cursor.fetchone()
            if not voucher: raise ValueError("Mã giảm giá không hợp lệ.")
            voucher = dict(voucher)
            voucher_id = voucher['id']

            # CẢI TIẾN 2: CHẶN LỖI KHÁCH HÀNG DÙNG MỘT MÃ NHIỀU LẦN (MÃ TC_PROMO_05)
            cursor.execute("SELECT COUNT(*) FROM voucher_history WHERE user_id = ? AND voucher_id = ?", (current_user['id'], voucher_id))
            if cursor.fetchone()[0] > 0:
                raise ValueError("Mỗi tài khoản chỉ được phép sử dụng mã giảm giá này 1 lần duy nhất.")

            now = datetime.now(timezone.utc)
            if not (datetime.fromisoformat(voucher['start_date']) <= now <= datetime.fromisoformat(voucher['end_date'])): raise ValueError("Mã giảm giá đã hết hạn.")
            if voucher['used_count'] >= voucher['usage_limit']: raise ValueError("Mã giảm giá đã hết lượt sử dụng.")
            if cart_total < voucher['min_order_value']: raise ValueError("Đơn hàng không đủ điều kiện áp dụng mã.")
            
            # Tính toán lại số tiền giảm
            if voucher['discount_type'] == 'fixed': discount_amount = voucher['discount_value']
            elif voucher['discount_type'] == 'percentage':
                discount_amount = cart_total * voucher['discount_value']
                if voucher['max_discount_amount'] and discount_amount > voucher['max_discount_amount']: discount_amount = voucher['max_discount_amount']
            voucher_id = voucher['id']

        final_amount = cart_total - discount_amount
        cursor.execute(
            "INSERT INTO orders (customer_id, customer_name, order_type, total_amount, status, user_id, sales_person_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (current_user['id'], req.customer_name, 'online', final_amount if final_amount > 0 else 0, "pending", current_user['id'], None),
        )
        order_id = cursor.lastrowid
        
        # Trừ tồn kho và chèn order_items
        # 2. LÀM SẠCH VÒNG LẶP TRỪ KHO
        for item in req.cart_items:
            p_id = item.id or item.product_id
            if not p_id:
                raise ValueError(f"Sản phẩm '{item.name or 'Không tên'}' trong giỏ hàng thiếu mã ID.")

            try:
                # Thực hiện câu lệnh atomic update trừ kho dựa trên Object property
                cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?", (item.quantity, p_id, item.quantity))
                if cursor.rowcount == 0:
                    # Truy vấn nhanh số kho thực tế để in ra terminal phục vụ debug dữ liệu
                    cursor.execute("SELECT stock FROM products WHERE id = ?", (p_id,))
                    db_stock = cursor.fetchone()
                    actual_stock = db_stock[0] if db_stock else "N/A"
                    print(f"DEBUG KHO: San pham ID {p_id} khong du hang. Yeu cau: {item.quantity}, Thuc te trong DB: {actual_stock}")
                    
                    raise ValueError(f"Sản phẩm {item.name or 'ID ' + str(p_id)} không đủ tồn kho hoặc đã hết hàng.")
                
                # Chèn vào bảng order_items
                cursor.execute("INSERT INTO order_items (order_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)", (order_id, p_id, item.name or "Sản phẩm", item.quantity))
            except sqlite3.Error as db_err:
                raise ValueError(f"Lỗi kết nối cơ sở dữ liệu: {db_err}")

        # Cập nhật lượt sử dụng voucher và ghi lịch sử
        if voucher_id:
            # CẢI TIẾN 1: VÁ LỖ HỔNG RACE CONDITION
            cursor.execute("UPDATE promotions SET used_count = used_count + 1 WHERE id = ? AND used_count < usage_limit", (voucher_id,))
            if cursor.rowcount == 0:
                raise ValueError("Mã giảm giá đã vừa bị cạn lượt dùng ở mili-giây trước!")
            
            cursor.execute("INSERT INTO voucher_history (order_id, voucher_id, user_id, discount_amount_saved) VALUES (?, ?, ?, ?)", (order_id, voucher_id, current_user['id'], int(discount_amount)))
        
        conn.commit() # Chỉ commit khi tất cả các bước thành công

    except (sqlite3.Error, ValueError) as e:
        conn.rollback() # Rollback toàn bộ giao dịch nếu có lỗi
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Lỗi khi xử lý đơn hàng: {str(e)}")

    if req.payment_method == "COD":
        return {"message": "Đặt hàng thành công với COD!", "order_id": order_id, "final_amount": final_amount}
    elif req.payment_method == "Online":
        return {"message": "Chuyển hướng đến cổng thanh toán...", "payment_url": "https://mock-vnpay-momo.com/pay", "order_id": order_id, "final_amount": final_amount}
    elif req.payment_method == "vietqr":
        # Đóng gói gọi sang API VietQR
        vietqr_url = "https://api.vietqr.io/v2/generate"
        headers = {"Content-Type": "application/json"}
        payload = {
            "accountNo": "1430197425",
            "accountName": "NGUYEN VAN KHAI",
            "acqId": "970422",
            "amount": int(final_amount),
            "addInfo": f"SHOESTORE {order_id}",
            "template": "qr_only"
        }
        try:
            req_obj = urllib.request.Request(vietqr_url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
            with urllib.request.urlopen(req_obj) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                qr_data_url = res_data.get("data", {}).get("qrDataURL", "")
            return {
                "message": "Khởi tạo mã VietQR thành công!",
                "order_id": order_id,
                "final_amount": final_amount,
                "qr_code_url": qr_data_url
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Lỗi kết nối cổng VietQR: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Phương thức thanh toán không hợp lệ.")

@router.get("/orders")
def get_orders(conn: sqlite3.Connection = Depends(get_db), status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if current_user['role'] not in ['admin', 'sale', 'ketoan']:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập danh sách đơn hàng toàn hệ thống.")
    cursor = conn.cursor()
    query = "SELECT * FROM orders"
    params = []
    
    if status:
        statuses = [s.strip() for s in status.split(',')]
        query += f" WHERE status IN ({','.join(['?']*len(statuses))})"
        params.extend(statuses)

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    orders = [dict(row) for row in cursor.fetchall()]

    for order in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order['id'],))
        order['items'] = [dict(row) for row in cursor.fetchall()]
    return orders

@router.get("/user/orders")
def get_user_orders(
    status: Optional[str] = None,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    cursor = conn.cursor()
    query = "SELECT * FROM orders WHERE user_id = ?"
    params: list = [current_user["id"]]
    if status:
        if status == 'returns':
            query += " AND status IN (?, ?)"
            params.extend(['pending_return', 'returned_received'])
        else:
            query += " AND status = ?"
            params.append(status)
    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    orders = [dict(row) for row in cursor.fetchall()]

    for order in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order['id'],))
        order['items'] = [dict(row) for row in cursor.fetchall()]

    return orders

@router.get("/user/orders/{order_id}")
def get_user_order_detail(order_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM orders WHERE id = ? AND user_id = ?", (order_id, current_user["id"]))
    order = cursor.fetchone()
    if not order: raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.")
    
    order_dict = dict(order)
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    order_dict['items'] = [dict(row) for row in cursor.fetchall()]
    return order_dict

@router.post("/user/orders/{order_id}/request-return", summary="Khách hàng gửi yêu cầu hoàn hàng")
def request_order_return(order_id: int, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_current_user)):
    """
    Cho phép khách hàng gửi yêu cầu hoàn trả cho một đơn hàng đã hoàn thành.
    Hệ thống sẽ chuyển trạng thái đơn hàng thành 'pending_return'.
    Nhân viên kho sẽ thấy yêu cầu này và xử lý ở bước tiếp theo.
    """
    cursor = conn.cursor()
    # Xác thực đơn hàng thuộc về người dùng và đang ở trạng thái có thể hoàn trả
    cursor.execute("SELECT status FROM orders WHERE id = ? AND user_id = ?", (order_id, user["id"]))
    order = cursor.fetchone()

    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập.")
    
    if order['status'] != 'completed':
        raise HTTPException(status_code=400, detail=f"Không thể yêu cầu hoàn hàng cho đơn ở trạng thái '{order['status']}'. Chỉ chấp nhận đơn đã hoàn thành.")

    cursor.execute("UPDATE orders SET status = 'pending_return' WHERE id = ?", (order_id,))
    conn.commit()
    return {"message": "Yêu cầu hoàn hàng đã được gửi thành công. Vui lòng chờ nhân viên kho xử lý."}

@router.post("/user/orders/{order_id}/cancel")
def cancel_user_order(
    order_id: int,
    body: OrderCancelRequest,
    conn: sqlite3.Connection = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if not body.reason or not body.reason.strip():
        raise HTTPException(status_code=400, detail="INT_ORDER_03: Vui lòng nhập lý do hủy đơn.")
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM orders WHERE id = ? AND user_id = ?", (order_id, current_user["id"]))
    order_status = cursor.fetchone()
    if not order_status:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")
    if order_status["status"] != "pending":
        raise HTTPException(status_code=400, detail="INT_ORDER_04: Không thể hủy đơn hàng khi đang giao hoặc đã xử lý.")
    cursor.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", (order_id,))
    conn.commit()
    return {"message": "Đơn hàng đã được hủy thành công!", "reason": body.reason.strip()}

# ================= ENDPOINTS: SALES =================

@router.post("/sales/customers")
def create_customer(customer: CustomerCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    if not re.match(r'^(0[3|5|7|8|9])+([0-9]{8})$', customer.phone):
        raise HTTPException(status_code=400, detail="SALE_CUS_02: Số điện thoại không hợp lệ.")
    
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO customers (name, phone) VALUES (?, ?)", (customer.name, customer.phone))
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="SALE_CUS_02: Số điện thoại đã tồn tại trong hệ thống.")
    
    return {"message": "SALE_CUS_01: Thêm khách hàng thành công!", "customer_id": cursor.lastrowid}

@router.get("/sales/customers")
def get_customers(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY id DESC")
    return [dict(row) for row in cursor.fetchall()]

@router.put("/sales/customers/{customer_id}")
def update_customer(customer_id: int, customer: CustomerUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE customers SET rank = ?, loyalty_points = ? WHERE id = ?",
        (customer.rank, customer.loyalty_points, customer_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Khách hàng không tồn tại.")
    
    conn.commit()
    return {"message": "Cập nhật thông tin khách hàng thành công!"}

@router.post("/sales/orders")
def create_sale_order(order: SaleOrderCreate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    total_amount = 0
    
    for item in order.items:
        cursor.execute("SELECT price, stock FROM products WHERE id = ?", (item.product_id,))
        product = cursor.fetchone()
        if not product:
            raise HTTPException(status_code=404, detail=f"Sản phẩm ID {item.product_id} không tồn tại.")
        if product['stock'] < item.quantity:
            raise HTTPException(status_code=400, detail=f"SALE_ORDER_04: Sản phẩm ID {item.product_id} không đủ tồn kho (còn {product['stock']}).")
        total_amount += product['price'] * item.quantity

    if order.customer_id:
        cursor.execute("SELECT rank FROM customers WHERE id = ?", (order.customer_id,))
        customer = cursor.fetchone()
        if customer and customer['rank'] == 'VIP':
            total_amount *= 0.95

    # Sử dụng user_id để lưu thông tin người tạo đơn hàng (sales_person_id được thay bằng user_id)
    cursor.execute(
        "INSERT INTO orders (customer_id, customer_name, order_type, total_amount, status, user_id, sales_person_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            order.customer_id,
            order.customer_name,
            order.order_type,
            total_amount,
            'awaiting_pickup' if order.order_type != 'online' else 'pending',
            user['id'],
            user['id'],
        ),
    )
    order_id = cursor.lastrowid

    for item in order.items:
        cursor.execute("INSERT INTO order_items (order_id, product_id, product_name, quantity) VALUES (?, ?, (SELECT name FROM products WHERE id=?), ?)",
                       (order_id, item.product_id, item.product_id, item.quantity))

    conn.commit()
    return {"message": "SALE_ORDER_01/02: Tạo đơn hàng thành công!", "order_id": order_id}

@router.put("/sales/orders/{order_id}/update")
def update_order_info(order_id: int, order_update: OrderInfoUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_sale_user)):
    cursor = conn.cursor()
    cursor.execute("SELECT status FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")
    if order['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Chỉ có thể sửa thông tin đơn hàng ở trạng thái 'pending'.")

    cursor.execute(
        "UPDATE orders SET customer_name = ? WHERE id = ?",
        (order_update.customer_name, order_id)
    )
    conn.commit()
    return {"message": f"Cập nhật thông tin đơn hàng {order_id} thành công."}

@router.put("/sales/orders/{order_id}/status")
def update_order_status(order_id: int, status_update: OrderStatusUpdate, conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_current_user)):
    conn.row_factory = sqlite3.Row # Đảm bảo dữ liệu trả về dạng Dict-like
    cursor = conn.cursor()
    cursor.execute("SELECT status, customer_id, total_amount FROM orders WHERE id = ?", (order_id,))
    order = cursor.fetchone()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng.")

    # Nếu người dùng là khách hàng (customer), họ CHỈ được phép chuyển trạng thái đơn sang 'completed' (Đã nhận hàng)
    # và đơn hàng đó phải thuộc về chính họ (khớp customer_id)
    if user['role'] == 'customer':
        if status_update.status != 'completed':
            raise HTTPException(status_code=403, detail="Khách hàng chỉ có quyền xác nhận 'Đã nhận được hàng'.")
        # Anti-IDOR: Kiểm tra nghiêm ngặt quyền sở hữu đơn hàng
        if order['customer_id'] is None or int(order['customer_id']) != user['id']:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thao tác trên đơn hàng của người khác.")
    # Nếu không phải customer (tức là admin/sale) thì cho phép đi tiếp luồng xử lý trạng thái bình thường của họ

    valid_transitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['shipping', 'cancelled'],
        'awaiting_pickup': ['shipping'],
        'shipping': ['completed', 'returned'],
    }
    if status_update.status not in valid_transitions.get(order['status'], []):
        raise HTTPException(status_code=400, detail=f"Không thể chuyển trạng thái từ '{order['status']}' sang '{status_update.status}'.")

    if status_update.status == 'shipping' and order['status'] != 'shipping':
        cursor.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ?", (order_id,))
        items = cursor.fetchall()
        for item in items:
            cursor.execute("SELECT stock FROM products WHERE id = ?", (item['product_id'],))
            stock_row = cursor.fetchone()
            if not stock_row or stock_row['stock'] < item['quantity']:
                raise HTTPException(status_code=400, detail=f"Không thể xuất kho: Sản phẩm ID {item['product_id']} không đủ tồn kho.")
            cursor.execute("UPDATE products SET stock = stock - ? WHERE id = ?", (item['quantity'], item['product_id']))

    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status_update.status, order_id))

    if status_update.status == 'completed' and order['customer_id']:
        points_to_add = int(order['total_amount'] / 10000)
        cursor.execute("UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?", (points_to_add, order['customer_id']))
        
        cursor.execute("SELECT loyalty_points FROM customers WHERE id = ?", (order['customer_id'],))
        customer_row = cursor.fetchone()
        
        # Chốt chặn an toàn: Chỉ xử lý lên hạng VIP nếu tìm thấy bản ghi khách hàng trong DB
        if customer_row is not None:
            new_points = customer_row['loyalty_points']
            if new_points >= 1000:
                cursor.execute("UPDATE customers SET rank = 'VIP' WHERE id = ?", (order['customer_id'],))

    conn.commit()
    return {"message": f"Cập nhật trạng thái đơn hàng {order_id} thành công."}

@router.post("/sales/orders/mock-online")
def create_mock_online_order(conn: sqlite3.Connection = Depends(get_db), user: dict = Depends(get_current_user)):
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name, price, stock FROM products WHERE stock > 0 ORDER BY RANDOM() LIMIT ?", (random.randint(1, 3),))
    products_to_order = cursor.fetchall()

    if not products_to_order:
        raise HTTPException(status_code=400, detail="Không có sản phẩm nào trong kho để tạo đơn demo.")

    total_amount = 0
    order_items_data = []
    for product in products_to_order:
        quantity = 1
        total_amount += product['price'] * quantity
        order_items_data.append({
            "product_id": product['id'],
            "product_name": product['name'],
            "quantity": quantity
        })

    # Gán đơn hàng demo chuẩn chỉ cho chính tài khoản đang đăng nhập
    cursor.execute(
        "INSERT INTO orders (customer_id, customer_name, order_type, total_amount, status) VALUES (?, ?, ?, ?, ?)",
        (user['id'], user['name'], 'online', total_amount, 'pending')
    )
    order_id = cursor.lastrowid

    for item in order_items_data:
        cursor.execute("INSERT INTO order_items (order_id, product_id, product_name, quantity) VALUES (?, ?, ?, ?)", (order_id, item['product_id'], item['product_name'], item['quantity']))
    
    conn.commit()
    return {"message": f"Tạo và lưu đơn hàng demo {order_id} vào DB thành công!", "order_id": order_id}

# ================= ENDPOINTS: PROMOTIONS =================

@router.get("/promotions")
def get_promotions(conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem khuyến mãi.")
    
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM promotions ORDER BY start_date DESC")
    promotions = [dict(row) for row in cursor.fetchall()]
    return promotions

@router.put("/promotions/{promo_id}")
def update_promotion(promo_id: int, promo_update: PromotionUpdate, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật khuyến mãi.")
    
    cursor = conn.cursor()
    update_dict = promo_update.model_dump(exclude_unset=True)
    set_clauses = [f"{key} = ?" for key in update_dict.keys()]
    params = list(update_dict.values())

    if not set_clauses:
        raise HTTPException(status_code=400, detail="Không có thông tin để cập nhật.")

    query = f"UPDATE promotions SET {', '.join(set_clauses)} WHERE id = ?"
    params.append(promo_id)
    
    cursor.execute(query, tuple(params))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy khuyến mãi.")
    conn.commit()
    return {"message": "Cập nhật khuyến mãi thành công!"}

@router.post("/promotions/{promo_id}/end")
def end_promotion_early(promo_id: int, conn: sqlite3.Connection = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin"]:
        raise HTTPException(status_code=403, detail="Bạn không có quyền kết thúc khuyến mãi.")
    
    cursor = conn.cursor()
    cursor.execute("UPDATE promotions SET status = 'ended', end_date = ? WHERE id = ? AND status = 'active'", (datetime.now(timezone.utc), promo_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=400, detail="Không thể kết thúc khuyến mãi này (có thể đã kết thúc hoặc không tồn tại).")
    conn.commit()
    return {"message": "Khuyến mãi đã được kết thúc sớm!"}