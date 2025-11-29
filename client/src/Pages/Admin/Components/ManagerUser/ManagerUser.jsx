import { useEffect, useState } from 'react';
import { Table, Space, Button, message, Popconfirm, Modal, Form, Select } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import classNames from 'classnames/bind';
import styles from './ManagerUser.module.scss';
import { requestGetUsers, requestUpdateRoleUser } from '../../../../config/request';

const cx = classNames.bind(styles);

function ManagerUser() {
    const [users, setUsers] = useState([]);
    const [loading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [form] = Form.useForm();

    const fetchUsers = async () => {
        const res = await requestGetUsers();
        setUsers(res.metadata);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditUser = (user) => {
        setSelectedUser(user);
        form.setFieldsValue({
            userId: user.id,
            role: user.isAdmin,
        });
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedUser(null);
        form.resetFields();
    };

    const handleOk = () => {
        form.submit();
    };

    const handleFinish = async (values) => {
        await requestUpdateRoleUser(values);
        await fetchUsers();
        message.success(`Cập nhật quyền người dùng thành công`);
        setIsModalVisible(false);
    };

    const columns = [
        {
            title: 'Họ và tên',
            dataIndex: 'fullName',
            key: 'fullName',
            sorter: (a, b) => a.fullName.localeCompare(b.fullName),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Vai trò',
            dataIndex: 'isAdmin',
            key: 'isAdmin',
            render: (isAdmin) => (isAdmin === '1' ? 'Admin' : 'User'),
            filters: [
                { text: 'Admin', value: '1' },
                { text: 'User', value: '0' },
            ],
            onFilter: (value, record) => record.isAdmin === value,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEditUser(record)}
                        className={cx('edit-btn')}
                    >
                        Sửa quyền
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className={cx('wrapper')}>
            <h2 className={cx('title')}>Quản lý người dùng</h2>
            <Table
                columns={columns}
                dataSource={users}
                rowKey="id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số ${total} người dùng`,
                }}
            />

            <Modal
                title="Chỉnh sửa quyền người dùng"
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                okText="Cập nhật"
                cancelText="Hủy"
                className={cx('permission-modal')}
            >
                {selectedUser && (
                    <div className={cx('user-info')}>
                        <p>
                            <strong>Họ và tên:</strong> {selectedUser.fullName}
                        </p>
                        <p>
                            <strong>Email:</strong> {selectedUser.email}
                        </p>
                    </div>
                )}
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                    <Form.Item name="userId" hidden>
                        <input />
                    </Form.Item>
                    <Form.Item
                        name="role"
                        label="Vai trò"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                    >
                        <Select>
                            <Select.Option value="0">User</Select.Option>
                            <Select.Option value="1">Admin</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default ManagerUser;
