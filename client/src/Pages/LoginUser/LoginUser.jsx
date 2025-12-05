import classNames from 'classnames/bind';
import styles from './LoginUser.module.scss';
import Header from '../../Components/Header/Header';
import { Form, Input, Button, Row, Col, message, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { requestLogin, requestLoginGoogle } from '../../config/request';
import { useState, useEffect } from 'react';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Footer from '../../Components/Footer/Footer';

const cx = classNames.bind(styles);

function LoginUser() {
    const [form] = Form.useForm(); // Thêm form instance
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const navigate = useNavigate();

    // Detect screen size for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setIsMobile(width <= 480);
            setIsTablet(width > 480 && width <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onFinish = async (values) => {
        try {
            setLoading(true);
            await requestLogin(values);
            message.success({
                content: 'Đăng nhập thành công!',
                duration: 2,
                style: {
                    marginTop: '20vh',
                },
            });
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            navigate('/');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đăng nhập thất bại!';
            message.error({
                content: errorMessage,
                duration: 3,
                style: {
                    marginTop: '20vh',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const onFinishFailed = (errorInfo) => {
        console.log('Failed:', errorInfo);
        message.error({
            content: 'Vui lòng kiểm tra lại thông tin đăng nhập!',
            duration: 2,
            style: {
                marginTop: '20vh',
            },
        });
    };

    const handleSuccess = async (response) => {
        const { credential } = response;
        try {
            setLoading(true);
            const res = await requestLoginGoogle(credential);
            message.success({
                content: res.message || 'Đăng nhập thành công!',
                duration: 2,
                style: {
                    marginTop: '20vh',
                },
            });
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đăng nhập bằng Google thất bại. Vui lòng thử lại!';
            message.error({
                content: errorMessage,
                duration: 3,
                style: {
                    marginTop: '20vh',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    const handleError = () => {
        message.error({
            content: 'Đăng nhập Google thất bại!',
            duration: 2,
            style: {
                marginTop: '20vh',
            },
        });
    };

    // Get responsive size for components
    const getComponentSize = () => {
        if (isMobile) return 'large';
        if (isTablet) return 'large';
        return 'large';
    };

    const getGoogleLoginSize = () => {
        if (isMobile) return 'large';
        return 'large';
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <div className={cx('inner')}>
                <Form
                    form={form} // Thêm form instance
                    name="login-form"
                    className={cx('login-form')}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed} // Thêm handler cho failed
                    layout="vertical"
                    size={getComponentSize()}
                    validateTrigger={['onBlur']} // Chỉ dùng onBlur để tránh validate liên tục
                    scrollToFirstError
                    requiredMark={false}
                    preserve={false} // Reset form khi unmount
                >
                    <h2>Đăng nhập</h2>

                    <Form.Item
                        name="email"
                        label={<span style={{ fontWeight: 600, color: '#2c3e50' }}>Email</span>}
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập email!',
                            },
                            {
                                type: 'email',
                                message: 'Email không hợp lệ!',
                            },
                        ]}
                        hasFeedback
                        validateFirst // Validate từng rule một
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder={isMobile ? 'Nhập email' : 'Nhập địa chỉ email của bạn'}
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            inputMode="email"
                            size="large"
                            allowClear
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<span style={{ fontWeight: 600, color: '#2c3e50' }}>Mật khẩu</span>}
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập mật khẩu!',
                            },
                            {
                                min: 6,
                                message: 'Mật khẩu phải có ít nhất 6 ký tự!',
                            },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={isMobile ? 'Nhập mật khẩu' : 'Nhập mật khẩu của bạn'}
                            autoComplete="current-password"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className={cx('login-button')}
                            loading={loading}
                            block
                            size="large"
                            disabled={loading} // Disable khi đang loading
                        >
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                        </Button>
                    </Form.Item>

                    {/* Google Login with responsive container */}
                    <div className={cx('google-login-container')}>
                        <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    marginTop: isMobile ? '16px' : '20px',
                                }}
                            >
                                <GoogleLogin
                                    onSuccess={handleSuccess}
                                    onError={handleError}
                                    size={getGoogleLoginSize()}
                                    shape="rectangular"
                                    theme="outline"
                                    text="signin_with"
                                    width={isMobile ? 300 : 360}
                                    disabled={loading} // Disable khi đang login
                                />
                            </div>
                        </GoogleOAuthProvider>
                    </div>

                    <div className={cx('form-footer')}>
                        <Row justify="space-between" align="middle" gutter={[0, isMobile || isTablet ? 16 : 0]}>
                            <Col
                                xs={24}
                                sm={12}
                                style={{
                                    textAlign: isMobile || isTablet ? 'center' : 'left',
                                }}
                            >
                                <Link to="/forgot-password" className={cx('forgot-password')}>
                                    Quên mật khẩu?
                                </Link>
                            </Col>
                            <Col
                                xs={24}
                                sm={12}
                                style={{
                                    textAlign: isMobile || isTablet ? 'center' : 'right',
                                }}
                            >
                                <span className={cx('register-text')}>
                                    Chưa có tài khoản?{' '}
                                    <Link to="/register" className={cx('register-link')}>
                                        Đăng ký ngay
                                    </Link>
                                </span>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </div>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default LoginUser;
