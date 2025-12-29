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
import { useState, useEffect, useCallback } from 'react';
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

// Constants cho việc quản lý giá trị giới hạn
const CONSTANTS = {
    MAX_TOTAL_PRICE: 1000000000, // 1 tỷ VNĐ
    MAX_QUANTITY_PER_ITEM: 9999, // Số lượng tối đa mỗi sản phẩm
    MIN_QUANTITY: 1, // Số lượng tối thiểu
    PAGINATION: {
        PAGE_SIZE: 10,
        SHOW_SIZE_CHANGER: true,
        SHOW_QUICK_JUMPER: true,
    },
    MODAL: {
        DEFAULT_WIDTH: '90%',
        MAX_WIDTH: '1000px',
    },
    INPUT: {
        SEARCH_WIDTH: 300,
        SELECT_WIDTH: 200,
        QUANTITY_INPUT_WIDTH: 70,
    },
};

// Thêm debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
};

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

    // Thêm state để track pending changes
    const [pendingQuantityChanges, setPendingQuantityChanges] = useState({});
    const debouncedPendingChanges = useDebounce(pendingQuantityChanges, 500);

    const fetchData = async () => {
        try {
            const res = await requestGetCartBuildPc();

            if (res && res.metadata) {
                setTotalPrice(res.metadata.reduce((total, item) => total + (item.totalPrice || 0), 0));

                // Tạo object mới từ data cart để map theo componentType
                const componentMap = {};
                res.metadata.forEach((item) => {
                    if (item.product && item.componentType) {
                        componentMap[item.componentType] = {
                            ...item.product,
                            quantity: item.quantity,
                        };
                    }
                });
                setSelectedComponents(componentMap);

                // Set quantities
                const quantityMap = {};
                res.metadata.forEach((item) => {
                    if (item.componentType) {
                        quantityMap[item.componentType] = item.quantity;
                    }
                });
                setQuantities(quantityMap);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            message.error('Không thể tải dữ liệu');
        }
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
            width: '15%', // Giảm width của cột hình ảnh
            render: (images) => (
                <img src={images?.split(',')[0]} width={80} height={80} style={{ objectFit: 'cover' }} />
            ),
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
            width: '45%', // Tăng width cho tên sản phẩm
            ellipsis: true, // Thêm ellipsis để tên dài không bị overflow
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            width: '25%', // Điều chỉnh width cho cột giá
            sorter: true,
            sortOrder: sortOrder,
            render: (price) => price.toLocaleString() + ' đ',
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: '15%', // Điều chỉnh width cho cột thao tác
            align: 'center',
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
        const data = {
            productId: product.id,
            quantity: 1,
            componentType: currentComponent.type, // Thêm componentType
        };

        try {
            await requestAddToCartBuildPc(data);
            await fetchData(); // fetchData sẽ cập nhật lại selectedComponents từ server
            setIsModalOpen(false);
            message.success('Đã thêm linh kiện thành công');
        } catch (error) {
            console.error('Error adding component:', error);
            message.error('Không thể thêm linh kiện');
        }
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
        // Kiểm tra giá trị hợp lệ
        if (!value || value <= 0) {
            message.error('Số lượng không hợp lệ!');
            return;
        }

        // Tìm component type của product đang được cập nhật
        const componentType = Object.keys(selectedComponents).find((key) => selectedComponents[key].id === productId);

        if (!componentType) {
            message.error('Không tìm thấy linh kiện!');
            return;
        }

        const currentComponent = selectedComponents[componentType];

        // Kiểm tra giới hạn số lượng tối đa
        if (value > CONSTANTS.MAX_QUANTITY_PER_ITEM) {
            message.error(`Số lượng không thể vượt quá ${CONSTANTS.MAX_QUANTITY_PER_ITEM.toLocaleString()}`);
            // Reset về số lượng hiện tại
            setQuantities((prev) => ({
                ...prev,
                [componentType]: quantities[componentType] || 1,
            }));
            return;
        }

        // Kiểm tra stock - TỰ ĐỘNG RESET VỀ STOCK
        if (value > currentComponent.stock) {
            message.warning(
                `Số lượng vượt quá kho hàng (${currentComponent.stock}). Đã tự động điều chỉnh về số lượng tối đa có thể.`,
            );

            // Auto reset về stock available
            const maxStock = Math.min(currentComponent.stock, CONSTANTS.MAX_QUANTITY_PER_ITEM);
            setQuantities((prev) => ({
                ...prev,
                [componentType]: maxStock,
            }));

            // Gọi API update với stock value
            try {
                const data = {
                    productId,
                    quantity: maxStock,
                };
                await requestUpdateQuantityCartBuildPc(data);
                await fetchData();
                message.success(`Đã cập nhật số lượng thành ${maxStock}`);
            } catch (error) {
                console.error('Error updating quantity:', error);
                await fetchData();
                message.error('Không thể cập nhật số lượng. Vui lòng thử lại!');
            }
            return;
        }

        // Tính tổng giá trị của toàn bộ giỏ hàng sau khi cập nhật
        if (currentComponent) {
            // Tính tổng giá trị hiện tại của các sản phẩm khác
            let totalOtherProducts = 0;
            Object.keys(selectedComponents).forEach((key) => {
                if (key !== componentType) {
                    const otherComponent = selectedComponents[key];
                    const otherQuantity = quantities[key] || 1;
                    totalOtherProducts += otherComponent.price * otherQuantity;
                }
            });

            // Tính giá trị của sản phẩm đang cập nhật
            const newProductTotal = currentComponent.price * value;

            // Tổng giá trị toàn bộ giỏ hàng
            const newTotalPrice = totalOtherProducts + newProductTotal;

            if (newTotalPrice > CONSTANTS.MAX_TOTAL_PRICE) {
                // Tính số lượng tối đa có thể đặt cho sản phẩm này
                const remainingBudget = CONSTANTS.MAX_TOTAL_PRICE - totalOtherProducts;
                const maxQuantity = Math.floor(remainingBudget / currentComponent.price);

                message.error(
                    `Tổng giá trị giỏ hàng ${newTotalPrice.toLocaleString(
                        'vi-VN',
                    )} VNĐ vượt quá giới hạn cho phép (${CONSTANTS.MAX_TOTAL_PRICE.toLocaleString('vi-VN')} VNĐ). ` +
                        `Số lượng tối đa cho sản phẩm này: ${Math.max(0, maxQuantity)}`,
                );

                // Reset về số lượng hiện tại
                setQuantities((prev) => ({
                    ...prev,
                    [componentType]: quantities[componentType] || 1,
                }));
                return;
            }
        }

        const data = {
            productId,
            quantity: value,
        };

        try {
            await requestUpdateQuantityCartBuildPc(data);

            // Cập nhật local state
            setQuantities((prev) => ({
                ...prev,
                [componentType]: value,
            }));

            await fetchData();
            message.success(`Đã cập nhật số lượng thành ${value}`);
        } catch (error) {
            console.error('Error updating quantity:', error);

            // Reset lại giá trị cũ khi có lỗi
            setQuantities((prev) => ({
                ...prev,
                [componentType]: quantities[componentType] || 1,
            }));

            if (error.response && error.response.data && error.response.data.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Không thể cập nhật số lượng. Vui lòng thử lại!');
            }
        }
    };

    // Effect để handle debounced API calls
    useEffect(() => {
        Object.entries(debouncedPendingChanges).forEach(([componentType, value]) => {
            const component = selectedComponents[componentType];
            if (component && value !== quantities[componentType]) {
                handleQuantityChange(component.id, value);
            }
        });
        setPendingQuantityChanges({});
    }, [debouncedPendingChanges]);

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
        // Kiểm tra giới hạn tổng tiền trước khi thêm vào giỏ hàng
        if (totalPrice > CONSTANTS.MAX_TOTAL_PRICE) {
            message.error(
                `Tổng giá trị ${totalPrice.toLocaleString(
                    'vi-VN',
                )} VNĐ vượt quá giới hạn cho phép (${CONSTANTS.MAX_TOTAL_PRICE.toLocaleString(
                    'vi-VN',
                )} VNĐ). Vui lòng giảm số lượng sản phẩm.`,
            );
            return;
        }

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

    // Thêm function helper để tính max quantity
    const calculateMaxQuantity = (componentType) => {
        const stock = selectedComponents[componentType]?.stock || 1;
        const price = selectedComponents[componentType]?.price || 0;

        // Tính tổng giá trị các sản phẩm khác (không bao gồm sản phẩm hiện tại)
        let totalOtherProducts = 0;
        Object.keys(selectedComponents).forEach((key) => {
            if (key !== componentType) {
                const otherComponent = selectedComponents[key];
                const otherQuantity = quantities[key] || 1;
                totalOtherProducts += otherComponent.price * otherQuantity;
            }
        });

        const remainingBudget = CONSTANTS.MAX_TOTAL_PRICE - totalOtherProducts;
        const maxByPrice = price > 0 ? Math.floor(remainingBudget / price) : CONSTANTS.MAX_QUANTITY_PER_ITEM;

        // Return giá trị nhỏ nhất trong các giới hạn, nhưng ít nhất là 1
        const maxValue = Math.min(stock, maxByPrice, CONSTANTS.MAX_QUANTITY_PER_ITEM);
        return Math.max(1, maxValue);
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <Card className={cx('build-card')}>
                    <Row justify="space-between" align="middle" className={cx('header')}>
                        <Title level={4}>🖥️ XÂY DỰNG MÁY TÍNH</Title>
                        <Button type="primary" onClick={() => setIsResetModalOpen(true)}>
                            🔄 LÀM MỚI
                        </Button>
                    </Row>

                    <div className={cx('description')}>
                        ✨ Vui lòng chọn linh kiện bạn cần để xây dựng cấu hình máy tính riêng cho bạn
                    </div>

                    <div className={cx('components-list')}>
                        {pcComponents.map((component) => (
                            <Row key={component.id} className={cx('component-row')} align="middle">
                                <Col xs={24} sm={24} md={4} className={cx('component-label')}>
                                    {component.id}. {component.name}
                                </Col>
                                <Col xs={24} sm={24} md={16}>
                                    {selectedComponents[component.type] ? (
                                        <Row align="middle" className={cx('selected-product')}>
                                            <Col xs={24} sm={6} md={4}>
                                                <Image
                                                    src={selectedComponents[component.type].images?.split(',')[0]}
                                                    width={80}
                                                    height={80}
                                                    style={{ objectFit: 'cover' }}
                                                />
                                            </Col>
                                            <Col xs={24} sm={18} md={20}>
                                                <div className={cx('product-info')}>
                                                    <div className={cx('product-name')}>
                                                        {selectedComponents[component.type]?.name}
                                                    </div>
                                                    <div className={cx('product-price')}>
                                                        {selectedComponents[component.type]?.price?.toLocaleString()}{' '}
                                                        VNĐ
                                                    </div>
                                                    <div className={cx('stock-status')}>
                                                        📦 Kho hàng: {selectedComponents[component.type]?.stock || 0}
                                                    </div>
                                                </div>
                                            </Col>
                                        </Row>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                            🔍 Chưa chọn linh kiện
                                        </div>
                                    )}
                                </Col>
                                <Col xs={24} sm={24} md={4} className={cx('actions')}>
                                    {selectedComponents[component.type] ? (
                                        <Row gutter={8} justify="center">
                                            <Col className={cx('quantity-input')}>
                                                <InputNumber
                                                    min={CONSTANTS.MIN_QUANTITY}
                                                    max={calculateMaxQuantity(component.type)}
                                                    value={quantities[component.type] || 1}
                                                    precision={0}
                                                    onPressEnter={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        if (
                                                            value &&
                                                            value > 0 &&
                                                            selectedComponents[component.type]?.id
                                                        ) {
                                                            handleQuantityChange(
                                                                selectedComponents[component.type].id,
                                                                value,
                                                            );
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const value = parseInt(e.target.value);
                                                        const currentValue = quantities[component.type] || 1;

                                                        // Chỉ call API khi giá trị thực sự thay đổi
                                                        if (
                                                            value &&
                                                            value > 0 &&
                                                            value !== currentValue &&
                                                            selectedComponents[component.type]?.id
                                                        ) {
                                                            handleQuantityChange(
                                                                selectedComponents[component.type].id,
                                                                value,
                                                            );
                                                        } else if (!value || value <= 0) {
                                                            // Reset về giá trị cũ nếu input không hợp lệ
                                                            setQuantities((prev) => ({
                                                                ...prev,
                                                                [component.type]: currentValue,
                                                            }));
                                                        }
                                                    }}
                                                    onChange={(value) => {
                                                        if (!value || value <= 0) {
                                                            // Không cho phép giá trị <= 0
                                                            return;
                                                        }

                                                        // Cập nhật local state ngay lập tức cho UX mượt mà
                                                        setQuantities((prev) => ({
                                                            ...prev,
                                                            [component.type]: value,
                                                        }));
                                                    }}
                                                    style={{
                                                        width: CONSTANTS.INPUT.QUANTITY_INPUT_WIDTH,
                                                        borderColor:
                                                            quantities[component.type] >
                                                            calculateMaxQuantity(component.type)
                                                                ? '#ff4d4f'
                                                                : undefined,
                                                    }}
                                                    status={
                                                        quantities[component.type] >
                                                        calculateMaxQuantity(component.type)
                                                            ? 'error'
                                                            : undefined
                                                    }
                                                />
                                            </Col>
                                            <Col>
                                                <Button
                                                    type="text"
                                                    danger
                                                    className={cx('delete-btn')}
                                                    onClick={() => {
                                                        if (selectedComponents[component.type]?.id) {
                                                            handleDelete(
                                                                selectedComponents[component.type].id,
                                                                component.type,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <DeleteOutlined />
                                                </Button>
                                            </Col>
                                        </Row>
                                    ) : (
                                        <Button
                                            type="primary"
                                            className={cx('select-btn')}
                                            onClick={() => handleOpenModal(component)}
                                        >
                                            {component.buttonText}
                                        </Button>
                                    )}
                                </Col>
                            </Row>
                        ))}
                    </div>

                    <Row justify="center" className={cx('total-price')}>
                        <Typography.Text
                            className={cx('total-text')}
                            style={{
                                color: totalPrice > CONSTANTS.MAX_TOTAL_PRICE ? '#ff4d4f' : '#333',
                            }}
                        >
                            Chi phí dự tính: {totalPrice.toLocaleString()} đ
                            {totalPrice > CONSTANTS.MAX_TOTAL_PRICE && (
                                <div style={{ fontSize: '12px', color: '#FFD700', marginTop: '8px' }}>
                                    ⚠️ Vượt quá giới hạn cho phép ({CONSTANTS.MAX_TOTAL_PRICE.toLocaleString()} VNĐ)
                                </div>
                            )}
                        </Typography.Text>
                    </Row>

                    <Row justify="center" gutter={16} className={cx('action-buttons')}>
                        <Col>
                            <Button onClick={openQuotation} type="primary" className={cx('view-print-btn')}>
                                📋 Xem & In
                            </Button>
                        </Col>
                        <Col>
                            <Button
                                onClick={handleAddToCart}
                                type="primary"
                                className={cx('add-cart-btn')}
                                disabled={totalPrice > CONSTANTS.MAX_TOTAL_PRICE}
                            >
                                🛒 THÊM VÀO GIỎ HÀNG
                            </Button>
                        </Col>
                    </Row>
                </Card>

                <Modal
                    title={
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#1976d2',
                            }}
                        >
                            <span style={{ marginRight: '8px', fontSize: '20px' }}>🔧</span>
                            Chọn {currentComponent?.name}
                        </div>
                    }
                    open={isModalOpen}
                    onCancel={() => setIsModalOpen(false)}
                    width={CONSTANTS.MODAL.DEFAULT_WIDTH}
                    style={{ maxWidth: CONSTANTS.MODAL.MAX_WIDTH }}
                    footer={null}
                    className={cx('modal-content')}
                    destroyOnClose={true}
                >
                    <div className={cx('search-controls')}>
                        <Input
                            placeholder="Tìm kiếm sản phẩm..."
                            prefix={<SearchOutlined style={{ color: '#42a5f5' }} />}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{
                                width: CONSTANTS.INPUT.SEARCH_WIDTH,
                                borderRadius: '8px',
                                border: '2px solid #e8e8e8',
                            }}
                            allowClear
                        />
                        <Select
                            placeholder="Sắp xếp theo giá"
                            style={{
                                width: CONSTANTS.INPUT.SELECT_WIDTH,
                            }}
                            onChange={handleSortChange}
                            value={sortOrder}
                            allowClear
                        >
                            <Option value="ascend">💰 Giá từ thấp đến cao</Option>
                            <Option value="descend">💎 Giá từ cao đến thấp</Option>
                            <Option value={null}>📋 Mặc định</Option>
                        </Select>
                    </div>
                    <Table
                        columns={columns}
                        dataSource={filteredProducts.length > 0 ? filteredProducts : componentProducts}
                        pagination={{
                            pageSize: CONSTANTS.PAGINATION.PAGE_SIZE,
                            showSizeChanger: CONSTANTS.PAGINATION.SHOW_SIZE_CHANGER,
                            showQuickJumper: CONSTANTS.PAGINATION.SHOW_QUICK_JUMPER,
                            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
                        }}
                        scroll={{
                            ...(window.innerWidth <= 768 ? { x: 800 } : {}),
                        }}
                        size="middle"
                    />
                </Modal>

                <Modal
                    title="🔄 LÀM MỚI"
                    open={isResetModalOpen}
                    onCancel={() => setIsResetModalOpen(false)}
                    className={cx('reset-modal')}
                    footer={[
                        <Button key="cancel" onClick={() => setIsResetModalOpen(false)}>
                            ❌ HỦY
                        </Button>,
                        <Button key="confirm" type="primary" onClick={handleReset}>
                            ✅ XÁC NHẬN
                        </Button>,
                    ]}
                >
                    <div className={cx('warning-icon')}>⚠️</div>
                    <p className={cx('warning-text')}>Cảnh báo: Toàn bộ linh kiện của bộ PC hiện tại sẽ bị xóa đi</p>
                </Modal>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default BuildPc;
