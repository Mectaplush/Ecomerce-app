import React, { useRef } from 'react';
import './PrintImage.scss';

const PrintImage = ({ dataCart }) => {
    const printRef = useRef();

    console.log(dataCart);

    const handlePrint = () => {
        const printContent = printRef.current;
        const originalContents = document.body.innerHTML;

        document.body.innerHTML = printContent.innerHTML;
        window.print();
        document.body.innerHTML = originalContents;

        // Reattach event listeners and React after printing
        window.location.reload();
    };

    const currentDate = new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    const totalPrice = dataCart?.reduce((acc, item) => acc + item.totalPrice, 0);

    return (
        <div className="print-container">
            <div className="print-actions">
                <h2>Xem trước báo giá</h2>
                <div>
                    <button className="print-button" onClick={handlePrint}>
                        In đơn hàng
                    </button>
                </div>
            </div>

            <div className="print-content" ref={printRef}>
                <div className="print-header">
                    <div className="logo-section">
                        <div className="logo">
                            <div>PCM</div>
                        </div>
                        <div className="company-info">
                            <div className="company-name">PCM</div>
                            <div>Cơ sở 1: Số 83-85 Thái Hà, Trung Liệt, Đống Đa, Hà Nội</div>
                            <div>Cơ sở 2: Số 40 Vĩnh Viễn, Phường 2, Quận 10, TP Hồ Chí Minh</div>
                            <div>Hotline: 087.997.9997</div>
                            <div>
                                Website: <a href="http://www.pcmarket.vn">www.pcmarket.vn</a>
                            </div>
                            <div>Fanpage: PCM</div>
                            <div>
                                <a href="https://m.me/pcmarket.vn">https://m.me/pcmarket.vn</a>
                            </div>
                        </div>
                    </div>
                    <h1 className="quote-title">BÁO GIÁ THIẾT BỊ</h1>
                    <div className="quote-date">
                        <div>Ngày báo giá: {currentDate}</div>
                        <div>Đơn vị tính: VNĐ</div>
                    </div>
                </div>

                <div className="quote-table">
                    <table>
                        <thead>
                            <tr>
                                <th className="stt">STT</th>
                                <th className="product-name">Tên sản phẩm</th>
                                <th className="quantity">Số lượng</th>
                                <th className="price">Đơn giá</th>
                                <th className="total">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dataCart?.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td className="product-name-cell">{item.product.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.product.price.toLocaleString()}</td>
                                    <td>{item.totalPrice.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr className="shipping-row">
                                <td colSpan="4" className="right-align">
                                    Phí vận chuyển
                                </td>
                                <td colSpan="2">0</td>
                            </tr>
                            <tr className="other-fee-row">
                                <td colSpan="4" className="right-align">
                                    Chi phí khác
                                </td>
                                <td colSpan="2">0</td>
                            </tr>
                            <tr className="total-row">
                                <td colSpan="4" className="right-align">
                                    Tổng tiền đơn hàng
                                </td>
                                <td colSpan="2">{totalPrice.toLocaleString()} đ</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="print-footer">
                    <div className="note">
                        <div className="note-title">Quý khách lưu ý:</div>
                        <div>Giá bán, khuyến mại của sản phẩm và tình trạng còn hàng</div>
                        <div>có thể bị thay đổi bất cứ lúc nào mà không kịp báo trước.</div>
                        <div>&nbsp;</div>
                        <div>Để biết thêm chi tiết, Quý khách vui lòng liên hệ</div>
                        <div>Hotline 087.997.9997 hoặc hoặc nhắn tin vào fanpage</div>
                        <div>
                            <a href="https://m.me/pcmarket.vn">https://m.me/pcmarket.vn</a>
                        </div>
                    </div>
                    <div className="thank-you">PCM CẢM ƠN QUÝ KHÁCH</div>
                </div>
            </div>
        </div>
    );
};

export default PrintImage;
