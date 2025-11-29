import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Tag, Space, Button, Modal, message, Tooltip, Input, DatePicker } from 'antd';
import { SearchOutlined, PhoneOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import moment from 'moment';
import { requestGetContacts } from '../../../../config/request';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Fake data cho danh sách liên hệ
const fakeContacts = [
    {
        id: '12345678-abcd-1234-5678-abcdef123456',
        fullName: 'Nguyễn Văn An',
        phone: '0912345678',
        option1: 'Có',
        option2: 'Chơi Game Esport: Đột kích, LOL, FIFA, CSGO, PUBG',
        option3: 'PC 70-100 triệu Luxury I9 14900K + RTX 4090 + 32GB RAM + 2TB SSD',
        option4: 'Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền còn lại',
        createdAt: '2023-06-12T10:30:00Z',
    },
    {
        id: '23456789-bcde-2345-6789-bcdef234567',
        fullName: 'Trần Thị Bình',
        phone: '0923456789',
        option1: 'Muốn được tư vấn cấu hình rồi mua',
        option2: 'Làm Việc đồ họa 2D: Adobe Photoshop, Lightroom, illustrator',
        option3: 'PC 20 triệu - Thiên về Đồ họa với RTX 3060 12GB + I5 13500/32GB RAM/ 500GB SSD',
        option4: 'Thanh toán toàn bộ nhận hàng nhanh nhất',
        createdAt: '2023-06-11T14:20:00Z',
    },
    {
        id: '34567890-cdef-3456-7890-cdef345678',
        fullName: 'Lê Hoàng Công',
        phone: '0934567890',
        option1: 'Tham khảo (mua sau)',
        option2: 'Dựng phim-Render Video: Adobe Premiere, After Effects, DaVinci Resolve, Capcut...',
        option3:
            'PC 25 triệu: Chơi game 2K Maxseting + Thoải mái làm việc đồ họa: I5 13500 + RTX 3070TI + 32GB RAM + 1TB SSD',
        option4: 'Mua và thanh toán trực tiếp tại cửa hàng',
        createdAt: '2023-06-10T09:15:00Z',
    },
    {
        id: '45678901-defg-4567-8901-defg456789',
        fullName: 'Phạm Đình Dương',
        phone: '0945678901',
        option1: 'Không',
        option2: 'Làm việc đồ họa 3D: 3Ds Max, Sketchup, Vray, Chaos Vantage, Enscape, Lumion, Blender, AUTO CAD',
        option3:
            'PC 40-50 Triệu: Cao cấp hướng tới đáp ứng toàn bộ nhu cầu (Hiệu năng - Đẹp - Bền Bỉ): I7 14700K + RTX 4070TI + 32GB RAM + 1TB SSD',
        option4: 'Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền còn lại',
        createdAt: '2023-06-09T16:45:00Z',
    },
    {
        id: '56789012-efgh-5678-9012-efgh567890',
        fullName: 'Vũ Thị Hà',
        phone: '0956789012',
        option1: 'Có',
        option2: 'Chơi Game nặng + Livestream: GTA 5, Game AAA, Game Offline nặng',
        option3:
            'PC 15 triệu - Hiệu Suất Cao cho cả Gaming + Làm việc tầm trung Livestream: với RTX 2060 Super 8GB - I5 12400F/ 500GB SSD/',
        option4: 'Thanh toán toàn bộ nhận hàng nhanh nhất',
        createdAt: '2023-06-08T11:30:00Z',
    },
    {
        id: '67890123-fghi-6789-0123-fghi678901',
        fullName: 'Hoàng Minh Hiếu',
        phone: '0967890123',
        option1: 'Có',
        option2: 'Làm việc Training AI',
        option3: 'PC Làm việc AI 50-200 Triệu',
        option4: 'Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền còn lại',
        createdAt: '2023-06-07T13:20:00Z',
    },
    {
        id: '78901234-ghij-7890-1234-ghij789012',
        fullName: 'Nguyễn Thị Giang',
        phone: '0978901234',
        option1: 'Muốn được tư vấn cấu hình rồi mua',
        option2: 'Chơi Game Esport: Đột kích, LOL, FIFA, CSGO, PUBG',
        option3: 'PC 7-8 Triệu - Chơi Game Phổ thông LOL, FC Online, CS2',
        option4: 'Mua và thanh toán trực tiếp tại cửa hàng',
        createdAt: '2023-06-06T10:10:00Z',
    },
    {
        id: '89012345-hijk-8901-2345-hijk890123',
        fullName: 'Trần Đức Khang',
        phone: '0989012345',
        option1: 'Có',
        option2: 'Chơi Game nặng + Livestream: GTA 5, Game AAA, Game Offline nặng',
        option3:
            'PC 150-200 Triệu Super MAX Luxury Custom PC: Tản nhiệt + Vỏ Case: I9 14900K + RTX 4090 + 192 Gb RAM + 8TB SSD + PSU 1200W',
        option4: 'Thanh toán toàn bộ nhận hàng nhanh nhất',
        createdAt: '2023-06-05T15:30:00Z',
    },
    {
        id: '90123456-ijkl-9012-3456-ijkl901234',
        fullName: 'Lê Quỳnh Mai',
        phone: '0990123456',
        option1: 'Tham khảo (mua sau)',
        option2: 'Dựng phim-Render Video: Adobe Premiere, After Effects, DaVinci Resolve, Capcut...',
        option3:
            'PC 35-40 triệu: PC Đẹp + Hiệu năng cao + Làm việc Đồ họa: Streaming với I7 13700K + RTX 4070 TI + 32GB RAM + 1TB SSD',
        option4: 'Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền còn lại',
        createdAt: '2023-06-04T09:45:00Z',
    },
    {
        id: '01234567-jklm-0123-4567-jklm012345',
        fullName: 'Phạm Văn Nam',
        phone: '0901234567',
        option1: 'Có',
        option2: 'Chơi Game Esport: Đột kích, LOL, FIFA, CSGO, PUBG',
        option3: 'PC 10 triệu - Chiến mọi tựa game',
        option4: 'Mua và thanh toán trực tiếp tại cửa hàng',
        createdAt: '2023-06-03T14:15:00Z',
    },
];

function ManagerContact() {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalContacts, setTotalContacts] = useState(0);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
    });
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [viewModalVisible, setViewModalVisible] = useState(false);
    const [currentContact, setCurrentContact] = useState(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [contactToDelete, setContactToDelete] = useState(null);

    // Simulated data fetching
    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);

            const { metadata } = await requestGetContacts();

            // Simulate API call delay
            setTimeout(() => {
                const filteredData = filterContacts(metadata, searchText, dateRange);
                const { current, pageSize } = pagination;
                const startIndex = (current - 1) * pageSize;
                const endIndex = startIndex + pageSize;

                setContacts(filteredData.slice(startIndex, endIndex));
                setTotalContacts(filteredData.length);
                setLoading(false);
            }, 500);
        };

        fetchContacts();
    }, [pagination, searchText, dateRange]);

    // Filter contacts based on search text and date range
    const filterContacts = (data, search, dates) => {
        let filtered = [...data];

        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(
                (item) => item.fullName.toLowerCase().includes(searchLower) || item.phone.includes(search),
            );
        }

        if (dates && dates.length === 2) {
            const startDate = dates[0].startOf('day');
            const endDate = dates[1].endOf('day');

            filtered = filtered.filter((item) => {
                const itemDate = moment(item.createdAt);
                return itemDate.isBetween(startDate, endDate, null, '[]');
            });
        }

        return filtered;
    };

    // Handle table change
    const handleTableChange = (pagination) => {
        setPagination(pagination);
    };

    // Handle search

    // View contact details
    const viewContact = (record) => {
        setCurrentContact(record);
        setViewModalVisible(true);
    };

    // Delete contact
    const showDeleteModal = (record) => {
        setContactToDelete(record);
        setDeleteModalVisible(true);
    };

    const handleDeleteContact = () => {
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            const newContacts = fakeContacts.filter((item) => item.id !== contactToDelete.id);
            const filteredData = filterContacts(newContacts, searchText, dateRange);
            const { current, pageSize } = pagination;
            const startIndex = (current - 1) * pageSize;
            const endIndex = startIndex + pageSize;

            setContacts(filteredData.slice(startIndex, endIndex));
            setTotalContacts(filteredData.length);
            setLoading(false);
            setDeleteModalVisible(false);

            message.success('Xóa liên hệ thành công');
        }, 500);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            ellipsis: true,
            render: (id) => (
                <Tooltip title={id}>
                    <span>{id.substring(0, 8)}...</span>
                </Tooltip>
            ),
        },
        {
            title: 'Họ và Tên',
            dataIndex: 'fullName',
            key: 'fullName',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Số Điện Thoại',
            dataIndex: 'phone',
            key: 'phone',
            render: (phone) => (
                <Space>
                    <PhoneOutlined />
                    <a href={`tel:${phone}`}>{phone}</a>
                </Space>
            ),
        },
        {
            title: 'Nhu Cầu Mua PC',
            dataIndex: 'option1',
            key: 'option1',
            render: (text) => {
                let color = 'blue';
                if (text.includes('Có')) color = 'green';
                if (text.includes('Không')) color = 'red';
                if (text.includes('tham khảo')) color = 'orange';

                return <Tag color={color}>{text}</Tag>;
            },
        },
        {
            title: 'Ngân Sách',
            dataIndex: 'option3',
            key: 'option3',
            render: (text) => {
                let color = 'default';

                if (text.includes('5-7') || text.includes('7-8')) {
                    color = 'purple';
                } else if (text.includes('10') || text.includes('12') || text.includes('14')) {
                    color = 'blue';
                } else if (text.includes('15') || text.includes('17') || text.includes('20')) {
                    color = 'green';
                } else if (text.includes('25') || text.includes('30')) {
                    color = 'gold';
                } else if (text.includes('40') || text.includes('50')) {
                    color = 'orange';
                } else if (text.includes('70') || text.includes('100') || text.includes('Luxury')) {
                    color = 'red';
                }

                return <Tag color={color}>{text.length > 30 ? text.substring(0, 30) + '...' : text}</Tag>;
            },
        },
        {
            title: 'Phương Thức',
            dataIndex: 'option4',
            key: 'option4',
            render: (text) => {
                let color = 'default';

                if (text.includes('Cọc')) color = 'blue';
                if (text.includes('toàn bộ')) color = 'green';
                if (text.includes('trực tiếp')) color = 'purple';

                return <Tag color={color}>{text.length > 20 ? text.substring(0, 20) + '...' : text}</Tag>;
            },
        },
        {
            title: 'Thời Gian',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => moment(date).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Thao Tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="primary" icon={<EyeOutlined />} onClick={() => viewContact(record)} size="small">
                        Xem
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '20px' }}>
            <Card>
                <Title level={2}>Quản Lý Liên Hệ</Title>
                <Text>Tổng số: {totalContacts} liên hệ</Text>

                <Table
                    columns={columns}
                    dataSource={contacts}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        total: totalContacts,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `Tổng ${total} liên hệ`,
                    }}
                    loading={loading}
                    onChange={handleTableChange}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            {/* Modal xem chi tiết */}
            <Modal
                title="Chi Tiết Liên Hệ"
                visible={viewModalVisible}
                onCancel={() => setViewModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setViewModalVisible(false)}>
                        Đóng
                    </Button>,
                ]}
                width={700}
            >
                {currentContact && (
                    <div>
                        <Card style={{ marginBottom: '15px' }}>
                            <Title level={4}>Thông Tin Khách Hàng</Title>
                            <p>
                                <strong>Họ và tên:</strong> {currentContact.fullName}
                            </p>
                            <p>
                                <strong>Số điện thoại:</strong>{' '}
                                <a href={`tel:${currentContact.phone}`}>{currentContact.phone}</a>
                            </p>
                            <p>
                                <strong>Thời gian liên hệ:</strong>{' '}
                                {moment(currentContact.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                            </p>
                        </Card>

                        <Card>
                            <Title level={4}>Nhu Cầu Tư Vấn</Title>
                            <p>
                                <strong>1. Nhu cầu mua PC:</strong> {currentContact.option1}
                            </p>
                            <p>
                                <strong>2. Mục đích sử dụng:</strong> {currentContact.option2}
                            </p>
                            <p>
                                <strong>3. Ngân sách:</strong> {currentContact.option3}
                            </p>
                            <p>
                                <strong>4. Phương thức nhận hàng:</strong> {currentContact.option4}
                            </p>
                        </Card>
                    </div>
                )}
            </Modal>

            {/* Modal xác nhận xóa */}
            <Modal
                title="Xác Nhận Xóa Liên Hệ"
                visible={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                onOk={handleDeleteContact}
                okButtonProps={{ danger: true, loading: loading }}
                okText="Xóa"
                cancelText="Hủy"
            >
                <p>
                    Bạn có chắc chắn muốn xóa liên hệ từ <strong>{contactToDelete?.fullName}</strong>?
                </p>
                <p>Hành động này không thể hoàn tác.</p>
            </Modal>
        </div>
    );
}

export default ManagerContact;
