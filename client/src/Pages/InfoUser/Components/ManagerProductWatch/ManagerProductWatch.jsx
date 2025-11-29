import { useEffect, useState } from 'react';
import styles from './ManagerProductWatch.module.scss';
import classNames from 'classnames/bind';
import { requestGetProductWatch } from '../../../../config/request';
import { Pagination } from 'antd';
import { useNavigate } from 'react-router-dom';

import CardBody from '../../../../Components/CardBody/CardBody';

const cx = classNames.bind(styles);

function ManagerProductWatch() {
    const [dataProduct, setDataProduct] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductWatch();
            setDataProduct(res.metadata);
            console.log('Received products:', res.metadata);
        };
        fetchData();
    }, []);

    // Get current products for pagination
    const indexOfLastProduct = currentPage * pageSize;
    const indexOfFirstProduct = indexOfLastProduct - pageSize;
    const currentProducts = dataProduct.slice(indexOfFirstProduct, indexOfLastProduct);

    // Change page handler
    const handlePageChange = (page, pageSize) => {
        setCurrentPage(page);
        setPageSize(pageSize);
    };

    // Enhanced CardBody component with navigation
    const EnhancedCardBody = ({ product }) => {
        const handleClick = () => {
            console.log('Navigating to product:', product.id);
            navigate(`/products/${product.id}`);
        };

        return (
            <div className={cx('card-item')} onClick={handleClick}>
                <CardBody product={product} />
            </div>
        );
    };

    return (
        <div className={cx('manager-product-watch')}>
            <h1>Sản phẩm đã xem</h1>
            <div className={cx('wrapper')}>
                {currentProducts.map((item, index) => (
                    <EnhancedCardBody key={index} product={item} />
                ))}
            </div>
            {dataProduct.length > 0 && (
                <div className={cx('pagination')}>
                    <Pagination
                        current={currentPage}
                        total={dataProduct.length}
                        pageSize={pageSize}
                        onChange={handlePageChange}
                        showSizeChanger
                        pageSizeOptions={['4', '8', '12', '16']}
                    />
                </div>
            )}
        </div>
    );
}

export default ManagerProductWatch;
