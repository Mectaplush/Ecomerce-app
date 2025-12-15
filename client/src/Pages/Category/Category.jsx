import { useState, useEffect, useMemo } from 'react';
import classNames from 'classnames/bind';
import { Layout, Row, Col, Card, Input, Slider, Select, Empty, Spin, Pagination } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styles from './Category.module.scss';
import Header from '../../Components/Header/Header';
import { useParams } from 'react-router-dom';
import { requestGetAllProducts, requestGetProductCategory, requestGetProducts } from '../../config/request';

import CardBody from '../../Components/CardBody/CardBody';
import Footer from '../../Components/Footer/Footer';
import CategoryComponentFilter from '../../Components/CategoryComponentFilter/CategoryComponentFilter';

const { Content } = Layout;
const { Search } = Input;
const cx = classNames.bind(styles);

function Category() {
    const { id } = useParams();

    const [allProducts, setAllProducts] = useState([]);
    const [filters, setFilters] = useState({
        search: '',
        priceRange: [0, 100000000],
        componentType: [],
        componentIds: [],
        sort: 'newest',
    });
    const [loading, setLoading] = useState(false);
    const [availableFilters, setAvailableFilters] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 12,
    });

    // Reset filters when category changes
    useEffect(() => {
        // Chỉ reset khi category ID thực sự thay đổi
        setFilters((prev) => ({
            ...prev,
            componentIds: [],
        }));
        setAvailableFilters([]);
        setPagination((prev) => ({ ...prev, current: 1 }));

        // Scroll to top ngay khi đổi category
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [id]);

    const sortOptions = [
        { value: 'newest', label: 'Mới nhất' },
        { value: 'price-asc', label: 'Giá tăng dần' },
        { value: 'price-desc', label: 'Giá giảm dần' },
        { value: 'discount', label: 'Khuyến mãi' },
    ];

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchData = async () => {
            setLoading(true);

            try {
                const params = {
                    search: filters.search,
                    minPrice: filters.priceRange[0],
                    maxPrice: filters.priceRange[1],
                    sort: filters.sort,
                };

                // Thêm các productIds nếu có
                if (filters.componentIds.length > 0) {
                    params.productIds = filters.componentIds.join(',');
                }

                if (id === 'all') {
                    const res = await requestGetAllProducts(params);
                    setAllProducts(res.metadata.products);

                    // Lưu các bộ lọc đặc biệt nếu có
                    if (res.metadata.filters) {
                        setAvailableFilters(res.metadata.filters);
                    }
                } else {
                    params.id = id;

                    const res = await requestGetProductCategory(params);
                    setAllProducts(Array.isArray(res.metadata) ? res.metadata : res.metadata.products || []);
                }
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };

        // Thêm debounce để tránh gọi API quá nhiều
        const timeoutId = setTimeout(fetchData, 500);
        return () => clearTimeout(timeoutId);
    }, [id, filters]);

    // Paginate products on the client side
    const paginatedProducts = useMemo(() => {
        const startIndex = (pagination.current - 1) * pagination.pageSize;
        const endIndex = startIndex + pagination.pageSize;
        return allProducts.slice(startIndex, endIndex);
    }, [allProducts, pagination.current, pagination.pageSize]);

    const handleComponentPartChange = (productIds) => {
        setFilters({ ...filters, componentIds: productIds });
        setPagination((prev) => ({ ...prev, current: 1 }));
    };

    const handlePageChange = (page, pageSize) => {
        setPagination({
            ...pagination,
            current: page,
            pageSize: pageSize,
        });

        // Scroll to top when changing page
        window.scrollTo(0, 0);
    };

    return (
        <Layout className={cx('wrapper')}>
            <Header />
            <Content className={cx('content')}>
                <Row gutter={[24, 24]}>
                    <Col xs={24} sm={24} md={24} lg={6} span={6}>
                        <Card title="Bộ lọc sản phẩm" className={cx('filter-card')}>
                            <div className={cx('filter-section')}>
                                <h4>Tìm kiếm</h4>
                                <div className={cx('search-input')}>
                                    <Search
                                        placeholder="Nhập tên sản phẩm cần tìm..."
                                        onChange={(e) => {
                                            setFilters({ ...filters, search: e.target.value });
                                            setPagination((prev) => ({ ...prev, current: 1 }));
                                        }}
                                        allowClear
                                        enterButton={<SearchOutlined />}
                                    />
                                </div>
                            </div>

                            <div className={cx('filter-section')}>
                                <h4>Khoảng giá</h4>
                                <div className={cx('price-slider')}>
                                    <Slider
                                        range
                                        min={0}
                                        max={100000000}
                                        step={1000000}
                                        defaultValue={filters.priceRange}
                                        onChange={(value) => {
                                            setFilters({ ...filters, priceRange: value });
                                            setPagination((prev) => ({ ...prev, current: 1 }));
                                        }}
                                        tooltip={{
                                            formatter: (value) => `${value.toLocaleString('vi-VN')}đ`,
                                        }}
                                    />
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: '8px',
                                            fontSize: '12px',
                                            color: '#8c8c8c',
                                        }}
                                    >
                                        <span>{filters.priceRange[0].toLocaleString('vi-VN')}đ</span>
                                        <span>{filters.priceRange[1].toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cx('filter-section')}>
                                <h4>Sắp xếp theo</h4>
                                <div className={cx('sort-select')}>
                                    <Select
                                        style={{ width: '100%' }}
                                        options={sortOptions}
                                        defaultValue="newest"
                                        onChange={(value) => {
                                            setFilters({ ...filters, sort: value });
                                            setPagination((prev) => ({ ...prev, current: 1 }));
                                        }}
                                        placeholder="Chọn cách sắp xếp"
                                    />
                                </div>
                            </div>
                        </Card>

                        <CategoryComponentFilter
                            onChange={handleComponentPartChange}
                            categoryId={id}
                            filters={availableFilters}
                            selectedIds={filters.componentIds}
                        />
                    </Col>

                    {/* Product list */}
                    <Col xs={24} sm={24} md={24} lg={18} span={18}>
                        {loading ? (
                            <div className={cx('loading')}>
                                <Spin size="large" />
                            </div>
                        ) : allProducts.length > 0 ? (
                            <>
                                <Row gutter={[16, 16]}>
                                    {paginatedProducts.map((product) => (
                                        <Col key={product.id} xs={12} sm={8} md={6} lg={8}>
                                            <CardBody product={product} />
                                        </Col>
                                    ))}
                                </Row>
                                <div className={cx('pagination-container')}>
                                    <Pagination
                                        current={pagination.current}
                                        pageSize={pagination.pageSize}
                                        total={allProducts.length}
                                        onChange={handlePageChange}
                                        showSizeChanger
                                        pageSizeOptions={['12', '24', '36', '48']}
                                        showTotal={(total) => `Tổng ${total} sản phẩm`}
                                        className={cx('pagination')}
                                    />
                                </div>
                            </>
                        ) : (
                            <Empty description="Không tìm thấy sản phẩm nào" />
                        )}
                    </Col>
                </Row>
            </Content>
            <footer>
                <Footer />
            </footer>
        </Layout>
    );
}

export default Category;
