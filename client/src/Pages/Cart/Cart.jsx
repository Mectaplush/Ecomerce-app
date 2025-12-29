import classNames from 'classnames/bind';
import styles from './Cart.module.scss';
import Header from '../../Components/Header/Header';
import AddressAutocomplete from '../../Components/AddressAutocomplete/AddressAutocomplete';
import { Card, Table, Input, Form, Button, Checkbox, Space, message, InputNumber, Spin } from 'antd';
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
import { calculateShippingFeeGHN } from '../../services/shippingAPI';

const cx = classNames.bind(styles);

function Cart() {
    const [checkBox, setCheckBox] = useState(false);

    const { fetchCart, dataCart, dataUser } = useStore();

    const navigate = useNavigate();

    // Calculate original total (before discount)
    const originalTotal = useMemo(() => {
        return dataCart.reduce((total, item) => {
            const originalPrice =
                item.product.discount > 0 ? item.product.price / (1 - item.product.discount / 100) : item.product.price;
            return total + originalPrice * item.quantity;
        }, 0);
    }, [dataCart]);

    // Calculate total after product discounts
    const totalPrice = useMemo(() => {
        return dataCart.reduce((total, item) => total + item.totalPrice, 0);
    }, [dataCart]);

    // Calculate total discount amount
    const totalDiscount = useMemo(() => {
        return originalTotal - totalPrice;
    }, [originalTotal, totalPrice]);

    // State for shipping fee
    const [shippingFee, setShippingFee] = useState(0);
    const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);

    // Calculate final amount (after discount + shipping)
    const finalAmount = useMemo(() => {
        return totalPrice + shippingFee;
    }, [totalPrice, shippingFee]);

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

    /**
     * Extract district and ward from Vietnamese address
     * Address format: Street, Ward, District, City
     * Example: "123 Đường ABC, Phường XYZ, Quận 1, TP Hồ Chí Minh"
     */
    const parseAddress = (addressString) => {
        if (!addressString) return { district: null, ward: null, province: null };

        const parts = addressString.split(',').map(s => s.trim());
        
        let district = null;
        let ward = null;
        let province = null;

        // Find district (Quận/Huyện/Thành phố/Thị xã)
        for (const part of parts) {
            if (part.match(/^(Quận|Huyện|Thành phố|Thị xã|TP)\s+/i)) {
                district = part;
            } else if (part.match(/^(Phường|Xã|Thị trấn|TT)\s+/i)) {
                ward = part;
            } else if (part.match(/^(Tỉnh|Thành phố)\s+/i) || 
                       part.match(/(Hà Nội|TP Hồ Chí Minh|Đà Nẵng|Hải Phòng|Cần Thơ)/i)) {
                province = part;
            }
        }

        return { district, ward, province };
    };

    /**
     * Get GHN District ID and Ward Code from address
     * Calls GHN master data API to convert location names to IDs
     */
    const getGHNLocationIds = async (addressString) => {
        const { district, ward, province } = parseAddress(addressString);
        
        if (!district || !ward) {
            console.warn('Cannot extract district/ward from address:', addressString);
            return { districtId: null, wardCode: null };
        }

        try {
            const GHN_TOKEN = import.meta.env.VITE_GHN_TOKEN;
            const GHN_SHOP_ID = import.meta.env.VITE_GHN_SHOP_ID;

            if (!GHN_TOKEN) {
                console.error('GHN_TOKEN not configured in environment variables');
                return { districtId: null, wardCode: null };
            }

            // Step 1: Get province ID
            const provinceResponse = await fetch(
                'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province',
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': GHN_TOKEN
                    }
                }
            );

            const provinceData = await provinceResponse.json();
            if (provinceData.code !== 200) {
                throw new Error('Failed to fetch provinces from GHN');
            }

            // Find matching province
            const normalizeText = (text) => {
                return text
                    .toLowerCase()
                    .replace(/^(tỉnh|thành phố|tp)\s+/i, '')
                    .trim();
            };

            const normalizedProvince = normalizeText(province || '');
            const matchedProvince = provinceData.data.find(p => 
                normalizeText(p.ProvinceName).includes(normalizedProvince) ||
                normalizedProvince.includes(normalizeText(p.ProvinceName))
            );

            if (!matchedProvince) {
                console.warn('Province not found in GHN:', province);
                return { districtId: null, wardCode: null };
            }

            // Step 2: Get districts for this province
            const districtResponse = await fetch(
                `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district?province_id=${matchedProvince.ProvinceID}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': GHN_TOKEN
                    }
                }
            );

            const districtData = await districtResponse.json();
            if (districtData.code !== 200) {
                throw new Error('Failed to fetch districts from GHN');
            }

            // Find matching district
            const normalizedDistrict = normalizeText(district);
            const matchedDistrict = districtData.data.find(d => 
                normalizeText(d.DistrictName).includes(normalizedDistrict) ||
                normalizedDistrict.includes(normalizeText(d.DistrictName))
            );

            if (!matchedDistrict) {
                console.warn('District not found in GHN:', district);
                return { districtId: null, wardCode: null };
            }

            // Step 3: Get wards for this district
            const wardResponse = await fetch(
                `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${matchedDistrict.DistrictID}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Token': GHN_TOKEN
                    }
                }
            );

            const wardData = await wardResponse.json();
            if (wardData.code !== 200) {
                throw new Error('Failed to fetch wards from GHN');
            }

            // Find matching ward
            const normalizedWard = normalizeText(ward);
            const matchedWard = wardData.data.find(w => 
                normalizeText(w.WardName).includes(normalizedWard) ||
                normalizedWard.includes(normalizeText(w.WardName))
            );

            if (!matchedWard) {
                console.warn('Ward not found in GHN:', ward);
                // Return district ID even if ward not found
                return { districtId: matchedDistrict.DistrictID, wardCode: null };
            }

            console.log('GHN Location matched:', {
                province: matchedProvince.ProvinceName,
                district: matchedDistrict.DistrictName,
                ward: matchedWard.WardName,
                districtId: matchedDistrict.DistrictID,
                wardCode: matchedWard.WardCode
            });

            return {
                districtId: matchedDistrict.DistrictID,
                wardCode: matchedWard.WardCode
            };

        } catch (error) {
            console.error('Error getting GHN location IDs:', error);
            return { districtId: null, wardCode: null };
        }
    };

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

    // Calculate shipping fee when address or cart changes
    useEffect(() => {
        const calculateShipping = async () => {
            if (!address || dataCart.length === 0) {
                setShippingFee(0);
                return;
            }

            setIsCalculatingShipping(true);
            try {
                // Calculate total weight (assume average 500g per product)
                const totalWeight = dataCart.reduce((sum, item) => sum + item.quantity * 500, 0);

                // Extract district ID and ward code from address
                const { districtId, wardCode } = await getGHNLocationIds(address);
                
                if (!districtId || !wardCode) {
                    // Fallback to default shipping fee if location cannot be determined
                    console.warn('Using default shipping fee - location not found');
                    setShippingFee(30000);
                    return;
                }
                
                const result = await calculateShippingFeeGHN(address, totalWeight, districtId, wardCode);
                setShippingFee(result.fee);

                if (result.freeShipping) {
                    message.success(result.message);
                }
            } catch (error) {
                console.error('Shipping calculation error:', error);
                // Set default shipping fee on error
                setShippingFee(30000);
            } finally {
                setIsCalculatingShipping(false);
            }
        };

        const timeoutId = setTimeout(() => {
            calculateShipping();
        }, 800); // Debounce shipping calculation

        return () => clearTimeout(timeoutId);
    }, [address, dataCart, totalPrice]);

    const handlePayment = async (typePayment) => {
        if (!checkBox) {
            message.error('Bạn phải đồng ý với các Điều kiện giao dịch chung của website');
            return;
        }
        if (!fullName || !phone || !address) {
            message.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        // Kiểm tra giới hạn tổng tiền trước khi thanh toán (including shipping)
        if (finalAmount > 1000000000) {
            message.error(
                `Tổng giá trị đơn hàng ${finalAmount.toLocaleString(
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

                                    <AddressAutocomplete value={address} onChange={setAddress} />

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
                                            <span>Tổng tiền hàng:</span>
                                            <span>{originalTotal.toLocaleString()} đ</span>
                                        </p>
                                        {totalDiscount > 0 && (
                                            <p>
                                                <span>Giảm giá sản phẩm:</span>
                                                <span style={{ color: '#52c41a' }}>
                                                    -{totalDiscount.toLocaleString()} đ
                                                </span>
                                            </p>
                                        )}
                                        <p>
                                            <span>Tạm tính:</span>
                                            <span>{totalPrice.toLocaleString()} đ</span>
                                        </p>
                                        <p>
                                            <span>
                                                Phí vận chuyển:
                                                {isCalculatingShipping && (
                                                    <Spin size="small" style={{ marginLeft: 8 }} />
                                                )}
                                            </span>
                                            <span>
                                                {shippingFee === 0 && address ? (
                                                    <span style={{ color: '#52c41a' }}>Miễn phí</span>
                                                ) : shippingFee > 0 ? (
                                                    `${shippingFee.toLocaleString()} đ`
                                                ) : (
                                                    <span style={{ color: '#999' }}>Nhập địa chỉ</span>
                                                )}
                                            </span>
                                        </p>
                                        <p>
                                            <span>Giảm giá Voucher:</span>
                                            <span>0 đ</span>
                                        </p>
                                        <div className={cx('divider')} />
                                        <p className={cx('final-amount')}>
                                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Thành tiền:</span>
                                            <span
                                                style={{
                                                    color: finalAmount > 1000000000 ? '#ff4d4f' : '#ee4d2d',
                                                    fontWeight: 'bold',
                                                    fontSize: '18px',
                                                }}
                                            >
                                                {finalAmount.toLocaleString()} đ
                                            </span>
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#999', marginTop: '-8px' }}>
                                            (Giá đã bao gồm VAT)
                                        </p>
                                        {finalAmount > 1000000000 && (
                                            <div className={cx('warning-box')}>
                                                <p className={cx('warning-title')}>
                                                    ⚠️ Cảnh báo: Vượt quá giới hạn cho phép
                                                </p>
                                                <p className={cx('warning-message')}>
                                                    Tổng giá trị đơn hàng không được vượt quá 1,000,000,000 VNĐ
                                                </p>
                                            </div>
                                        )}

                                        {/* Thông báo khi gần đạt giới hạn */}
                                        {finalAmount > 900000000 && finalAmount <= 1000000000 && (
                                            <div className={cx('info-box')}>
                                                <p className={cx('info-message')}>
                                                    💡 Lưu ý: Bạn đang gần đạt giới hạn cho phép (1 tỷ VNĐ)
                                                </p>
                                            </div>
                                        )}

                                        {/* Thông báo miễn phí vận chuyển */}
                                        {totalPrice >= 5000000 && (
                                            <div className={cx('success-box')}>
                                                <p className={cx('success-message')}>
                                                    🎉 Đơn hàng được miễn phí vận chuyển!
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
                                            disabled={!checkBox || finalAmount > 1000000000}
                                        >
                                            Thanh toán khi nhận hàng
                                        </Button>
                                        <Button
                                            onClick={() => handlePayment('MOMO')}
                                            type="default"
                                            block
                                            disabled={!checkBox || finalAmount > 1000000000}
                                        >
                                            Thanh toán qua MOMO
                                        </Button>
                                        <Button
                                            onClick={() => handlePayment('VNPAY')}
                                            type="primary"
                                            block
                                            disabled={!checkBox || finalAmount > 1000000000}
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
