import styles from './DetailProduct.module.scss';
import classNames from 'classnames/bind';
import Header from '../../Components/Header/Header';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
    requestAddToCart,
    requestCreateUserWatchProduct,
    requestGetProductById,
    requestUpdateProductPreview,
    requestDeleteProductPreview,
} from '../../config/request';
import Footer from '../../Components/Footer/Footer';
import { message, Rate } from 'antd';
import { StarFilled } from '@ant-design/icons';
import { useStore } from '../../hooks/useStore';
import dayjs from 'dayjs';
import SimilarProducts from '../../Components/SimilarProducts/SimilarProducts';

const cx = classNames.bind(styles);

// Custom Rate component để hiển thị đúng màu vàng
const CustomRate = ({ value, size = 16 }) => {
    const stars = [];
    const fullStars = Math.floor(value);
    const hasHalfStar = value % 1 !== 0;
    const marginRight = size <= 12 ? '1px' : size <= 14 ? '2px' : '4px';

    // Tạo sao đầy đủ
    for (let i = 0; i < fullStars; i++) {
        stars.push(
            <StarFilled
                key={`full-${i}`}
                style={{
                    color: '#fadb14',
                    fontSize: `${size}px`,
                    marginRight: marginRight,
                }}
            />,
        );
    }

    // Tạo sao nửa nếu có
    if (hasHalfStar && fullStars < 5) {
        stars.push(
            <span key="half" style={{ position: 'relative', marginRight: marginRight }}>
                <StarFilled
                    style={{
                        color: '#f0f0f0',
                        fontSize: `${size}px`,
                    }}
                />
                <StarFilled
                    style={{
                        color: '#fadb14',
                        fontSize: `${size}px`,
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '50%',
                        overflow: 'hidden',
                    }}
                />
            </span>,
        );
    }

    // Tạo sao trống để đủ 5 sao
    const emptyStars = 5 - Math.ceil(value);
    for (let i = 0; i < emptyStars; i++) {
        stars.push(
            <StarFilled
                key={`empty-${i}`}
                style={{
                    color: '#f0f0f0',
                    fontSize: `${size}px`,
                    marginRight: marginRight,
                }}
            />,
        );
    }

    return <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>{stars}</div>;
};
function DetailProduct() {
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [products, setProducts] = useState({});
    const [productPreview, setProductPreview] = useState([]);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reviewToDelete, setReviewToDelete] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [reviewToEdit, setReviewToEdit] = useState(null);
    const [editRating, setEditRating] = useState(0);
    const [editContent, setEditContent] = useState('');
    const ref = useRef(null);

    const { id } = useParams();

    const { fetchCart, dataUser } = useStore();

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductById(id);
            setProducts(res.metadata.product);
            setProductPreview(res.metadata.dataPreview);
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        ref.current.scrollIntoView({ behavior: 'smooth' });
    }, []);
    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleEditReview = (reviewId) => {
        const review = productPreview.find((item) => item.id === reviewId);
        if (review) {
            setReviewToEdit(review);
            setEditRating(review.rating / 2); // Convert database rating (1-10) to stars (0.5-5)
            setEditContent(review.content);
            setShowEditModal(true);
        }
    };

    const handleDeleteReview = (reviewId) => {
        setReviewToDelete(reviewId);
        setShowDeleteModal(true);
    };

    const confirmEditReview = async () => {
        try {
            if (!editContent.trim() || editRating === 0) {
                message.error('Vui lòng nhập đầy đủ thông tin đánh giá');
                return;
            }

            await requestUpdateProductPreview({
                id: reviewToEdit.id,
                rating: editRating * 2, // Convert stars (0.5-5) to database rating (1-10)
                content: editContent.trim(),
            });

            // Refresh lại danh sách đánh giá
            const res = await requestGetProductById(id);
            setProductPreview(res.metadata.dataPreview);

            setShowEditModal(false);
            setReviewToEdit(null);
            setEditRating(0);
            setEditContent('');

            message.success('Cập nhật đánh giá thành công');
        } catch (error) {
            console.error('Error updating review:', error);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật đánh giá');
        }
    };

    const confirmDeleteReview = async () => {
        try {
            await requestDeleteProductPreview({ id: reviewToDelete });

            // Refresh lại danh sách đánh giá
            const res = await requestGetProductById(id);
            setProductPreview(res.metadata.dataPreview);

            setShowDeleteModal(false);
            setReviewToDelete(null);

            message.success('Xóa đánh giá thành công');
        } catch (error) {
            console.error('Error deleting review:', error);
            message.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá');
        }
    };

    const cancelDeleteReview = () => {
        setShowDeleteModal(false);
        setReviewToDelete(null);
    };

    const cancelEditReview = () => {
        setShowEditModal(false);
        setReviewToEdit(null);
        setEditRating(0);
        setEditContent('');
    };

    const handleIncrement = () => {
        setQuantity((prev) => prev + 1);
    };

    const handleDecrement = () => {
        if (quantity > 1) {
            setQuantity((prev) => prev - 1);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const data = {
                productId: id,
            };
            await requestCreateUserWatchProduct(data);
        };
        fetchData();
    }, []);

    const onAddToCart = async () => {
        const data = {
            productId: id,
            quantity,
        };
        try {
            await requestAddToCart(data);
            await fetchCart();
            message.success('Thêm vào giỏ hàng thành công');
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    const navigate = useNavigate();

    const onBuyNow = async () => {
        const data = {
            productId: id,
            quantity,
        };
        try {
            await requestAddToCart(data);
            fetchCart();
            navigate('/cart');
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    const toggleDescription = () => {
        setIsDescriptionExpanded(!isDescriptionExpanded);
    };

    return (
        <div className={cx('wrapper')} ref={ref}>
            <Header />
            <div className={cx('container')}>
                <div className={cx('product-images')}>
                    <div className={cx('main-image')}>
                        <img src={products?.images?.split(',')[selectedImage]} />
                    </div>
                    <div className={cx('thumbnail-list')}>
                        {products?.images?.split(',').map((image, index) => (
                            <img
                                key={index}
                                src={image}
                                alt={`Thumbnail ${index + 1}`}
                                onClick={() => setSelectedImage(index)}
                                className={cx({ active: selectedImage === index })}
                            />
                        ))}
                    </div>
                </div>

                <div className={cx('product-info')}>
                    <h1 className={cx('product-title')}>{products.name}</h1>

                    <div className={cx('price-section')}>
                        <span className={cx('current-price')}>
                            {(products?.price - (products?.price * products?.discount) / 100)?.toLocaleString()} đ
                        </span>
                        <span className={cx('original-price')}>{products?.price?.toLocaleString()}đ</span>
                        <span className={cx('discount')}>
                            Tiết kiệm: {((products?.price * products?.discount) / 100)?.toLocaleString()}đ
                        </span>
                    </div>

                    {products.componentType === 'pc' && (
                        <div className={cx('specifications')}>
                            <h3>Mô tả sản phẩm</h3>
                            <ul>
                                <li>CPU: {products.cpu}</li>
                                <li>Mainboard: {products.main}</li>
                                <li>RAM: {products.ram}</li>
                                <li>SSD: {products.storage}</li>
                                <li>GPU: {products.gpu}</li>
                                <li>Case: {products.caseComputer}</li>
                                <li>PSU: {products.power}</li>
                                <li>Tản nhiệt: {products.coolers}</li>
                            </ul>
                        </div>
                    )}

                    <div className={cx('quantity-section')}>
                        <span>Số lượng:</span>
                        <div className={cx('quantity-controls')}>
                            <button onClick={handleDecrement}>-</button>
                            <input type="number" value={quantity} readOnly />
                            <button onClick={handleIncrement}>+</button>
                        </div>
                    </div>
                    {dataUser.id ? (
                        <div className={cx('action-buttons')}>
                            <button onClick={onBuyNow} className={cx('buy-now')}>
                                ĐẶT HÀNG
                            </button>
                            <button onClick={onAddToCart} className={cx('add-to-cart')}>
                                THÊM VÀO GIỎ
                            </button>
                        </div>
                    ) : (
                        <div className={cx('action-buttons')}>
                            <Link style={{ textDecoration: 'none', width: '100%', color: 'white' }} to="/login">
                                <button className={cx('buy-now')}>Đăng nhập để mua hàng</button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <div className={cx('description')}>
                <div className={cx('description-header')}>
                    <h3>Mô tả chi tiết sản phẩm</h3>
                    <p className={cx('description-subtitle')}>
                        Thông tin chi tiết về tính năng và đặc điểm của sản phẩm
                    </p>
                </div>
                <div className={cx('description-wrapper')}>
                    <div
                        className={cx('description-content', {
                            collapsed: !isDescriptionExpanded,
                            expanded: isDescriptionExpanded,
                        })}
                    >
                        <div
                            className={cx('description-text')}
                            dangerouslySetInnerHTML={{ __html: products.description }}
                        />
                        {!isDescriptionExpanded && <div className={cx('fade-overlay')}></div>}
                    </div>
                    <button
                        onClick={toggleDescription}
                        className={cx('description-toggle-btn', {
                            expanded: isDescriptionExpanded,
                        })}
                    >
                        {isDescriptionExpanded ? '📖 Thu gọn nội dung' : '📖 Xem thêm mô tả'}
                        <span className={cx('btn-icon')}>{isDescriptionExpanded ? '▲' : '▼'}</span>
                    </button>
                </div>
            </div>

            <div className={cx('product-preview')}>
                <h3>Đánh giá sản phẩm</h3>
                <div>
                    {productPreview.map((item, index) => (
                        <div key={index} className={cx('product-preview-item')}>
                            <img
                                src={
                                    (dataUser.id === item.user.id ? dataUser.avatar : item.user.avatar) ||
                                    'https://doanwebsite.com/assets/userNotFound-DUSu2NMF.png'
                                }
                                alt={`Avatar của ${item.user.name || 'Người dùng'}`}
                                onError={(e) => {
                                    e.target.src = 'https://doanwebsite.com/assets/userNotFound-DUSu2NMF.png';
                                }}
                            />
                            <div className={cx('review-content')}>
                                <CustomRate
                                    value={item.rating / 2} // Convert database rating (1-10) to stars (0.5-5)
                                    size={windowWidth <= 480 ? 12 : windowWidth <= 768 ? 14 : 16}
                                />
                                <h4>{item.user.name}</h4>
                                <p>{item.content}</p>
                                <span>{dayjs(item.createdAt).format('HH:mm DD/MM/YYYY')}</span>

                                {/* Hiển thị button sửa/xóa chỉ cho chủ review */}
                                {dataUser.id === item.user.id && (
                                    <div className={cx('review-actions')}>
                                        <button className={cx('edit-btn')} onClick={() => handleEditReview(item.id)}>
                                            <i className="fas fa-edit"></i>
                                            Sửa
                                        </button>
                                        <button
                                            className={cx('delete-btn')}
                                            onClick={() => handleDeleteReview(item.id)}
                                        >
                                            <i className="fas fa-trash"></i>
                                            Xóa
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Similar Products Section */}
            {products.id && <SimilarProducts productId={products.id} />}

            <footer>
                <Footer />
            </footer>

            {/* Modal chỉnh sửa đánh giá */}
            {showEditModal && (
                <div className={cx('modal-overlay')}>
                    <div className={cx('edit-modal')}>
                        <h3>Chỉnh sửa đánh giá</h3>
                        <div className={cx('edit-form')}>
                            <div className={cx('rating-section')}>
                                <label>Đánh giá:</label>
                                <Rate
                                    value={editRating}
                                    onChange={setEditRating}
                                    style={{ fontSize: '20px', color: '#fadb14' }}
                                />
                            </div>
                            <div className={cx('content-section')}>
                                <label>Nội dung đánh giá:</label>
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    placeholder="Nhập nội dung đánh giá..."
                                    rows={4}
                                />
                            </div>
                        </div>
                        <div className={cx('modal-actions')}>
                            <button className={cx('cancel-btn')} onClick={cancelEditReview}>
                                Hủy
                            </button>
                            <button className={cx('confirm-btn')} onClick={confirmEditReview}>
                                Cập nhật
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal xác nhận xóa đánh giá */}
            {showDeleteModal && (
                <div className={cx('modal-overlay')}>
                    <div className={cx('delete-modal')}>
                        <h3>Xác nhận xóa đánh giá</h3>
                        <p>Bạn có chắc chắn muốn xóa đánh giá này không?</p>
                        <div className={cx('modal-actions')}>
                            <button className={cx('cancel-btn')} onClick={cancelDeleteReview}>
                                Hủy
                            </button>
                            <button className={cx('confirm-btn')} onClick={confirmDeleteReview}>
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DetailProduct;
