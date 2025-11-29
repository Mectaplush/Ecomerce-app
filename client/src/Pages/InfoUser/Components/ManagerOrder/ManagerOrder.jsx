import { Table, Tag, Space, Typography, Image, Button, Popconfirm, message, Modal, Rate, Input, Form } from 'antd';
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
    const [form] = Form.useForm();
    const [productPreview, setProductPreview] = useState([]);

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

    const showRatingModal = async (product) => {
        setCurrentProduct(product);
        setIsRatingModalOpen(true);
        form.resetFields();
    };

    const handleRatingOk = () => {
        form.validateFields().then(async (values) => {
            try {
                console.log(currentProduct.product.id);

                // TODO: Implement API call to submit rating
                const data = {
                    productId: currentProduct.product.id,
                    rating: values.rating,
                    content: values.content,
                };
                await requestCreateProductPreview(data);
                message.success('Đánh giá sản phẩm thành công');
                setIsRatingModalOpen(false);
                form.resetFields();
            } catch (error) {
                message.error('Không thể đánh giá sản phẩm');
            }
        });
    };

    const handleRatingCancel = () => {
        setIsRatingModalOpen(false);
    };

    const columns = [
        {
            title: 'Mã đơn hàng',
            dataIndex: 'orderId',
            key: 'orderId',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: 'Ngày mua',
            dataIndex: 'orderDate',
            key: 'orderDate',
            render: (date) => dayjs(date).format('HH:mm DD/MM/YYYY'),
        },
        {
            title: 'Sản phẩm',
            dataIndex: 'products',
            key: 'products',
            align: 'left',
            render: (products) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {products.map((item, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <Image
                                src={item.images.split(',')[0]}
                                width={50}
                                height={50}
                                style={{ objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                            />
                            <div style={{ textAlign: 'left' }}>
                                <div
                                    style={{
                                        fontWeight: 500,
                                        maxWidth: '300px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {item.product.name}
                                </div>
                                <div style={{ color: 'rgba(0, 0, 0, 0.45)', fontSize: '14px' }}>
                                    Số lượng: {item.quantity}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => (
                <Text strong type="danger">
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
            render: (status) => {
                let color = 'blue';
                let title = '';
                switch (status.toLowerCase()) {
                    case 'pending':
                        color = 'gold';
                        title = 'Đang chờ xác nhận';
                        break;
                    case 'completed':
                        color = 'green';
                        title = 'Đã hoàn thành';
                        break;
                    case 'cancelled':
                        color = 'red';
                        title = 'Đã hủy';
                        break;
                    case 'delivered':
                        color = 'purple';
                        title = 'Đã giao hàng';
                        break;
                    default:
                        color = 'blue';
                }
                return <Tag color={color}>{title}</Tag>;
            },
        },
        {
            title: 'Hình thức thanh toán',
            dataIndex: 'typePayment',
            key: 'typePayment',
            render: (type) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) =>
                record.status.toLowerCase() === 'pending' ? (
                    <Popconfirm
                        title="Hủy đơn hàng"
                        description="Bạn có chắc chắn muốn hủy đơn hàng này?"
                        onConfirm={() => handleCancelOrder(record.orderId)}
                        okText="Đồng ý"
                        cancelText="Hủy"
                    >
                        <Button type="primary" danger>
                            Hủy đơn
                        </Button>
                    </Popconfirm>
                ) : record.status.toLowerCase() === 'delivered' ? (
                    <Space direction="vertical" size={4} style={{ minWidth: '150px' }}>
                        {record.products.map((product, index) => (
                            <>
                                {productPreview.some((item) => item.productId === product.product.id) ? (
                                    <Tag color="green">Đã đánh giá</Tag>
                                ) : (
                                    <Button
                                        key={index}
                                        type="primary"
                                        danger
                                        onClick={() => showRatingModal(product)}
                                        style={{ width: '100%' }}
                                    >
                                        Đánh giá
                                    </Button>
                                )}
                            </>
                        ))}
                    </Space>
                ) : record.status.toLowerCase() === 'cancelled' ? (
                    <Tag color="red">Đã hủy</Tag>
                ) : null,
        },
    ];

    return (
        <div className={cx('manager-order')}>
            <h1>Đơn hàng của tôi</h1>
            <Table columns={columns} dataSource={orders} rowKey="orderId" pagination={{ pageSize: 5 }} />

            <Modal
                title="Đánh giá sản phẩm"
                open={isRatingModalOpen}
                onOk={handleRatingOk}
                onCancel={handleRatingCancel}
                okText="Gửi đánh giá"
                cancelText="Hủy"
                width={500}
            >
                {currentProduct && (
                    <div className={cx('rating-container')}>
                        <div className={cx('product-info')}>
                            <Image
                                src={currentProduct.images.split(',')[0]}
                                width={80}
                                height={80}
                                style={{ objectFit: 'cover', borderRadius: '4px' }}
                            />
                            <div>
                                <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>
                                    {currentProduct.product.name}
                                </Text>
                                <Text type="secondary">Số lượng: {currentProduct.quantity}</Text>
                            </div>
                        </div>

                        <Form form={form} layout="vertical">
                            <Form.Item
                                name="rating"
                                label={<Text strong>Đánh giá sao</Text>}
                                rules={[{ required: true, message: 'Vui lòng đánh giá sao' }]}
                            >
                                <Rate allowHalf style={{ fontSize: '32px' }} />
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
