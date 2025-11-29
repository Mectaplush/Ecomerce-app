import {
    Button,
    Card,
    Row,
    Col,
    Typography,
    Modal,
    Table,
    Image,
    Tag,
    InputNumber,
    Input,
    Select,
    Space,
    message,
} from 'antd';
import { useState, useEffect } from 'react';
import Footer from '../../Components/Footer/Footer';
import classNames from 'classnames/bind';
import styles from './BuildPc.module.scss';
import Header from '../../Components/Header/Header';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import {
    requestAddToCartBuildPc,
    requestFindProductComponent,
    requestGetCartBuildPc,
    requestDeleteCartBuildPc,
    requestUpdateQuantityCartBuildPc,
    requestAddToCartBuildPcToCart,
    requestDeleteAllCartBuildPC,
} from '../../config/request';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';

const cx = classNames.bind(styles);
const { Title } = Typography;
const { Option } = Select;

function BuildPc() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentComponent, setCurrentComponent] = useState(null);
    const [selectedComponents, setSelectedComponents] = useState({});
    const [quantities, setQuantities] = useState({});
    const [componentProducts, setComponentProducts] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [sortOrder, setSortOrder] = useState(null);
    const [filteredProducts, setFilteredProducts] = useState([]);

    const [totalPrice, setTotalPrice] = useState(0);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);

    const fetchData = async () => {
        const res = await requestGetCartBuildPc();

        setTotalPrice(res.metadata.reduce((total, item) => total + item.totalPrice, 0));

        // Tạo object mới từ data cart để map theo componentType
        const componentMap = {};
        res.metadata.forEach((item) => {
            componentMap[item.componentType] = {
                ...item.product,
                quantity: item.quantity,
            };
        });
        setSelectedComponents(componentMap);

        // Set quantities
        const quantityMap = {};
        res.metadata.forEach((item) => {
            quantityMap[item.componentType] = item.quantity;
        });
        setQuantities(quantityMap);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (currentComponent) {
            fetchComponentProducts(currentComponent.type);
        }
    }, [currentComponent]);

    useEffect(() => {
        // Apply search and sorting to products
        let result = [...componentProducts];

        // Apply search
        if (searchText) {
            result = result.filter((product) => product.name.toLowerCase().includes(searchText.toLowerCase()));
        }

        // Apply sorting
        if (sortOrder === 'ascend') {
            result = result.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'descend') {
            result = result.sort((a, b) => b.price - a.price);
        }

        setFilteredProducts(result);
    }, [componentProducts, searchText, sortOrder]);

    const fetchComponentProducts = async (componentType) => {
        try {
            const response = await requestFindProductComponent(componentType);
            setComponentProducts(response.metadata);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'images',
            key: 'images',
            width: 100,
            render: (images) => <img src={images?.split(',')[0]} width={100} />,
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
        },

        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            sorter: true,
            sortOrder: sortOrder,
            render: (price) => price.toLocaleString() + ' đ',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Button type="primary" onClick={() => handleSelectProduct(record)}>
                    Chọn
                </Button>
            ),
        },
    ];

    const pcComponents = [
        { id: 1, name: 'CPU', buttonText: 'Chọn CPU', type: 'cpu' },
        { id: 2, name: 'Mainboard', buttonText: 'Chọn Mainboard', type: 'mainboard' },
        { id: 3, name: 'RAM', buttonText: 'Chọn RAM', type: 'ram' },
        { id: 4, name: 'HDD', buttonText: 'Chọn HDD', type: 'hdd' },
        { id: 5, name: 'SSD', buttonText: 'Chọn SSD', type: 'ssd' },
        { id: 6, name: 'VGA', buttonText: 'Chọn VGA', type: 'vga' },
        { id: 7, name: 'Nguồn', buttonText: 'Chọn Nguồn', type: 'power' },
        { id: 8, name: 'Tản nhiệt', buttonText: 'Chọn Tản nhiệt', type: 'cooler' },
        { id: 9, name: 'Vỏ Case', buttonText: 'Chọn Vỏ Case', type: 'case' },
        { id: 10, name: 'Màn Hình', buttonText: 'Chọn Màn Hình', type: 'monitor' },
        { id: 11, name: 'Bàn Phím', buttonText: 'Chọn Bàn Phím', type: 'keyboard' },
        { id: 12, name: 'Chuột', buttonText: 'Chọn Chuột', type: 'mouse' },
        { id: 13, name: 'Tai Nghe', buttonText: 'Chọn Tai Nghe', type: 'headset' },
    ];

    const handleOpenModal = (component) => {
        setCurrentComponent(component);
        setIsModalOpen(true);
        setSearchText('');
        setSortOrder(null);
    };

    const handleSelectProduct = async (product) => {
        setSelectedComponents(product);
        const data = {
            productId: product.id,
            quantity: 1,
        };
        await requestAddToCartBuildPc(data);
        await fetchData();
        setIsModalOpen(false);
    };

    const handleDelete = async (productId) => {
        try {
            // Gọi API xóa với productId
            const data = {
                productId,
            };
            await requestDeleteCartBuildPc(data);
            // Sau khi xóa thành công, cập nhật lại state

            await fetchData();
        } catch (error) {
            console.error('Error deleting component:', error);
        }
    };

    const handleQuantityChange = async (productId, value) => {
        // Kiểm tra giá trị hợp lệ trước khi cập nhật
        if (!value || value <= 0) {
            message.error('Số lượng không hợp lệ!');
            return;
        }

        // Lấy thông tin sản phẩm từ selectedComponents
        const component = Object.values(selectedComponents).find((item) => item.id === productId);

        // Kiểm tra số lượng không vượt quá stock
        if (component && value > component.stock) {
            message.warning(`Số lượng không thể vượt quá ${component.stock} sản phẩm có sẵn trong kho!`);
            return;
        }

        const data = {
            productId,
            quantity: value,
        };

        try {
            await requestUpdateQuantityCartBuildPc(data);
            await fetchData();
        } catch (error) {
            console.error('Error updating quantity:', error);
            message.error('Số lượng không vượt quá trong kho');
        }
    };

    const handleSearch = (value) => {
        setSearchText(value);
    };

    const handleSortChange = (value) => {
        setSortOrder(value);
    };

    const handleTableChange = (pagination, filters, sorter) => {
        if (sorter.order) {
            setSortOrder(sorter.order);
        } else {
            setSortOrder(null);
        }
    };

    const navigate = useNavigate();

    const { fetchCart } = useStore();

    const handleAddToCart = async () => {
        try {
            await requestAddToCartBuildPcToCart();
            await fetchData();
            await fetchCart();
            navigate('/cart');
            message.success('Thêm vào giỏ hàng thành công');
        } catch (error) {
            console.log(error);
        }
    };

    const openQuotation = () => {
        window.open('/quotation', '_blank');
    };

    const handleReset = async () => {
        try {
            await requestDeleteAllCartBuildPC();
            setSelectedComponents({});
            setQuantities({});
            setTotalPrice(0);
            setIsResetModalOpen(false);
            message.success('Đã làm mới cấu hình máy tính');
        } catch (error) {
            console.error('Error resetting PC build:', error);
            message.error('Không thể làm mới cấu hình');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <Card>
                    <Row justify="space-between" align="middle" className={cx('header')}>
                        <Title level={4}>XÂY DỰNG MÁY TÍNH</Title>
                        <Button type="primary" onClick={() => setIsResetModalOpen(true)}>
                            LÀM MỚI
                        </Button>
                    </Row>

                    <div className={cx('description')}>
                        Vui lòng chọn linh kiện bạn cần để xây dựng cấu hình máy tính riêng cho bạn
                    </div>

                    <div className={cx('components-list')}>
                        {pcComponents.map((component) => (
                            <Row key={component.id} className={cx('component-row')} align="middle">
                                <Col span={4}>
                                    {component.id}. {component.name}
                                </Col>
                                <Col span={16}>
                                    {selectedComponents[component.type] ? (
                                        <Row align="middle" className={cx('selected-product')}>
                                            <Col span={4}>
                                                <Image
                                                    src={selectedComponents[component.type].images?.split(',')[0]}
                                                    width={80}
                                                />
                                            </Col>
                                            <Col span={20}>
                                                <div className={cx('product-info')}>
                                                    <div className={cx('product-name')}>
                                                        {selectedComponents[component.type].name}
                                                    </div>
                                                    <div className={cx('product-name')}>
                                                        {selectedComponents[component.type].price.toLocaleString()} VNĐ
                                                    </div>
                                                    <div className={cx('stock-status')}>
                                                        Kho hàng: {selectedComponents[component.type].stock}
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    ) : null}
                                </Col>
                                <Col span={4} className={cx('actions')}>
                                    {selectedComponents[component.type] ? (
                                        <Row gutter={8}>
                                            <Col>
                                                <InputNumber
                                                    min={1}
                                                    value={quantities[component.type]}
                                                    max={selectedComponents[component.type].stock}
                                                    precision={0}
                                                    parser={(value) => {
                                                        const parsed = parseInt(value, 10);
                                                        if (isNaN(parsed)) return 1;
                                                        return Math.min(
                                                            parsed,
                                                            selectedComponents[component.type].stock,
                                                        );
                                                    }}
                                                    formatter={(value) => {
                                                        if (value > selectedComponents[component.type].stock) {
                                                            return selectedComponents[component.type].stock.toString();
                                                        }
                                                        return value.toString();
                                                    }}
                                                    onChange={(value) => {
                                                        // Đảm bảo giá trị không vượt quá stock
                                                        const validValue = Math.min(
                                                            value || 1,
                                                            selectedComponents[component.type].stock,
                                                        );

                                                        handleQuantityChange(
                                                            selectedComponents[component.type].id,
                                                            validValue,
                                                        );
                                                    }}
                                                    style={{ width: 70 }}
                                                />
                                            </Col>
                                            <Col>
                                                <Button
                                                    type="link"
                                                    danger
                                                    onClick={() =>
                                                        handleDelete(
                                                            selectedComponents[component.type].id,
                                                            component.type,
                                                        )
                                                    }
                                                >
                                                    <DeleteOutlined />
                                                </Button>
                                            </Col>
                                        </Row>
                                    ) : (
                                        <Button type="primary" onClick={() => handleOpenModal(component)}>
                                            {component.buttonText}
                                        </Button>
                                    )}
                                </Col>
                            </Row>
                        ))}
                    </div>

                    <Row justify="end" className={cx('total-price')}>
                        <Typography.Text className={cx('total-text')}>
                            Chi phí dự tính: {totalPrice.toLocaleString()} đ
                        </Typography.Text>
                    </Row>

                    <Row justify="end" gutter={16} className={cx('action-buttons')}>
                        <Col>
                            <Button onClick={openQuotation} style={{ marginRight: 10 }} type="primary">
                                Xem & In
                            </Button>
                            <Button onClick={handleAddToCart} type="primary">
                                THÊM VÀO GIỎ HÀNG
                            </Button>
                        </Col>
                    </Row>
                </Card>

                <Modal
                    title={`Chọn ${currentComponent?.name}`}
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    width={1000}
                    footer={null}
                >
                    <Space style={{ marginBottom: 16 }}>
                        <Input
                            placeholder="Tìm kiếm sản phẩm"
                            prefix={<SearchOutlined />}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{ width: 300 }}
                        />
                        <Select
                            placeholder="Sắp xếp theo giá"
                            style={{ width: 150 }}
                            onChange={handleSortChange}
                            value={sortOrder}
                        >
                            <Option value="ascend">Giá từ thấp đến cao</Option>
                            <Option value="descend">Giá từ cao đến thấp</Option>
                            <Option value={null}>Mặc định</Option>
                        </Select>
                    </Space>
                    <Table
                        columns={columns}
                        dataSource={filteredProducts.length > 0 ? filteredProducts : componentProducts}
                        pagination={false}
                        onChange={handleTableChange}
                    />
                </Modal>

                <Modal
                    title="LÀM MỚI"
                    open={isResetModalOpen}
                    onCancel={() => setIsResetModalOpen(false)}
                    footer={[
                        <Button key="cancel" onClick={() => setIsResetModalOpen(false)}>
                            HỦY
                        </Button>,
                        <Button key="confirm" type="primary" onClick={handleReset}>
                            XÁC NHẬN
                        </Button>,
                    ]}
                >
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
                            <span style={{ color: '#1890ff', marginRight: '10px' }}>⚠️</span>
                        </div>
                        <p>Cảnh báo: Toàn bộ linh kiện của bộ PC hiện tại sẽ bị xóa đi</p>
                    </div>
                </Modal>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default BuildPc;
