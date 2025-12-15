import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import Header from '../../Components/Header/Header';
import { Card, Table, Input, Form, Button, Checkbox, Space, message, InputNumber } from 'antd';
import { DeleteOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import {
    requestDeleteCart,
    requestPayment,
    requestUpdateInfoCart,
    requestUpdateQuantityCart,
} from '../../config/request';
import { useStore } from '../../hooks/useStore';
import Footer from '../../Components/Footer/Footer';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

function Cart() {
    const [checkBox, setCheckBox] = useState(false);

    const { fetchCart, dataCart, dataUser } = useStore();

    const navigate = useNavigate();

    const totalPrice = useMemo(() => {
        return dataCart.reduce((total, item) => total + item.totalPrice, 0);
    }, [dataCart]);

    const handleDeleteCart = async (id) => {
        try {
            const data = {
                cartId: id,
            };
            await requestDeleteCart(data);
            await fetchCart();
            message.success('Xoá sản phẩm trong giỏ hàng thành công');
        } catch (error) {
            message.error(error.response?.data?.message || 'Xoá sản phẩm trong giỏ hàng thất bại');
        }
    };

    const handleChangeQuantity = async (record, value) => {
        // Kiểm tra giá trị hợp lệ
        if (!value || value <= 0) {
            message.error('Số lượng không hợp lệ hoặc vượt quá số lượng trong kho!');
            return;
        }

        // Kiểm tra giới hạn số lượng hợp lý
        if (value > 9999) {
            message.error('Số lượng không thể vượt quá 9999');
            return;
        }

        // Kiểm tra sản phẩm hết hàng
        if (record.isOutOfStock) {
            message.error('Sản phẩm đã hết hàng, không thể cập nhật số lượng');
            return;
        }

        // Kiểm tra số lượng trong kho (sử dụng availableStock từ server)
        const availableStock = record.availableStock || record.product.stock;
        if (Number(value) > availableStock) {
            message.error(`Số lượng sản phẩm không được vượt quá ${availableStock} sản phẩm có trong kho`);
            return;
        }

        // Tính tổng giá trị của toàn bộ giỏ hàng sau khi cập nhật
        let totalOtherProducts = 0;
        dataCart.forEach((item) => {
            if (item.product.id !== record.product.id) {
                totalOtherProducts += item.totalPrice;
            }
        });

        // Tính giá trị của sản phẩm đang cập nhật
        const newProductTotal = record.product.price * value;

        // Tổng giá trị toàn bộ giỏ hàng
        const newTotalPrice = totalOtherProducts + newProductTotal;

        const maxAllowedPrice = 1000000000; // 1 tỷ VNĐ

        if (newTotalPrice > maxAllowedPrice) {
            // Tính số lượng tối đa có thể đặt cho sản phẩm này
            const remainingBudget = maxAllowedPrice - totalOtherProducts;
            const maxQuantity = Math.floor(remainingBudget / record.product.price);

            message.error(
                `Tổng giá trị giỏ hàng ${newTotalPrice.toLocaleString(
                    'vi-VN',
                )} VNĐ vượt quá giới hạn cho phép (1,000,000,000 VNĐ). ` +
                    `Số lượng tối đa cho sản phẩm này: ${Math.max(0, maxQuantity)}`,
            );

            // Reset về số lượng hiện tại
            await fetchCart();
            return;
        }

        try {
            const data = {
                productId: record.product.id,
                quantity: Number(value),
            };

            await requestUpdateQuantityCart(data);
            await fetchCart();
            message.success(`Đã cập nhật số lượng thành ${value}`);
        } catch (error) {
            console.error('Error updating quantity:', error);
            // Reset lại giá trị cũ khi có lỗi
            await fetchCart();

            if (error.response && error.response.data && error.response.data.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Không thể cập nhật số lượng. Vui lòng thử lại!');
            }
        }
    };

    const columns = [
        {
            title: 'Sản phẩm',
            dataIndex: ['product', 'name'],
            key: 'name',
            render: (text, record) => (
                <Space>
                    <img
                        src={record.product.images.split(',')[0]}
                        alt={text}
                        className={cx('product-image', {
                            'out-of-stock': record.isOutOfStock || record.isInsufficientStock,
                        })}
                        style={{
                            filter:
                                record.isOutOfStock || record.isInsufficientStock
                                    ? 'grayscale(100%) opacity(0.5)'
                                    : 'none',
                        }}
                    />
                    <div>
                        <span
                            className={cx('product-title', {
                                'out-of-stock': record.isOutOfStock || record.isInsufficientStock,
                            })}
                            style={{
                                color: record.isOutOfStock || record.isInsufficientStock ? '#999' : 'inherit',
                                textDecoration: record.isOutOfStock ? 'line-through' : 'none',
                            }}
                        >
                            {text}
                        </span>
                        {record.isOutOfStock && (
                            <div style={{ color: '#ff4d4f', fontSize: '12px', fontWeight: 'bold' }}>
                                ❌ Sản phẩm đã hết hàng
                            </div>
                        )}
                        {!record.isOutOfStock && record.isInsufficientStock && (
                            <div style={{ color: '#faad14', fontSize: '12px', fontWeight: 'bold' }}>
                                ⚠️ Chỉ còn {record.availableStock} sản phẩm trong kho
                            </div>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Đơn giá',
            dataIndex: ['product'],
            key: 'price',
            render: (product) => (
                <div className={cx('price-container')}>
                    {product.discount > 0 ? (
                        <>
                            <div className={cx('price-original')}>
                                {(product.price / (1 - product.discount / 100))?.toLocaleString()} đ
                            </div>
                            <div className={cx('price-sale')}>{product.price?.toLocaleString()} đ</div>
                        </>
                    ) : (
                        <div className={cx('price-normal')}>{product.price?.toLocaleString()} đ</div>
                    )}
                </div>
            ),
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (quantity, record) => (
                <InputNumber
                    onChange={(value) => handleChangeQuantity(record, value)}
                    value={quantity}
                    min={1}
                    max={(() => {
                        // Sử dụng availableStock từ server thay vì stock cũ
                        const stock = record.availableStock || record.product.stock;
                        const price = record.product.price;

                        // Tính tổng giá trị các sản phẩm khác
                        let totalOtherProducts = 0;
                        dataCart.forEach((item) => {
                            if (item.product.id !== record.product.id) {
                                totalOtherProducts += item.totalPrice;
                            }
                        });

                        const remainingBudget = 1000000000 - totalOtherProducts; // 1 tỷ VNĐ
                        const maxByPrice = price > 0 ? Math.floor(remainingBudget / price) : 9999;

                        return Math.min(stock, maxByPrice, 9999);
                    })()}
                    precision={0}
                    controls={true}
                    disabled={record.isOutOfStock}
                    className={cx('quantity-input', {
                        disabled: record.isOutOfStock,
                    })}
                    style={{
                        opacity: record.isOutOfStock ? 0.5 : 1,
                    }}
                />
            ),
        },
        {
            title: 'Thành tiền',
            dataIndex: 'totalPrice',
            key: 'total',
            render: (totalPrice) => <div className={cx('total-price-display')}>{totalPrice?.toLocaleString()} đ</div>,
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (record) => (
                <Button
                    onClick={() => handleDeleteCart(record.id)}
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    className={cx('delete-button')}
                />
            ),
        },
    ];

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState(null);
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (dataUser) {
            setFullName(dataUser.fullName);
            setPhone(dataUser.phone);
            setAddress(dataUser.address);
        }
    }, [dataUser]);

    useEffect(() => {
        const fetchData = async () => {
            // Chỉ gọi API khi user đã đăng nhập và có đầy đủ thông tin
            if (!dataUser?.id || !fullName || !phone || !address) {
                return;
            }

            try {
                const data = {
                    fullName,
                    phone,
                    address,
                };

                await requestUpdateInfoCart(data);
            } catch (error) {
                // Silent error để không làm phiền user khi auto-update
                console.log('Auto-update cart info failed:', error);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchData();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [fullName, phone, address, dataUser?.id]);

    const handlePayment = async (typePayment) => {
        if (!checkBox) {
            message.error('Bạn phải đồng ý với các Điều kiện giao dịch chung của website');
            return;
        }
        if (!fullName || !phone || !address) {
            message.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        // Kiểm tra giới hạn tổng tiền trước khi thanh toán
        if (totalPrice > 1000000000) {
            message.error(
                `Tổng giá trị đơn hàng ${totalPrice.toLocaleString(
                    'vi-VN',
                )} VNĐ vượt quá giới hạn cho phép (1,000,000,000 VNĐ). Vui lòng giảm số lượng sản phẩm.`,
            );
            return;
        }

        try {
            const data = {
                typePayment,
            };
            if (typePayment === 'COD') {
                const res = await requestPayment(data);
                message.success('Đặt hàng thành công');
                await fetchCart();
                navigate(`/payment/${res.metadata}`);
            }
            if (typePayment === 'MOMO') {
                const res = await requestPayment(data);
                window.open(res.metadata.payUrl, '_blank');
            }
            if (typePayment === 'VNPAY') {
                const res = await requestPayment(data);
                window.open(res.metadata, '_blank');
            }
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('container')}>
                    <Table dataSource={dataCart} columns={columns} pagination={false} />
                    {dataCart.length > 0 && (
                        <div className={cx('checkout-section')}>
                            <Card title="THÔNG TIN NGƯỜI MUA" style={{ marginBottom: 16 }}>
                                <Form layout="vertical">
                                    <Form.Item label="Họ tên" required>
                                        <Input
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Nhập họ và tên đầy đủ"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Số điện thoại"
                                        required
                                        validateTrigger={['onChange', 'onBlur']}
                                        rules={[
                                            {
                                                pattern: /^0\d{9}$/,
                                                message: 'SĐT phải bắt đầu bằng số 0 và có đúng 10 số',
                                            },
                                            {
                                                required: true,
                                                message: 'SĐT không được để trống',
                                            },
                                        ]}
                                        className="phone-input"
                                    >
                                        <Input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            maxLength={10}
                                            placeholder="0xxx xxx xxx"
                                            prefix={<PhoneOutlined style={{ color: '#bbb' }} />}
                                        />
                                    </Form.Item>

                                    <Form.Item label="Địa chỉ" required className="address-input">
                                        <Input
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Nhập địa chỉ chi tiết (số nhà, đường, phường/xã, quận/huyện, tỉnh/thành)"
                                            prefix={<EnvironmentOutlined style={{ color: '#bbb' }} />}
                                        />
                                    </Form.Item>

                                    <Form.Item label="Ghi chú">
                                        <Input.TextArea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Ghi chú thêm về đơn hàng (tùy chọn)"
                                            rows={3}
                                        />
                                    </Form.Item>
                                </Form>
                            </Card>

                            <Card title="TỔNG TIỀN">
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div className={cx('total-section')}>
                                        <p>
                                            <span>Tổng cộng:</span>
                                            <span>{totalPrice.toLocaleString()} đ</span>
                                        </p>
                                        <p>
                                            <span>Giảm giá Voucher:</span>
                                            <span>0 đ</span>
                                        </p>
                                        <p>
                                            <span>Thành tiền:</span>
                                            <span style={{ color: totalPrice > 1000000000 ? '#ff4d4f' : '#ee4d2d' }}>
                                                {totalPrice.toLocaleString()} đ
                                            </span>
                                        </p>
                                        <p>(Giá đã bao gồm VAT)</p>
                                        {totalPrice > 1000000000 && (
                                            <div className={cx('warning-box')}>
                                                <p className={cx('warning-title')}>
                                                    ⚠️ Cảnh báo: Vượt quá giới hạn cho phép
                                                </p>
                                                <p className={cx('warning-message')}>
                                                    Tổng giá trị giỏ hàng không được vượt quá 1,000,000,000 VNĐ
                                                </p>
                                            </div>
                                        )}

                                        {/* Thông báo khi gần đạt giới hạn */}
                                        {totalPrice > 900000000 && totalPrice <= 1000000000 && (
                                            <div className={cx('info-box')}>
                                                <p className={cx('info-message')}>
                                                    💡 Lưu ý: Bạn đang gần đạt giới hạn cho phép (1 tỷ VNĐ)
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Checkbox onChange={(e) => setCheckBox(e.target.checked)}>
                                        Tôi đã đọc và đồng ý với các Điều kiện giao dịch chung của website
                                    </Checkbox>

                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button
                                            onClick={() => handlePayment('COD')}
                                            type="primary"
                                            block
                                            disabled={!checkBox || totalPrice > 1000000000}
                                        >
                                            Thanh toán khi nhận hàng
                                        </Button>
                                        <Button
                                            onClick={() => handlePayment('MOMO')}
                                            type="default"
                                            block
                                            disabled={!checkBox || totalPrice > 1000000000}
                                        >
                                            Thanh toán qua MOMO
                                        </Button>
                                        <Button
                                            onClick={() => handlePayment('VNPAY')}
                                            type="primary"
                                            block
                                            disabled={!checkBox || totalPrice > 1000000000}
                                        >
                                            Thanh toán qua VNPAY
                                        </Button>
                                    </Space>
                                </Space>
                            </Card>
                        </div>
                    )}
                </div>
            </main>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Cart;
