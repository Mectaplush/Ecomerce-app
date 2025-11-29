import classNames from 'classnames/bind';
import styles from './CardBody.module.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { requestAddToCart } from '../../config/request';

import { message } from 'antd';
import { useRef, useState, useEffect } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, arrow, inline } from '@floating-ui/react-dom';

const cx = classNames.bind(styles);

function CardBody({ product }) {
    const [isHovering, setIsHovering] = useState(false);
    const arrowRef = useRef(null);
    const cardRef = useRef(null);

    // Floating UI setup
    const { x, y, strategy, refs, middlewareData, placement } = useFloating({
        middleware: [offset(10), inline(), flip(), shift({ padding: 5 }), arrow({ element: arrowRef })],
        placement: 'right-start',
        whileElementsMounted: autoUpdate,
    });

    // Set reference when card ref is available
    useEffect(() => {
        if (!cardRef.current) return;
        refs.setReference(cardRef.current);
    }, [refs.setReference, cardRef.current]);

    // Arrow positioning
    const { x: arrowX, y: arrowY } = middlewareData.arrow || {};
    const staticSide = {
        top: 'bottom',
        right: 'left',
        bottom: 'top',
        left: 'right',
    }[placement.split('-')[0]];

    const onAddToCart = async () => {
        const data = {
            productId: product.id,
            quantity: 1,
        };
        try {
            await requestAddToCart(data);
            message.success('Thêm vào giỏ hàng thành công');
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    // Calculate discounted price
    const discountedPrice =
        product?.price && !isNaN(product.price)
            ? ((product.price * (100 - (product?.discount || 0))) / 100).toLocaleString()
            : 'Liên hệ';
    const originalPrice = product?.price && !isNaN(product.price) ? product.price.toLocaleString() : '';

    // Get the first image for the main display
    const mainImage = product?.images?.split(',')[0];

    // Add timeout for hover to prevent flickering
    const handleMouseEnter = () => {
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
    };

    // Render specifications based on product type
    const renderSpecifications = () => {
        const specs = [];

        // Display all product information

        // Display CPU info if available
        if (product.cpu) {
            specs.push(
                <li key="cpu">
                    <span className={cx('check-icon')}></span>
                    CPU: {product.cpu}
                </li>,
            );
        }

        // Display Mainboard info if available
        if (product.main) {
            specs.push(
                <li key="main">
                    <span className={cx('check-icon')}></span>
                    Mainboard: {product.main}
                </li>,
            );
        }

        // Display RAM info if available
        if (product.ram) {
            specs.push(
                <li key="ram">
                    <span className={cx('check-icon')}></span>
                    RAM: {product.ram}
                </li>,
            );
        }

        // Display Storage info if available
        if (product.storage) {
            specs.push(
                <li key="storage">
                    <span className={cx('check-icon')}></span>Ổ cứng: {product.storage}
                </li>,
            );
        }

        // Display GPU info if available
        if (product.gpu) {
            specs.push(
                <li key="gpu">
                    <span className={cx('check-icon')}></span>
                    Card đồ họa: {product.gpu}
                </li>,
            );
        }

        // Display Power info if available
        if (product.power) {
            specs.push(
                <li key="power">
                    <span className={cx('check-icon')}></span>
                    Nguồn: {product.power}
                </li>,
            );
        }

        // Display Case info if available
        if (product.caseComputer) {
            specs.push(
                <li key="case">
                    <span className={cx('check-icon')}></span>
                    Case: {product.caseComputer}
                </li>,
            );
        }

        // Display Cooler info if available
        if (product.coolers) {
            specs.push(
                <li key="cooler">
                    <span className={cx('check-icon')}></span>
                    Tản nhiệt: {product.coolers}
                </li>,
            );
        }

        // Luôn hiển thị loại sản phẩm
        const componentTypeMap = {
            cpu: 'CPU',
            mainboard: 'Mainboard',
            ram: 'RAM',
            hdd: 'Ổ cứng HDD',
            ssd: 'Ổ cứng SSD',
            vga: 'Card đồ họa',
            power: 'Nguồn máy tính',
            cooler: 'Tản nhiệt',
            case: 'Case máy tính',
            monitor: 'Màn hình',
            keyboard: 'Bàn phím',
            mouse: 'Chuột',
            headset: 'Tai nghe',
        };

        return specs;
    };

    // Cập nhật phần render modal
    return (
        <div ref={cardRef} className={cx('wrapper')} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <Link to={`/products/${product?.id}`}>
                <img src={mainImage} alt={product?.name} />
            </Link>
            <div className={cx('info')}>
                <h3>{product?.name}</h3>
                <div>
                    <div>
                        <p>{discountedPrice}</p>
                        <p>{originalPrice}</p>
                    </div>

                    <button onClick={onAddToCart}>
                        <FontAwesomeIcon icon={faCartPlus} />
                    </button>
                </div>
            </div>

            {isHovering && (
                <div
                    ref={refs.setFloating}
                    className={cx('modal-product-detail')}
                    style={{
                        position: strategy,
                        top: y ?? 0,
                        left: x ?? 0,
                        width: 'min(500px, 90vw)',
                    }}
                >
                    <div
                        ref={arrowRef}
                        className={cx('arrow')}
                        style={{
                            position: 'absolute',
                            left: arrowX != null ? `${arrowX}px` : '',
                            top: arrowY != null ? `${arrowY}px` : '',
                            right: '',
                            bottom: '',
                            [staticSide]: '-6px',
                        }}
                    />
                    <h2 className={cx('modal-title')}>{product?.name}</h2>

                    <div className={cx('modal-price-container')}>
                        <div className={cx('price-row')}>
                            <p className={cx('price-label')}>Giá bán:</p>
                            <p className={cx('price-value')}>{discountedPrice} VNĐ</p>
                        </div>
                        <div className={cx('price-row')}>
                            <p className={cx('price-label')}>Giá gốc:</p>
                            <p className={cx('original-price')}>{originalPrice} VNĐ</p>
                        </div>
                        <div className={cx('price-row')}>
                            <p className={cx('price-label')}>Tiết kiệm:</p>
                            <p className={cx('discount-value')}>
                                {product?.price && !isNaN(product.price) && product?.discount
                                    ? ((product.price * product.discount) / 100).toLocaleString()
                                    : 0}{' '}
                                VNĐ ({product?.discount || 0}%)
                            </p>
                        </div>
                        <div className={cx('price-row')}>
                            <p className={cx('price-label')}>Bảo hành:</p>
                            <p className={cx('warranty-value')}>36 Tháng</p>
                        </div>
                    </div>

                    <ul className={cx('spec-list')}>{renderSpecifications()}</ul>
                </div>
            )}
        </div>
    );
}

export default CardBody;
