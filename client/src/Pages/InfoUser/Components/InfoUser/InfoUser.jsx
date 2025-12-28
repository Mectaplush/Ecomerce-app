import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Select, message, Avatar, Upload } from 'antd';
import { UserOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import AddressAutocomplete from '../../../../Components/AddressAutocomplete/AddressAutocomplete';
import styles from './InfoUser.module.scss';
import classNames from 'classnames/bind';
import { useStore } from '../../../../hooks/useStore';
import { requestUpdateUser, requestUploadAvatar, requestDeleteAvatar } from '../../../../config/request';

const cx = classNames.bind(styles);

function InfoUser() {
    const [form] = Form.useForm();
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [address, setAddress] = useState('');

    const { dataUser, fetchAuth } = useStore();

    useEffect(() => {
        if (dataUser?.address) {
            setAddress(dataUser.address);
        }
    }, [dataUser]);

    const onFinish = async (values) => {
        try {
            const data = {
                fullName: values.fullName,
                address: address,
                phone: values.phone,
            };
            await requestUpdateUser(data);
            await fetchAuth();
            message.success('Cập nhật thông tin cá nhân thành công!');
        } catch (error) {
            message.error('Có lỗi xảy ra khi cập nhật thông tin!');
        }
    };

    const handleAvatarUpload = async (info) => {
        if (info.file.status === 'uploading') {
            setAvatarLoading(true);
            return;
        }

        const file = info.file.originFileObj || info.file;

        // Validate file type
        const isImage = file.type?.startsWith('image/');
        if (!isImage) {
            message.error('Chỉ được upload file ảnh!');
            setAvatarLoading(false);
            return;
        }

        // Validate file size (5MB)
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('File ảnh phải nhỏ hơn 5MB!');
            setAvatarLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            await requestUploadAvatar(formData);
            await fetchAuth();
            message.success('Upload avatar thành công!');
        } catch (error) {
            message.error('Upload avatar thất bại!');
        } finally {
            setAvatarLoading(false);
        }
    };

    const handleDeleteAvatar = async () => {
        try {
            setAvatarLoading(true);
            await requestDeleteAvatar();
            await fetchAuth();
            message.success('Xóa avatar thành công!');
        } catch (error) {
            message.error('Xóa avatar thất bại!');
        } finally {
            setAvatarLoading(false);
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
            {/* Avatar Section */}
            <div className={cx('avatar-section')}>
                <div className={cx('avatar-container')}>
                    <Avatar size={120} src={dataUser?.avatar} icon={<UserOutlined />} className={cx('avatar')} />
                    <div className={cx('avatar-actions')}>
                        <Upload
                            name="avatar"
                            showUploadList={false}
                            beforeUpload={() => false}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />} loading={avatarLoading} size="small">
                                {dataUser?.avatar ? 'Đổi avatar' : 'Thêm avatar'}
                            </Button>
                        </Upload>
                        {dataUser?.avatar && (
                            <Button
                                icon={<DeleteOutlined />}
                                danger
                                size="small"
                                loading={avatarLoading}
                                onClick={handleDeleteAvatar}
                            >
                                Xóa
                            </Button>
                        )}
                    </div>
                </div>
                <p className={cx('avatar-hint')}>Kích thước tối đa 5MB. Định dạng: JPG, PNG, GIF, WEBP</p>
            </div>

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

                <AddressAutocomplete
                    value={address}
                    onChange={setAddress}
                    form={form}
                />

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
                        <Input placeholder="Nhập số điện thoại" />
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
