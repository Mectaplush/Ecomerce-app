import classNames from 'classnames/bind';
import styles from './LoginUser.module.scss';
import Header from '../../Components/Header/Header';
import { Form, Input, Button, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { requestLogin, requestLoginGoogle } from '../../config/request';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Footer from '../../Components/Footer/Footer';

const cx = classNames.bind(styles);

function LoginUser() {
    const navigate = useNavigate();
    const onFinish = async (values) => {
        try {
            await requestLogin(values);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            navigate('/');
            message.success('Đăng nhập thành công!');
        } catch (error) {
            console.log(error);
            message.error(error.response.data.message);
        }
    };

    const handleSuccess = async (response) => {
        const { credential } = response; // Nhận ID Token từ Google
        try {
            const res = await requestLoginGoogle(credential);
            message.success(res.message);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                message.error(error.response.data.message);
            } else {
                message.error('Đăng nhập bằng Google thất bại. Vui lòng thử lại!');
            }
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <div className={cx('inner')}>
                <Form name="login-form" className={cx('login-form')} onFinish={onFinish}>
                    <h2>Đăng nhập</h2>
                    <Form.Item
                        name="email"
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
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            {
                                required: true,
                                message: 'Vui lòng nhập mật khẩu!',
                            },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            onClick={onFinish}
                            type="primary"
                            htmlType="submit"
                            className={cx('login-button')}
                            size="large"
                            block
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>

                    <GoogleOAuthProvider clientId={import.meta.env.VITE_CLIENT_ID}>
                        <GoogleLogin onSuccess={handleSuccess} onError={() => console.log('Login Failed')} />
                    </GoogleOAuthProvider>

                    <div className={cx('form-footer')}>
                        <Row justify="space-between" align="middle">
                            <Col>
                                <Link to="/forgot-password" className={cx('forgot-password')}>
                                    Quên mật khẩu?
                                </Link>
                            </Col>
                            <Col>
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
