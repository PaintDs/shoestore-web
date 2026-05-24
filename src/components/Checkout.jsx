import React, { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, Truck, ShieldCheck } from 'lucide-react';

const Checkout = ({ onBack, cartItems, onCheckoutSuccess, currentUser }) => {
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [showVietQRModal, setShowVietQRModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [vietqrOrderId, setVietqrOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (currentUser && currentUser.name) {
      setCustomerInfo(prev => ({ ...prev, name: currentUser.name }));
    }
  }, [currentUser]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal > 0 ? 30000 : 0;
  const total = Math.max(subtotal + shippingFee - discount, 0);

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim();
    if (!code) {
      alert('Vui lòng nhập mã giảm giá.');
      return;
    }
    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      const response = await fetch('/api/apply-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voucher_code: code, cart_total: subtotal }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Mã không hợp lệ.');
      setDiscount(data.discount_amount || 0);
      alert(`Áp dụng mã thành công! Giảm ${(data.discount_amount || 0).toLocaleString('vi-VN')}đ`);
    } catch (err) {
      setDiscount(0);
      alert(err.message);
    }
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (cartItems.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      return;
    }

    try {
      const token = localStorage.getItem('shoestore_token') || sessionStorage.getItem('token');
      if (!token) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        return;
      }

      // Dọn dẹp và chuẩn hóa payload gửi đi
      const payload = {
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.address,
        paymentMethod: paymentMethod,
        shippingFee: shippingFee,
        cartItems: cartItems.map(item => ({
            id: Number(item.id),
            productId: Number(item.id), // Gửi cả 2 key để an toàn tuyệt đối
            quantity: Number(item.quantity),
            price: Number(item.price),
            name: item.name || "Sản phẩm"
        })),
        voucherCode: voucherCode.trim() || null,
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(data.detail || "Lỗi từ server");
        error.response = { data }; // Gắn kèm data để catch có thể đọc
        throw error;
      }

      // --- CHIA NHÁNH XỬ LÝ THEO PHƯƠG THỨC THANH TOÁN CHUẨN ---
      if (paymentMethod === 'vietqr') {
        if (data.qr_code_url) {
          setQrCodeUrl(data.qr_code_url);
          setVietqrOrderId(data.order_id);
          setShowVietQRModal(true); // Chỉ bật Modal, DỪNG LUỒNG tại đây cho khách quét mã
        } else {
          alert("Lỗi: Backend không trả về link ảnh QR.");
        }
      } else if (paymentMethod === 'COD') {
        // Khách dùng COD thì mới cho chuyển hướng dọn giỏ hàng ngay
        alert(data.message || "🎉 Đặt hàng thành công! Đơn hàng của bạn đang chờ xác nhận.");
        onCheckoutSuccess();
      }
    } catch (error) {
        console.error("CHI TIẾT LỖI CHECKOUT:", error.response?.data);
        setError(error.message); // Cập nhật state lỗi để hiển thị trên UI nếu cần
        if (error.response && error.response.data) {
            const data = error.response.data;
            if (Array.isArray(data.detail)) {
                const errorMessages = data.detail.map(err => `+ Trường ${err.loc[err.loc.length - 1]}: ${err.msg}`);
                alert(`Dữ liệu đơn hàng không hợp lệ:\n${errorMessages.join('\n')}`);
            } else if (data.detail) {
                alert(`Lỗi: ${data.detail}`);
            } else {
                alert(`Lỗi hệ thống: ${JSON.stringify(data)}`);
            }
        } else {
            alert("Lỗi mạng: Không thể kết nối đến máy chủ!");
        }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-blue-600 font-medium mb-6 transition-colors group">
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Quay lại cửa hàng
        </button>
        <form onSubmit={handleCheckoutSubmit} className="flex flex-col lg:flex-row gap-8">
          {/* Cột trái: Form thông tin */}
          <div className="flex-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-600"/> Thông tin giao hàng</h2>
              <div className="grid grid-cols-2 gap-4">
                <input required name="name" value={customerInfo.name} onChange={handleInputChange} type="text" placeholder="Họ và tên" className="col-span-2 sm:col-span-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                <input required name="phone" value={customerInfo.phone} onChange={handleInputChange} type="tel" placeholder="Số điện thoại" className="col-span-2 sm:col-span-1 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
                <input required name="address" value={customerInfo.address} onChange={handleInputChange} type="text" placeholder="Địa chỉ chi tiết (Số nhà, tên đường...)" className="col-span-2 p-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-600"/> Phương thức thanh toán</h2>
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-blue-600 bg-blue-50 rounded-xl cursor-pointer transition-colors">
                  <input type="radio" name="payment" value="COD" checked={paymentMethod === 'COD'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-3 font-bold text-blue-900">Thanh toán khi nhận hàng (COD)</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <input type="radio" name="payment" value="vietqr" checked={paymentMethod === 'vietqr'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-3 font-medium text-gray-700">Thanh toán quét mã VietQR (Tự động)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Cột phải: Tóm tắt đơn hàng */}
          <div className="w-full lg:w-96">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-28">
              <h2 className="text-xl font-bold mb-6">Tóm tắt đơn hàng</h2>
              <div className="space-y-4 text-sm mb-6 border-b border-gray-100 pb-6">
                <div className="flex justify-between"><span className="text-gray-600">Tạm tính ({cartItems.length} sản phẩm)</span><span className="font-medium text-gray-900">{subtotal.toLocaleString('vi-VN')}đ</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phí vận chuyển</span><span className="font-medium text-gray-900">{shippingFee.toLocaleString('vi-VN')}đ</span></div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Giảm giá voucher</span>
                    <span>-{discount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                    placeholder="Mã giảm giá"
                    className="flex-1 p-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500"
                  />
                  <button type="button" onClick={handleApplyVoucher} className="text-blue-600 font-bold text-sm hover:underline whitespace-nowrap">Áp dụng</button>
                </div>
              </div>
              <div className="flex justify-between items-end mb-8">
                <span className="font-bold text-gray-900">Tổng cộng</span>
                <span className="text-2xl font-black text-blue-600">{total.toLocaleString('vi-VN')}đ</span>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                <ShieldCheck className="w-5 h-5" /> Hoàn tất đặt hàng
              </button>
            </div>
          </div>
        </form>
      </div>
      {showVietQRModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl text-center">
            <h2 className="text-xl font-bold mb-6">Quét mã VietQR để thanh toán</h2>
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Mã QR VietQR" className="w-64 h-64 mx-auto mb-4 border border-gray-200 rounded-lg p-2" />
            ) : (
              <div className="text-red-500 mb-4">Không thể tạo mã QR. Vui lòng thử lại.</div>
            )}
            <p className="text-gray-700 font-medium mb-6">Nội dung CK: <span className="font-bold text-blue-600">SHOESTORE {vietqrOrderId}</span></p>
            <button
              onClick={() => {
                setShowVietQRModal(false);
                setQrCodeUrl('');
                setVietqrOrderId('');
                onCheckoutSuccess(); // Chuyển hướng về trang chủ hoặc trang xác nhận
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all"
            >
              Tôi đã chuyển khoản thành công
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;