import classNames from 'classnames/bind';
import styles from './Blogs.module.scss';
import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { useEffect, useState } from 'react';
import { requestGetBlogs } from '../../config/request';
import { Row, Col, Card, Typography, Space, Divider, Avatar } from 'antd';
import { UserOutlined, ClockCircleOutlined, EyeOutlined, CommentOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const cx = classNames.bind(styles);
const { Title, Text, Paragraph } = Typography;

function Blogs() {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await requestGetBlogs();
                setBlogs(res.metadata);
            } catch (error) {
                console.error('Error fetching blogs:', error);
            } finally {
                setLoading(false);
            }
        };
        setTimeout(() => {
            fetchData();
        }, 500);
    }, []);

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main>
                <div className={cx('container')}>
                    <div className={cx('blogs')}>
                        <Row gutter={[24, 24]}>
                            {loading ? (
                                // Loading placeholders
                                [...Array(4)].map((_, index) => (
                                    <Col xs={24} md={12} lg={8} xl={6} key={`loading-${index}`}>
                                        <Card loading className={cx('blog-card')} />
                                    </Col>
                                ))
                            ) : blogs.length > 0 ? (
                                blogs.map((blog) => (
                                    <Link to={`/blog/${blog.id}`}>
                                        <Col xs={24} key={blog.id}>
                                            <Card
                                                className={cx('blog-card')}
                                                cover={
                                                    blog.thumbnail && (
                                                        <img
                                                            alt={blog.title}
                                                            src={blog.image}
                                                            className={cx('blog-image')}
                                                        />
                                                    )
                                                }
                                                bordered={false}
                                            >
                                                <Title level={3} className={cx('blog-title')}>
                                                    {blog.title}
                                                </Title>

                                                <div className={cx('blog-meta')}>
                                                    <Space>
                                                        <Avatar size="small" icon={<UserOutlined />} />
                                                        <Text strong>{blog.author || 'Admin'}</Text>
                                                    </Space>
                                                    <Divider type="vertical" />
                                                    <Space>
                                                        <ClockCircleOutlined />
                                                        <Text>
                                                            {new Date(blog.createdAt).toLocaleDateString('vi-VN')},{' '}
                                                            {new Date(blog.createdAt).toLocaleTimeString('vi-VN')}
                                                        </Text>
                                                    </Space>
                                                </div>

                                                <p
                                                    id={cx('content')}
                                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                                />
                                            </Card>
                                        </Col>
                                    </Link>
                                ))
                            ) : (
                                <Col span={24}>
                                    <Card>
                                        <Text>Không có bài viết nào.</Text>
                                    </Card>
                                </Col>
                            )}
                        </Row>
                    </div>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Blogs;
