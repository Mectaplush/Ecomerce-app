import { useEffect, useState } from 'react';
import { requestGetSimilarProducts } from '../../config/request';
import CardBody from '../CardBody/CardBody';
import styles from './SimilarProducts.module.scss';
import classNames from 'classnames/bind';
import { Spin, Alert } from 'antd';

const cx = classNames.bind(styles);

function SimilarProducts({ productId, topK = 5 }) {
    const [similarProducts, setSimilarProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSimilarProducts = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const response = await requestGetSimilarProducts(productId, topK);
                setSimilarProducts(response.metadata.similarProducts || []);
            } catch (err) {
                console.error('Error fetching similar products:', err);
                setError('Không thể tải sản phẩm tương tự. Vui lòng thử lại sau.');
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            fetchSimilarProducts();
        }
    }, [productId, topK]);

    if (loading) {
        return (
            <div className={cx('similar-products')}>
                <h3 className={cx('title')}>Sản phẩm tương tự</h3>
                <div className={cx('loading-container')}>
                    <Spin size="large" />
                    <p>Đang tải sản phẩm tương tự...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cx('similar-products')}>
                <h3 className={cx('title')}>Sản phẩm tương tự</h3>
                <Alert 
                    message="Lỗi" 
                    description={error} 
                    type="error" 
                    showIcon 
                />
            </div>
        );
    }

    if (!similarProducts || similarProducts.length === 0) {
        return (
            <div className={cx('similar-products')}>
                <h3 className={cx('title')}>Sản phẩm tương tự</h3>
                <div className={cx('no-products')}>
                    <p>Không tìm thấy sản phẩm tương tự.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('similar-products')}>
            <h3 className={cx('title')}>
                Sản phẩm tương tự 
                <span className={cx('count')}>({similarProducts.length} sản phẩm)</span>
            </h3>
            
            <div className={cx('products-grid')}>
                {similarProducts.map((product) => (
                    <div key={product.id} className={cx('product-card')}>
                        <CardBody product={product} />
                        {product.similarityScore && (
                            <div className={cx('similarity-badge')}>
                                Độ tương tự: {Math.round(product.similarityScore * 100)}%
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className={cx('footer-note')}>
                <p>
                    <strong>Gợi ý thông minh:</strong> Các sản phẩm này được đề xuất dựa trên 
                    trí tuệ nhân tạo phân tích đặc điểm và tính năng của sản phẩm bạn đang xem.
                </p>
            </div>
        </div>
    );
}

export default SimilarProducts;