import classNames from 'classnames/bind';
import styles from './HomePage.module.scss';
import SlideHome from './Components/SlideHome/SlideHome';

import CardBody from '../CardBody/CardBody';
import { useEffect, useState } from 'react';
import { requestGetBlogs, requestGetProductHotSale, requestGetProductsByCategories } from '../../config/request';

import Slider from 'react-slick';
import { useNavigate, Link } from 'react-router-dom';
import { Row, Col, Card, Typography, Divider, Button } from 'antd';

const { Title, Paragraph } = Typography;

const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 6,
    slidesToScroll: 1,
    autoplay: true, // Thêm dòng này
    autoplaySpeed: 3000, // Và dòng này (3 giây chuyển 1 lần)
};
const cx = classNames.bind(styles);

function HomePage() {
    const [category, setCategory] = useState([]);
    const [showBackToTop, setShowBackToTop] = useState(false);

    const [productHotSale, setProductHotSale] = useState([]);

    const [blogs, setBlogs] = useState([]);

    const fetchBlogs = async () => {
        const res = await requestGetBlogs();
        setBlogs(res.metadata);
    };

    const fetchProductHotSale = async () => {
        const res = await requestGetProductHotSale();
        setProductHotSale(res);
    };

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo(0, 0);

        const fetchData = async () => {
            const res = await requestGetProductsByCategories();
            setCategory(res.metadata);
        };
        fetchData();
        fetchProductHotSale();
        fetchBlogs();

        // Add scroll event listener
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);

        // Clean up
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const navigate = useNavigate();

    return (
        <div className={cx('wrapper')}>
            <div className={cx('parent')}>
                <div className={cx('div1')}>
                    <SlideHome />
                </div>
                <div className={cx('div2')}>
                    <img src="https://pcmarket.vn/media/banner/banner3-new.jpg" alt="" />
                </div>
                <div className={cx('div3')}>
                    <img src="https://pcmarket.vn/media/banner/Banner4-new.jpg" alt="" />
                </div>
                <div className={cx('div4')}>
                    <img src="https://pcmarket.vn/media/banner/banner5.jpg" alt="" />
                </div>
            </div>

            <div className={cx('hot-sale')}>
                <div>
                    <img
                        style={{ width: '20%', height: '50px' }}
                        src="https://pcmarket.vn/static/assets/2021/images/hot-sale-cuoi-tuan-1.gif"
                        alt=""
                    />
                </div>
                <Slider {...settings}>
                    {productHotSale.map((product) => (
                        <div className={cx('hot-sale-item')}>
                            <CardBody product={product} />
                        </div>
                    ))}
                </Slider>
            </div>

            <div className={cx('category-list')}>
                {category.map((item) => (
                    <div>
                        <div className={cx('category-item')} key={item.id}>
                            <h2>{item.category.name}</h2>
                            <button onClick={() => navigate(`/category/${item.category.id}`)}>Xem tất cả</button>
                        </div>
                        <div className={cx('slider-container')}>
                            <Slider {...settings}>
                                {item.products.map((product) => (
                                    <div>
                                        <CardBody product={product} />
                                    </div>
                                ))}
                            </Slider>
                        </div>
                    </div>
                ))}
            </div>

            <div className={cx('blogs-section')}>
                <Divider>
                    <Title style={{ margin: '20px' }} level={2}>
                        Tin tức và Kết nối
                    </Title>
                    <Link to="/blogs">
                        <Button>Xem tất cả</Button>
                    </Link>
                </Divider>

                <Row gutter={[24, 24]} style={{ marginTop: '20px' }}>
                    {blogs.map((blog) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={blog.id}>
                            <Card
                                hoverable
                                cover={
                                    <img
                                        src={blog.image}
                                        alt={blog.title}
                                        style={{ height: '200px', objectFit: 'cover' }}
                                    />
                                }
                                onClick={() => navigate(`/blog/${blog.id}`)}
                                className={cx('blog-card')}
                            >
                                <Card.Meta
                                    title={blog.title}
                                    description={
                                        <Paragraph ellipsis={{ rows: 2 }}>
                                            {blog.description || 'Xem chi tiết...'}
                                        </Paragraph>
                                    }
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>
            </div>

            {showBackToTop && (
                <button
                    className={cx('back-to-top')}
                    onClick={scrollToTop}
                    style={{
                        position: 'fixed',
                        bottom: '20px',
                        right: '20px',
                        zIndex: 999,
                        padding: '10px 15px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                    }}
                >
                    ↑ Lên đầu trang
                </button>
            )}
        </div>
    );
}

export default HomePage;
