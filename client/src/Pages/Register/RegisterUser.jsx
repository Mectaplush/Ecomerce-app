import classNames from 'classnames/bind';
import styles from './RegisterUser.module.scss';
import Header from '../../Components/Header/Header';
import { Form, Input, Button, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { requestRegister } from '../../config/request';
import { useState, useEffect } from 'react';
import Footer from '../../Components/Footer/Footer';

const cx = classNames.bind(styles);

function RegisterUser() {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();

    // Detect screen size for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onFinish = async (values) => {
        try {
            setLoading(true);
            await requestRegister(values);
            message.success({
                content: 'Đăng ký thành công!',
                duration: 2,
                style: {
                    marginTop: '20vh',
                },
            });
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Đăng ký thất bại!';
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
            content: 'Vui lòng kiểm tra lại thông tin đăng ký!',
            duration: 2,
            style: {
                marginTop: '20vh',
            },
        });
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <div className={cx('inner')}>
                <Form
                    form={form}
                    name="register-form"
                    className={cx('register-form')}
                    onFinish={onFinish}
                    onFinishFailed={onFinishFailed}
                    layout="vertical"
                    validateTrigger={['onBlur']}
                    scrollToFirstError
                    requiredMark={false}
                    preserve={false}
                >
                    <h2>Đăng ký tài khoản</h2>

                    <Form.Item
                        name="fullName"
                        rules={[
                            { required: true, message: 'Vui lòng nhập họ tên!' },
                            { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder={isMobile ? 'Họ và tên' : 'Nhập họ và tên đầy đủ'}
                            size="large"
                            autoComplete="name"
                        />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input
                            prefix={<MailOutlined />}
                            placeholder={isMobile ? 'Email' : 'Nhập địa chỉ email của bạn'}
                            size="large"
                            autoComplete="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            inputMode="email"
                        />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                            { pattern: /^[0-9]{10}$/, message: 'Số điện thoại phải có 10 chữ số!' },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input
                            prefix={<PhoneOutlined />}
                            placeholder={isMobile ? 'Số điện thoại' : 'Nhập số điện thoại (10 chữ số)'}
                            size="large"
                            autoComplete="tel"
                            inputMode="tel"
                        />
                    </Form.Item>

                    <Form.Item
                        name="address"
                        rules={[
                            { required: true, message: 'Vui lòng nhập địa chỉ!' },
                            { min: 5, message: 'Địa chỉ phải có ít nhất 5 ký tự!' },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input
                            prefix={<HomeOutlined />}
                            placeholder={isMobile ? 'Địa chỉ' : 'Nhập địa chỉ chi tiết'}
                            size="large"
                            autoComplete="address-line1"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={isMobile ? 'Mật khẩu' : 'Nhập mật khẩu (ít nhất 6 ký tự)'}
                            size="large"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                },
                            }),
                        ]}
                        hasFeedback
                        validateFirst
                    >
                        <Input.Password
                            prefix={<LockOutlined />}
                            placeholder={isMobile ? 'Xác nhận mật khẩu' : 'Nhập lại mật khẩu để xác nhận'}
                            size="large"
                            autoComplete="new-password"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className={cx('register-button')}
                            size="large"
                            block
                            loading={loading}
                            disabled={loading}
                        >
                            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                        </Button>
                    </Form.Item>

                    <div className={cx('form-footer')}>
                        <Row justify="center">
                            <Col>
                                <span className={cx('login-text')}>
                                    Đã có tài khoản?{' '}
                                    <Link to="/login" className={cx('login-link')}>
                                        Đăng nhập ngay
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

export default RegisterUser;
