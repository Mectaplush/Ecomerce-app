import classNames from 'classnames/bind';
import styles from './RegisterUser.module.scss';
import Header from '../../Components/Header/Header';
import { Form, Input, Button, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined, HomeOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { requestRegister } from '../../config/request';
import Footer from '../../Components/Footer/Footer';

const cx = classNames.bind(styles);

function RegisterUser() {
    const navigate = useNavigate();
    const onFinish = async (values) => {
        try {
            await requestRegister(values);
            message.success('đăng ký thành công');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (error) {
            message.error(error.response.data.message);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <div className={cx('inner')}>
                <Form name="register-form" className={cx('register-form')} onFinish={onFinish}>
                    <h2>Đăng ký tài khoản</h2>

                    <Form.Item name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}>
                        <Input prefix={<UserOutlined />} placeholder="Họ và tên" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                            { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                        ]}
                    >
                        <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" size="large" />
                    </Form.Item>

                    <Form.Item name="address" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}>
                        <Input prefix={<HomeOutlined />} placeholder="Địa chỉ" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" size="large" />
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
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" size="large" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className={cx('register-button')} size="large" block>
                            Đăng ký
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
