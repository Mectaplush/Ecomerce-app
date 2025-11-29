import React, { useEffect } from 'react';
import { Form, Input, Button, Card, Select, message } from 'antd';
import styles from './InfoUser.module.scss';
import classNames from 'classnames/bind';
import { useStore } from '../../../../hooks/useStore';
import { requestUpdateUser } from '../../../../config/request';

const cx = classNames.bind(styles);

function InfoUser() {
    const [form] = Form.useForm();

    const { dataUser, fetchAuth } = useStore();

    const onFinish = async (values) => {
        try {
            const data = {
                fullName: values.fullName,
                address: values.address,
                phone: values.phone,
            };
            await requestUpdateUser(data);
            await fetchAuth();
            message.success('Cập nhật thông tin cá nhân thành công!');
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật thông tin!');
        }
    };

    useEffect(() => {
        form.setFieldsValue({
            fullName: dataUser?.fullName,
            email: dataUser?.email,
            address: dataUser.address,
            phone: dataUser.phone,
        });
    }, [dataUser]);

    return (
        <Card title="Cập nhật thông tin cá nhân" className={cx('info-card')}>
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                className={cx('form')}
                initialValues={{
                    fullName: dataUser?.fullName,
                    email: dataUser?.email,
                    address: dataUser.address,
                    phone: dataUser.phone,
                }}
            >
                <div className={cx('form-row')}>
                    <Form.Item
                        name="fullName"
                        label="Họ tên"
                        className={cx('form-item')}
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        className={cx('form-item')}
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input disabled value={dataUser?.email} />
                    </Form.Item>
                </div>

                <div className={cx('form-row')}>
                    <Form.Item
                        name="address"
                        label="Địa chỉ nhà"
                        className={cx('form-item')}
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                    >
                        <Input />
                    </Form.Item>
                </div>

                <div className={cx('form-row')}>
                    <Form.Item
                        name="phone"
                        label="Điện thoại"
                        className={cx('form-item')}
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                            { pattern: /^[0-9]{10}$/, message: 'Số điện thoại không hợp lệ!' },
                        ]}
                    >
                        <Input />
                    </Form.Item>
                </div>

                <Form.Item className={cx('submit-button')}>
                    <Button type="primary" htmlType="submit">
                        Thay đổi
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}

export default InfoUser;
