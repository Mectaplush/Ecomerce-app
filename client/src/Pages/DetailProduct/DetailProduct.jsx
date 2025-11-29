import styles from './DetailProduct.module.scss';
import classNames from 'classnames/bind';
import Header from '../../Components/Header/Header';
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { requestAddToCart, requestCreateUserWatchProduct, requestGetProductById } from '../../config/request';
import Footer from '../../Components/Footer/Footer';
import { message, Rate } from 'antd';
import { useStore } from '../../hooks/useStore';
import dayjs from 'dayjs';

const cx = classNames.bind(styles);

function DetailProduct() {
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState(0);
    const [products, setProducts] = useState({});
    const [productPreview, setProductPreview] = useState([]);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

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
            fetchCart();
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
                <div
                    className={cx('description-content')}
                    style={{
                        maxHeight: isDescriptionExpanded ? 'none' : '300px',
                        overflow: isDescriptionExpanded ? 'visible' : 'hidden',
                    }}
                >
                    <p dangerouslySetInnerHTML={{ __html: products.description }} />
                    {!isDescriptionExpanded && <div className={cx('fade-overlay')}></div>}
                </div>
                <button onClick={toggleDescription} className={cx('description-toggle-btn')}>
                    {isDescriptionExpanded ? 'Thu gọn' : 'Xem thêm mô tả'}
                </button>
            </div>

            <div className={cx('product-preview')}>
                <h3>Đánh giá sản phẩm</h3>
                <div>
                    {productPreview.map((item) => (
                        <div className={cx('product-preview-item')}>
                            <img src="https://doanwebsite.com/assets/userNotFound-DUSu2NMF.png" alt="" />
                            <div>
                                <Rate disabled value={item.dataValues.rating} />
                                <h4>{item.user.name}</h4>
                                <p>{item.dataValues.content}</p>
                                <span>{dayjs(item.dataValues.createdAt).format('HH:MM DD/MM/YYYY')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default DetailProduct;
