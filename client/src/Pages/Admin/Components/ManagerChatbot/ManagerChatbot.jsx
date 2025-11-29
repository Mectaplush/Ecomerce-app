import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Modal, message, Tooltip, Select } from 'antd';
import {
    EyeOutlined,
    DeleteOutlined,
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    HomeOutlined,
    SyncOutlined,
    RobotOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import {
    requestGetAllConversations,
    requestGetConversationDetail,
    requestUpdateConversationStatus,
    requestDeleteConversation,
    requestReanalyzeConversation,
    requestReanalyzeAllConversations,
} from '../../../../config/request';
import styles from './ManagerChatbot.module.scss';
import classNames from 'classnames/bind';

const cx = classNames.bind(styles);
const { Title, Text } = Typography;
const { Option } = Select;

function ManagerChatbot() {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [conversationMessages, setConversationMessages] = useState([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState(null);

    // Fetch conversations
    const fetchConversations = async () => {
        setLoading(true);
        try {
            const { metadata } = await requestGetAllConversations();
            setConversations(metadata || []);
        } catch (error) {
            message.error('Không thể tải danh sách cuộc trò chuyện');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // View conversation details
    const viewConversation = async (record) => {
        setLoading(true);
        try {
            const { metadata } = await requestGetConversationDetail(record.id);
            setCurrentConversation(metadata.conversation);
            setConversationMessages(metadata.messages || []);
            setViewModalVisible(true);
        } catch (error) {
            message.error('Không thể tải chi tiết cuộc trò chuyện');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Update status
    const handleStatusChange = async (conversationId, newStatus) => {
        setLoading(true);
        try {
            await requestUpdateConversationStatus(conversationId, newStatus);
            message.success('Cập nhật trạng thái thành công');
            fetchConversations();
        } catch (error) {
            message.error('Không thể cập nhật trạng thái');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Delete conversation
    const showDeleteModal = (record) => {
        setConversationToDelete(record);
        setDeleteModalVisible(true);
    };

    const handleDeleteConversation = async () => {
        setLoading(true);
        try {
            await requestDeleteConversation(conversationToDelete.id);
            message.success('Xóa cuộc trò chuyện thành công');
            setDeleteModalVisible(false);
            fetchConversations();
        } catch (error) {
            message.error('Không thể xóa cuộc trò chuyện');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Reanalyze single conversation
    const handleReanalyzeConversation = async (conversationId) => {
        setLoading(true);
        try {
            const { metadata } = await requestReanalyzeConversation(conversationId);
            message.success(`Phân tích thành công! Trạng thái mới: ${metadata.newStatus}`);
            fetchConversations();
        } catch (error) {
            message.error('Không thể phân tích cuộc trò chuyện');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Reanalyze all conversations
    const handleReanalyzeAll = async () => {
        Modal.confirm({
            title: 'Xác nhận phân tích lại tất cả',
            content:
                'Bạn có chắc muốn chạy AI phân tích lại tất cả cuộc trò chuyện? Quá trình này có thể mất vài phút.',
            okText: 'Phân tích',
            cancelText: 'Hủy',
            onOk: async () => {
                setLoading(true);
                try {
                    const { metadata } = await requestReanalyzeAllConversations();
                    message.success(`Hoàn thành! Đã phân tích ${metadata.analyzed}/${metadata.total} cuộc trò chuyện`);
                    fetchConversations();
                } catch (error) {
                    message.error('Không thể phân tích tất cả cuộc trò chuyện');
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    // Handle table change
    const handleTableChange = (pagination) => {
        setPagination(pagination);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 100,
            ellipsis: true,
            render: (id) => (
                <Tooltip title={id}>
                    <span>{id.substring(0, 8)}...</span>
                </Tooltip>
            ),
        },
        {
            title: 'Người dùng',
            dataIndex: 'user',
            key: 'user',
            render: (user) => (
                <div>
                    <div>
                        <UserOutlined /> <strong>{user?.fullName || 'N/A'}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                        <MailOutlined /> {user?.email || 'N/A'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Thông tin liên hệ',
            dataIndex: 'user',
            key: 'contact',
            render: (user) => (
                <div>
                    {user?.phone && (
                        <div>
                            <PhoneOutlined /> <a href={`tel:${user.phone}`}>{user.phone}</a>
                        </div>
                    )}
                    {user?.address && (
                        <div style={{ fontSize: '12px', color: '#888' }}>
                            <HomeOutlined /> {user.address}
                        </div>
                    )}
                    {!user?.phone && !user?.address && <span style={{ color: '#ccc' }}>Chưa có</span>}
                </div>
            ),
        },
        {
            title: 'Số tin nhắn',
            dataIndex: 'messageCount',
            key: 'messageCount',
            width: 120,
            render: (count) => <Tag color="blue">{count} tin nhắn</Tag>,
        },
        {
            title: 'Tin nhắn cuối',
            dataIndex: 'lastMessage',
            key: 'lastMessage',
            ellipsis: true,
            render: (text) => (
                <Tooltip title={text}>
                    <span>{text && text.length > 50 ? text.substring(0, 50) + '...' : text}</span>
                </Tooltip>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status, record) => {
                let color = 'default';
                let text = 'Chưa xử lý';

                if (status === 'spam') {
                    color = 'red';
                    text = 'Spam';
                } else if (status === 'interested') {
                    color = 'green';
                    text = 'Quan tâm';
                } else if (status === 'pending') {
                    color = 'orange';
                    text = 'Chưa xử lý';
                }

                return (
                    <Select
                        value={status}
                        style={{ width: 130 }}
                        onChange={(value) => handleStatusChange(record.id, value)}
                        disabled={loading}
                    >
                        <Option value="pending">
                            <Tag color="orange">Chưa xử lý</Tag>
                        </Option>
                        <Option value="interested">
                            <Tag color="green">Quan tâm</Tag>
                        </Option>
                        <Option value="spam">
                            <Tag color="red">Spam</Tag>
                        </Option>
                    </Select>
                );
            },
        },
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 200,
            render: (_, record) => (
                <Space>
                    <Button type="primary" icon={<EyeOutlined />} onClick={() => viewConversation(record)} size="small">
                        Xem
                    </Button>
                    <Tooltip title="Phân tích lại bằng AI">
                        <Button
                            icon={<RobotOutlined />}
                            onClick={() => handleReanalyzeConversation(record.id)}
                            size="small"
                        />
                    </Tooltip>
                    <Button danger icon={<DeleteOutlined />} onClick={() => showDeleteModal(record)} size="small">
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ];

    // Count statistics
    const statistics = {
        total: conversations.length,
        spam: conversations.filter((c) => c.status === 'spam').length,
        interested: conversations.filter((c) => c.status === 'interested').length,
        pending: conversations.filter((c) => c.status === 'pending').length,
    };

    return (
        <div style={{ padding: '20px' }}>
            <Card>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                    }}
                >
                    <Title level={2} style={{ margin: 0 }}>
                        Quản Lý Cuộc Trò Chuyện Chatbot
                    </Title>
                    <Button
                        type="primary"
                        icon={<SyncOutlined />}
                        onClick={handleReanalyzeAll}
                        loading={loading}
                        size="large"
                    >
                        Phân tích tất cả bằng AI
                    </Button>
                </div>
                <Space size="large" style={{ marginBottom: '20px' }}>
                    <Text>
                        Tổng: <strong>{statistics.total}</strong>
                    </Text>
                    <Text>
                        Quan tâm: <Tag color="green">{statistics.interested}</Tag>
                    </Text>
                    <Text>
                        Spam: <Tag color="red">{statistics.spam}</Tag>
                    </Text>
                    <Text>
                        Chưa xử lý: <Tag color="orange">{statistics.pending}</Tag>
                    </Text>
                </Space>

                <Table
                    columns={columns}
                    dataSource={conversations}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        total: conversations.length,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Tổng ${total} cuộc trò chuyện`,
                    }}
                    loading={loading}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* Modal xem chi tiết */}
            <Modal
                title="Chi Tiết Cuộc Trò Chuyện"
                visible={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)}>
                        Đóng
                    </Button>,
                ]}
                width={800}
            >
                {currentConversation && (
                    <div>
                        <Card style={{ marginBottom: '15px' }}>
                            <Title level={4}>Thông Tin Người Dùng</Title>
                            <p>
                                <UserOutlined /> <strong>Họ và tên:</strong>{' '}
                                {currentConversation.user?.fullName || 'N/A'}
                            </p>
                            <p>
                                <MailOutlined /> <strong>Email:</strong> {currentConversation.user?.email || 'N/A'}
                            </p>
                            {currentConversation.user?.phone && (
                                <p>
                                    <PhoneOutlined /> <strong>Số điện thoại:</strong>{' '}
                                    <a href={`tel:${currentConversation.user.phone}`}>
                                        {currentConversation.user.phone}
                                    </a>
                                </p>
                            )}
                            {currentConversation.user?.address && (
                                <p>
                                    <HomeOutlined /> <strong>Địa chỉ:</strong> {currentConversation.user.address}
                                </p>
                            )}
                            <p>
                                <strong>Trạng thái:</strong>{' '}
                                {currentConversation.status === 'spam' && <Tag color="red">Spam</Tag>}
                                {currentConversation.status === 'interested' && <Tag color="green">Quan tâm</Tag>}
                                {currentConversation.status === 'pending' && <Tag color="orange">Chưa xử lý</Tag>}
                            </p>
                            <p>
                                <strong>Thời gian bắt đầu:</strong>{' '}
                                {moment(currentConversation.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        </Card>

                        <Card>
                            <Title level={4}>Lịch Sử Trò Chuyện ({conversationMessages.length} tin nhắn)</Title>
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {conversationMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            padding: '10px',
                                            marginBottom: '10px',
                                            backgroundColor: msg.sender === 'user' ? '#e6f7ff' : '#f0f0f0',
                                            borderRadius: '8px',
                                            borderLeft:
                                                msg.sender === 'user' ? '3px solid #1890ff' : '3px solid #52c41a',
                                        }}
                                    >
                                        <div style={{ marginBottom: '5px' }}>
                                            <strong>{msg.sender === 'user' ? '👤 Người dùng' : '🤖 Chatbot'}</strong>
                                            <span style={{ float: 'right', fontSize: '12px', color: '#888' }}>
                                                {moment(msg.createdAt).format('HH:mm:ss DD/MM/YYYY')}
                                            </span>
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                )}
            </Modal>

            {/* Modal xác nhận xóa */}
            <Modal
                title="Xác Nhận Xóa Cuộc Trò Chuyện"
                visible={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                onOk={handleDeleteConversation}
                okButtonProps={{ danger: true, loading: loading }}
                okText="Xóa"
                cancelText="Hủy"
            >
                <p>
                    Bạn có chắc chắn muốn xóa cuộc trò chuyện với{' '}
                    <strong>{conversationToDelete?.user?.fullName}</strong>?
                </p>
                <p>Hành động này sẽ xóa tất cả tin nhắn trong cuộc trò chuyện và không thể hoàn tác.</p>
            </Modal>
        </div>
    );
}

export default ManagerChatbot;
