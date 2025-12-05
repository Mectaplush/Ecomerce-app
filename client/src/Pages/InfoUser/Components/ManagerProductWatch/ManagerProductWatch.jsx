import { useEffect, useState } from 'react';
import styles from './ManagerProductWatch.module.scss';
import classNames from 'classnames/bind';
import { requestGetProductWatch } from '../../../../config/request';
import { Pagination, Empty, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import CardBody from '../../../../Components/CardBody/CardBody';

const cx = classNames.bind(styles);

function ManagerProductWatch() {
    const [dataProduct, setDataProduct] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

    // Detect screen size and set appropriate page size
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width <= 768);

            // Set responsive page size
            if (width <= 360) {
                setPageSize(4); // 2x2 for very small screens
            } else if (width <= 480) {
                setPageSize(6); // 2x3 for small mobile
            } else if (width <= 768) {
                setPageSize(6); // 2x3 for mobile
            } else if (width <= 1023) {
                setPageSize(9); // 3x3 for tablet
            } else {
                setPageSize(8); // 4x2 for desktop
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await requestGetProductWatch();
                setDataProduct(res.metadata || []);
                console.log('Received products:', res.metadata);
            } catch (error) {
                console.error('Error fetching products:', error);
                setDataProduct([]);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Get current products for pagination
    const indexOfLastProduct = currentPage * pageSize;
    const indexOfFirstProduct = indexOfLastProduct - pageSize;
    const currentProducts = dataProduct.slice(indexOfFirstProduct, indexOfLastProduct);

    // Change page handler
    const handlePageChange = (page, newPageSize) => {
        setCurrentPage(page);
        if (newPageSize) {
            setPageSize(newPageSize);
        }
    };

    // Enhanced CardBody component with navigation and responsive features
    const EnhancedCardBody = ({ product, index }) => {
        const handleClick = () => {
            console.log('Navigating to product:', product.id);
            navigate(`/products/${product.id}`);
        };

        return (
            <div
                className={cx('card-item')}
                onClick={handleClick}
                style={{
                    // Add subtle animation delay for better UX
                    animationDelay: `${index * 0.1}s`,
                }}
            >
                <CardBody product={product} />
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className={cx('manager-product-watch')}>
                <h1>Sản phẩm đã xem</h1>
                <div
                    style={{
                        textAlign: 'center',
                        padding: '40px 0',
                        minHeight: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Spin size="large" tip="Đang tải sản phẩm..." />
                </div>
            </div>
        );
    }

    // Empty state
    if (dataProduct.length === 0) {
        return (
            <div className={cx('manager-product-watch')}>
                <h1>Sản phẩm đã xem</h1>
                <Empty
                    description="Bạn chưa xem sản phẩm nào"
                    style={{
                        padding: '40px 0',
                        minHeight: '200px',
                    }}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </div>
        );
    }

    return (
        <div className={cx('manager-product-watch')}>
            <h1>
                Sản phẩm đã xem
                {dataProduct.length > 0 && (
                    <span
                        style={{
                            fontSize: '14px',
                            fontWeight: 'normal',
                            color: '#666',
                            marginLeft: '8px',
                        }}
                    >
                        ({dataProduct.length} sản phẩm)
                    </span>
                )}
            </h1>

            <div className={cx('wrapper')}>
                {currentProducts.map((item, index) => (
                    <EnhancedCardBody key={`${item.id}-${index}`} product={item} index={index} />
                ))}
            </div>

            {/* Show pagination only if there are enough products */}
            {dataProduct.length > pageSize && (
                <div className={cx('pagination')}>
                    <Pagination
                        current={currentPage}
                        total={dataProduct.length}
                        pageSize={pageSize}
                        onChange={handlePageChange}
                        showSizeChanger={!isMobile} // Hide size changer on mobile
                        pageSizeOptions={isMobile ? ['4', '6'] : ['4', '8', '12', '16']}
                        showTotal={(total, range) =>
                            isMobile
                                ? `${range[0]}-${range[1]}/${total}`
                                : `${range[0]}-${range[1]} của ${total} sản phẩm`
                        }
                        responsive={true}
                        size={isMobile ? 'small' : 'default'}
                        showQuickJumper={!isMobile} // Hide quick jumper on mobile
                    />
                </div>
            )}
        </div>
    );
}

export default ManagerProductWatch;
