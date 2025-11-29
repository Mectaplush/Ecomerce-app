import classNames from 'classnames/bind';
import styles from './ForgotPassword.module.scss';
import Header from '../../Components/Header/Header';
import { Form, Input, Button, message } from 'antd';
import { MailOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import Footer from '../../Components/Footer/Footer';
import { requestForgotPassword, requestResetPassword } from '../../config/request';
import { useNavigate } from 'react-router-dom';

import Cookies from 'js-cookie';

const cx = classNames.bind(styles);

function ForgotPassword() {
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [form] = Form.useForm();

    useEffect(() => {
        const token = Cookies.get('tokenResetPassword');
        if (token) {
            setIsEmailSent(true);
        }
    }, []);

    const navigate = useNavigate();

    const handleSendEmail = async (values) => {
        try {
            await requestForgotPassword(values);
            message.success('Mã OTP đã được gửi đến email của bạn!');
            setIsEmailSent(true);
        } catch (error) {
            message.error('Có lỗi xảy ra. Vui lòng thử lại!');
        }
    };

    const handleResetPassword = async (values) => {
        try {
            await requestResetPassword(values);
            message.success('Đặt lại mật khẩu thành công!');
            setTimeout(() => {
                navigate('/login');
            }, 1000);
        } catch (error) {
            message.error('Có lỗi xảy ra. Vui lòng thử lại!');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>
            <div className={cx('inner')}>
                {!isEmailSent ? (
                    <Form name="email-form" className={cx('forgot-form')} onFinish={handleSendEmail}>
                        <h2>Quên mật khẩu</h2>
                        <p className={cx('description')}>Nhập email của bạn để nhận mã OTP đặt lại mật khẩu</p>

                        <Form.Item
                            name="email"
                            rules={[
                                { required: true, message: 'Vui lòng nhập email!' },
                                { type: 'email', message: 'Email không hợp lệ!' },
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className={cx('submit-button')} size="large" block>
                                Gửi mã OTP
                            </Button>
                        </Form.Item>
                    </Form>
                ) : (
                    <Form
                        name="reset-password-form"
                        className={cx('forgot-form')}
                        onFinish={handleResetPassword}
                        form={form}
                    >
                        <h2>Đặt lại mật khẩu</h2>
                        <p className={cx('description')}>Nhập mã OTP và mật khẩu mới của bạn</p>

                        <Form.Item
                            name="otp"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mã OTP!' },
                                { len: 6, message: 'Mã OTP phải có 6 ký tự!' },
                            ]}
                        >
                            <Input prefix={<KeyOutlined />} placeholder="Nhập mã OTP" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="newPassword"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" size="large" />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Xác nhận mật khẩu mới"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className={cx('submit-button')} size="large" block>
                                Đặt lại mật khẩu
                            </Button>
                        </Form.Item>
                    </Form>
                )}
            </div>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default ForgotPassword;
