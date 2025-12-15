import {
    Table,
    Tag,
    Space,
    Typography,
    Image,
    Button,
    Popconfirm,
    message,
    Modal,
    Rate,
    Input,
    Form,
    Select,
} from 'antd';
import styles from './ManagerOrder.module.scss';
import classNames from 'classnames/bind';
import { useEffect, useState } from 'react';
import {
    requestCancelOrder,
    requestCreateProductPreview,
    requestGetPayments,
    requestGetProductPreviewUser,
} from '../../../../config/request';
import { Link } from 'react-router-dom';
const { Text } = Typography;
const { TextArea } = Input;
import dayjs from 'dayjs';

const cx = classNames.bind(styles);

function ManagerOrder() {
    const [orders, setOrders] = useState([]);
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [currentOrderProducts, setCurrentOrderProducts] = useState([]);
    const [ratingTargetProductId, setRatingTargetProductId] = useState(null);
    const [form] = Form.useForm();
    const [productPreview, setProductPreview] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const fetchData = async () => {
        const res = await requestGetPayments();
        setOrders(res.metadata);
    };

    const fetchProductPreview = async () => {
        const res = await requestGetProductPreviewUser();
        setProductPreview(res.metadata);
    };

    useEffect(() => {
        fetchData();
        fetchProductPreview();
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleCancelOrder = async (orderId) => {
        try {
            const data = {
                orderId: orderId,
            };

            await requestCancelOrder(data);
            await fetchData();
            message.success('Hủy đơn hàng thành công');
        } catch (error) {
            message.error('Không thể hủy đơn hàng');
        }
    };

    const showRatingModal = async (products) => {
        // products: array of items in order
        setCurrentOrderProducts(products);
        // preselect first unrated product if any, otherwise first
        const previews = productPreview;
        const unrated = products.find((p) => !previews.some((preview) => preview.productId === p.product.id));
        const defaultTargetId = unrated ? unrated.product.id : products[0]?.product.id ?? null;
        setRatingTargetProductId(defaultTargetId);
        setCurrentProduct(unrated || products[0] || null);
        setIsRatingModalOpen(true);
        form.resetFields();
    };

    const handleRatingOk = () => {
        form.validateFields().then(async (values) => {
            try {
                const targetId = ratingTargetProductId || currentProduct?.product?.id;
                if (!targetId) {
                    message.error('Vui lòng chọn sản phẩm để đánh giá');
                    return;
                }
                const data = {
                    productId: targetId,
                    rating: values.rating,
                    content: values.content,
                };
                await requestCreateProductPreview(data);
                message.success('Đánh giá sản phẩm thành công');
                setIsRatingModalOpen(false);
                form.resetFields();
                // refresh previews so next time shows correct unrated list
                await fetchProductPreview();
            } catch (error) {
                message.error('Không thể đánh giá sản phẩm');
            }
        });
    };

    const handleRatingCancel = () => {
        setIsRatingModalOpen(false);
    };

    const renderProductsDesktop = (products) => (
        <div className={cx('product-display')}>
            {products.map((item, index) => (
                <div key={index} className={cx('product-item')}>
                    <Image
                        src={item.images.split(',')[0]}
                        width={40}
                        height={40}
                        style={{ objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                        preview={false}
                    />
                    <div className={cx('product-details')}>
                        <div className={cx('product-name')} title={item.product.name}>
                            {item.product.name}
                        </div>
                        <div className={cx('product-quantity')}>SL: {item.quantity}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderProductsMobile = (products) => (
        <div className={cx('product-display')}>
            {products.map((item, index) => (
                <div key={index} className={cx('product-item')}>
                    <Image
                        src={item.images.split(',')[0]}
                        width={30}
                        height={30}
                        style={{ objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                        preview={false}
                    />
                    <div className={cx('product-details')}>
                        <div className={cx('product-name')} title={item.product.name}>
                            {item.product.name}
                        </div>
                        <div className={cx('product-quantity')}>SL: {item.quantity}</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const getColumnWidth = (columnIndex) => {
        if (window.innerWidth <= 480) {
            // Extra small mobile - chỉ hiển thị 4 cột
            switch (columnIndex) {
                case 1:
                    return 80; // Mã đơn - fixed width
                case 3:
                    return 180; // Sản phẩm
                case 5:
                    return 60; // Trạng thái
                case 7:
                    return 70; // Thao tác
                default:
                    return 'auto';
            }
        } else if (window.innerWidth <= 768) {
            // Mobile - hiển thị 5 cột
            switch (columnIndex) {
                case 1:
                    return 90; // Mã đơn
                case 3:
                    return 200; // Sản phẩm
                case 4:
                    return 80; // Tổng tiền
                case 5:
                    return 70; // Trạng thái
                case 7:
                    return 80; // Thao tác
                default:
                    return 'auto';
            }
        } else {
            // Desktop - hiển thị tất cả
            switch (columnIndex) {
                case 1:
                    return 100; // Mã đơn
                case 2:
                    return 120; // Ngày mua
                case 3:
                    return 300; // Sản phẩm
                case 4:
                    return 130; // Tổng tiền
                case 5:
                    return 100; // Trạng thái
                case 6:
                    return 100; // Thanh toán
                case 7:
                    return 120; // Thao tác
                default:
                    return 'auto';
            }
        }
    };

    const columns = [
        {
            title: 'Mã đơn',
            dataIndex: 'orderId',
            key: 'orderId',
            width: isMobile ? (window.innerWidth <= 480 ? 80 : 90) : 130, // Tăng từ 110 lên 130
            render: (text) => (
                <Text strong style={{ fontSize: isMobile ? '10px' : '14px', wordBreak: 'break-all' }}>
                    #{text}
                </Text>
            ),
        },
        {
            title: 'Ngày mua',
            dataIndex: 'orderDate',
            key: 'orderDate',
            width: isMobile ? 70 : 100, // Tăng từ 90 lên 100
            render: (date) => (
                <span style={{ fontSize: isMobile ? '10px' : '14px' }}>
                    {dayjs(date).format(isMobile ? 'DD/MM' : 'HH:mm DD/MM/YY')}
                </span>
            ),
        },
        {
            title: 'Sản phẩm',
            dataIndex: 'products',
            key: 'products',
            width: isMobile ? (window.innerWidth <= 480 ? 180 : 220) : 270, // Giảm từ 280 xuống 270 để cân bằng
            render: (products) => (isMobile ? renderProductsMobile(products) : renderProductsDesktop(products)),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            width: isMobile ? 85 : 120, // Tăng từ 110 lên 120
            render: (amount) => (
                <Text strong type="danger" style={{ fontSize: isMobile ? '9px' : '14px' }}>
                    {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND',
                    }).format(amount)}
                </Text>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: isMobile ? 70 : 95, // Tăng từ 90 lên 95
            render: (status) => {
                let color = 'blue';
                let title = '';
                switch (status.toLowerCase()) {
                    case 'pending':
                        color = 'gold';
                        title = isMobile ? 'Chờ' : 'Đang chờ';
                        break;
                    case 'completed':
                        color = 'green';
                        title = isMobile ? 'Xong' : 'Hoàn thành';
                        break;
                    case 'cancelled':
                        color = 'red';
                        title = isMobile ? 'Hủy' : 'Đã hủy';
                        break;
                    case 'delivered':
                        color = 'purple';
                        title = isMobile ? 'Giao' : 'Đã giao';
                        break;
                    default:
                        color = 'blue';
                }
                return (
                    <Tag
                        color={color}
                        style={{
                            fontSize: isMobile ? '9px' : '12px',
                            padding: '2px 6px',
                            margin: 0,
                            borderRadius: '4px',
                            fontWeight: '500',
                        }}
                    >
                        {title}
                    </Tag>
                );
            },
        },
        {
            title: 'Thanh toán',
            dataIndex: 'typePayment',
            key: 'typePayment',
            width: isMobile ? 70 : 95, // Tăng từ 90 lên 95
            render: (type) => (
                <Tag
                    color="blue"
                    style={{
                        fontSize: isMobile ? '9px' : '12px',
                        padding: '2px 6px',
                        margin: 0,
                        borderRadius: '4px',
                        fontWeight: '500',
                    }}
                >
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: isMobile ? 80 : 110,
            render: (_, record) => {
                if (record.status.toLowerCase() === 'pending') {
                    // Kiểm tra nếu là thanh toán online (MOMO/VNPAY) thì không cho hủy
                    const isOnlinePayment = record.typePayment === 'MOMO' || record.typePayment === 'VNPAY';

                    if (isOnlinePayment) {
                        return (
                            <Button
                                type="primary"
                                danger
                                size="small"
                                disabled
                                style={{
                                    fontSize: isMobile ? '9px' : '12px',
                                    height: isMobile ? '24px' : '28px',
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    padding: '0 8px',
                                    opacity: 0.5,
                                    cursor: 'not-allowed',
                                }}
                                title="Không thể hủy đơn hàng đã thanh toán online"
                            >
                                Hủy
                            </Button>
                        );
                    }

                    return (
                        <Popconfirm
                            title="Hủy đơn hàng"
                            description="Bạn có chắc chắn muốn hủy đơn hàng này?"
                            onConfirm={() => handleCancelOrder(record.orderId)}
                            okText="Đồng ý"
                            cancelText="Hủy"
                        >
                            <Button
                                type="primary"
                                danger
                                size="small"
                                style={{
                                    fontSize: isMobile ? '9px' : '12px',
                                    height: isMobile ? '24px' : '28px',
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    padding: '0 8px',
                                }}
                            >
                                Hủy
                            </Button>
                        </Popconfirm>
                    );
                } else if (record.status.toLowerCase() === 'delivered') {
                    const allRated = record.products.every((product) =>
                        productPreview.some((preview) => preview.productId === product.product.id),
                    );

                    if (allRated) {
                        return (
                            <Tag
                                color="green"
                                style={{
                                    fontSize: isMobile ? '9px' : '11px',
                                    padding: '2px 6px',
                                    margin: 0,
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                }}
                            >
                                Đã đánh giá
                            </Tag>
                        );
                    } else {
                        return (
                            <Button
                                type="primary"
                                size="small"
                                onClick={() => showRatingModal(record.products)}
                                style={{
                                    fontSize: isMobile ? '9px' : '12px',
                                    height: isMobile ? '24px' : '28px',
                                    borderRadius: '4px',
                                    fontWeight: '500',
                                    padding: '0 8px',
                                }}
                            >
                                Đánh giá
                            </Button>
                        );
                    }
                } else if (record.status.toLowerCase() === 'cancelled') {
                    return (
                        <Tag
                            color="red"
                            style={{
                                fontSize: isMobile ? '9px' : '12px',
                                padding: '2px 6px',
                                margin: 0,
                                borderRadius: '4px',
                                fontWeight: '500',
                            }}
                        >
                            Đã hủy
                        </Tag>
                    );
                } else {
                    return <span style={{ fontSize: isMobile ? '9px' : '12px', color: '#999' }}>-</span>;
                }
            },
        },
    ];

    return (
        <div className={cx('manager-order')}>
            <h1>Đơn hàng của tôi</h1>
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="orderId"
                pagination={{
                    pageSize: isMobile ? 5 : 6,
                    showSizeChanger: false,
                    showQuickJumper: !isMobile,
                    showTotal: (total, range) =>
                        isMobile ? `${range[0]}-${range[1]}/${total}` : `${range[0]}-${range[1]} của ${total} đơn hàng`,
                    size: 'small',
                }}
                scroll={{
                    x: window.innerWidth <= 480 ? 380 : window.innerWidth <= 768 ? 480 : 820, // Tăng từ 760 lên 820
                }}
                size="small"
                bordered={false}
                tableLayout="fixed"
            />

            <Modal
                title="Đánh giá sản phẩm"
                open={isRatingModalOpen}
                onOk={handleRatingOk}
                onCancel={handleRatingCancel}
                okText="Gửi đánh giá"
                cancelText="Hủy"
                width={isMobile ? '90%' : 500}
            >
                {isRatingModalOpen && (
                    <div className={cx('rating-container')}>
                        {/* Product selector */}
                        <Form form={form} layout="vertical">
                            <Form.Item label={<Text strong>Chọn sản phẩm</Text>} required>
                                <Select
                                    value={ratingTargetProductId}
                                    onChange={(val) => {
                                        setRatingTargetProductId(val);
                                        const selected = currentOrderProducts.find((p) => p.product.id === val);
                                        setCurrentProduct(selected || null);
                                    }}
                                    placeholder="Chọn sản phẩm để đánh giá"
                                    options={currentOrderProducts.map((p) => ({
                                        label: p.product.name,
                                        value: p.product.id,
                                    }))}
                                />
                            </Form.Item>

                            {currentProduct && (
                                <div className={cx('product-info')}>
                                    <Image
                                        src={currentProduct.images.split(',')[0]}
                                        width={isMobile ? 60 : 80}
                                        height={isMobile ? 60 : 80}
                                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                                    />
                                    <div>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: isMobile ? '14px' : '16px',
                                                display: 'block',
                                                marginBottom: '4px',
                                            }}
                                        >
                                            {currentProduct.product.name}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
                                            Số lượng: {currentProduct.quantity}
                                        </Text>
                                    </div>
                                </div>
                            )}

                            <Form.Item
                                name="rating"
                                label={<Text strong>Đánh giá sao</Text>}
                                rules={[{ required: true, message: 'Vui lòng đánh giá sao' }]}
                            >
                                <Rate allowHalf style={{ fontSize: isMobile ? '24px' : '32px' }} />
                            </Form.Item>

                            <Form.Item
                                name="content"
                                label={<Text strong>Nội dung đánh giá</Text>}
                                rules={[{ required: true, message: 'Vui lòng nhập nội dung đánh giá' }]}
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm"
                                    style={{ resize: 'none' }}
                                />
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default ManagerOrder;
