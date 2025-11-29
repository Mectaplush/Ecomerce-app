import React, { useState, useEffect } from 'react';
import { Result, Button, Card, Descriptions, Tag, Divider, Spin } from 'antd';
import { CheckCircleOutlined, ShoppingCartOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import styles from './PaymentSuccess.module.scss';
import classNames from 'classnames/bind';
import { requestGetProductByIdPayment } from '../../config/request';
import Header from '../../Components/Header/Header';

const cx = classNames.bind(styles);

function PaymentSuccess() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [orderData, setOrderData] = useState(null);

    const fetchData = async () => {
        try {
            const res = await requestGetProductByIdPayment(id);
            if (res.metadata) {
                setOrderData(res.metadata);
            }
        } catch (error) {
            console.error('Error fetching payment data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const getPaymentTypeText = (type) => {
        const types = {
            COD: 'Thanh toán khi nhận hàng',
            MOMO: 'Ví MoMo',
            VNPAY: 'VNPay',
        };
        return types[type] || type;
    };

    if (!orderData)
        return (
            <div className={cx('loading-wrapper')}>
                <Spin size="large" />
            </div>
        );

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <div className={cx('content')}>
                <Result
                    icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: '72px' }} />}
                    status="success"
                    title={<span style={{ fontSize: '24px', color: '#52c41a' }}>Đặt hàng thành công!</span>}
                    subTitle={
                        <span style={{ fontSize: '16px', color: '#8c8c8c' }}>
                            Mã đơn hàng: <strong>{id}</strong>
                        </span>
                    }
                />

                <Card
                    className={cx('order-card')}
                    bordered={false}
                    style={{
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        marginBottom: '24px',
                    }}
                >
                    <h2
                        style={{
                            borderBottom: '1px solid #f0f0f0',
                            paddingBottom: '12px',
                            marginBottom: '20px',
                            color: '#262626',
                        }}
                    >
                        Thông tin đơn hàng
                    </h2>

                    <div className={cx('order-info')}>
                        <div className={cx('info-item')}>
                            <span className={cx('label')}>Người nhận:</span>
                            <span className={cx('value')}>{orderData.fullName}</span>
                        </div>
                        <div className={cx('info-item')}>
                            <span className={cx('label')}>Số điện thoại:</span>
                            <span className={cx('value')}>{orderData.phone}</span>
                        </div>
                        <div className={cx('info-item')}>
                            <span className={cx('label')}>Địa chỉ:</span>
                            <span className={cx('value')}>{orderData.address}</span>
                        </div>
                        <div className={cx('info-item')}>
                            <span className={cx('label')}>Phương thức thanh toán:</span>
                            <Tag color="blue">{getPaymentTypeText(orderData.typePayment)}</Tag>
                        </div>
                    </div>
                </Card>

                <Card
                    className={cx('products-card')}
                    bordered={false}
                    style={{
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                    }}
                >
                    <h2
                        style={{
                            borderBottom: '1px solid #f0f0f0',
                            paddingBottom: '12px',
                            marginBottom: '20px',
                            color: '#262626',
                        }}
                    >
                        Chi tiết sản phẩm
                    </h2>

                    {orderData.products.map((product, index) => (
                        <div key={product.productId} className={cx('product-item')}>
                            <div className={cx('product-info')}>
                                <img
                                    src={product.images.split(',')[0]}
                                    alt={product.name}
                                    className={cx('product-image')}
                                />
                                <div className={cx('product-details')}>
                                    <h3>{product.name}</h3>
                                    <p>Số lượng: {product.quantity}</p>
                                </div>
                            </div>
                            {index < orderData.products.length - 1 && <Divider style={{ margin: '12px 0' }} />}
                        </div>
                    ))}

                    <div className={cx('total-price')}>
                        <span>Tổng tiền:</span>
                        <span className={cx('price')}>{orderData.totalPrice?.toLocaleString('vi-VN')}đ</span>
                    </div>
                </Card>

                <div className={cx('action-buttons')}>
                    <Button type="primary" icon={<HomeOutlined />} size="large" onClick={() => navigate('/')}>
                        Về trang chủ
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default PaymentSuccess;
