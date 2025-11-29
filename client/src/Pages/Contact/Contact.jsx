import React from 'react';
import { Form, Input, Button, Radio, Typography, Space, Card, Row, Col, Divider } from 'antd';
import { PhoneOutlined, MailOutlined, EnvironmentOutlined, FacebookOutlined } from '@ant-design/icons';
import Footer from '../../Components/Footer/Footer';
import Header from '../../Components/Header/Header';
import { requestCreateContact } from '../../config/request';
import { message } from 'antd';

const { Title, Paragraph, Text } = Typography;

function Contact() {
    const [form] = Form.useForm();

    const onFinish = async (values) => {
        // Lấy text đầy đủ của các lựa chọn
        const getPurchaseIntentText = () => {
            const options = {
                yes: 'Có',
                no: 'Không',
                consultation: 'Muốn được tư vấn cấu hình rồi mua',
                reference: 'Tham khảo (mua sau)',
            };
            return options[values.purchaseIntent] || values.purchaseIntent;
        };

        const getPurposeText = () => {
            const options = {
                esport: 'Chơi Game Esport: Đột kích, LOL, FIFA, CSGO, PUBG',
                heavyGaming: 'Chơi Game nặng + Livestream: GTA 5, Game AAA, Game Offline nặng',
                design2D: 'Làm Việc đồ họa 2D: Adobe Photoshop, Lightroom, illustrator',
                videoEditing: 'Dựng phim-Render Video: Adobe Premiere, After Effects, DaVinci Resolve, Capcut...',
                design3D:
                    'Làm việc đồ họa 3D: 3Ds Max, Sketchup, Vray, Chaos Vantage, Enscape, Lumion, Blender, AUTO CAD',
                ai: 'Làm việc Training AI',
                custom: 'Bạn muốn mua PC để làm việc - Build PC Cá Nhân hóa',
            };
            return options[values.purpose] || values.purpose;
        };

        const getBudgetText = () => {
            const options = {
                '5-7M': 'PC 5-7 Triệu - Giải trí nhẹ nhàng - Văn Phòng',
                '7-8M': 'PC 7-8 Triệu - Chơi Game Phổ thông LOL, FC Online, CS2',
                '10M': 'PC GAMING 10 triệu - Chiến mọi tựa game',
                // Thêm tất cả các lựa chọn khác...
                '70-100M': 'PC 70-100 triệu Luxury I9 14900K + RTX 4090 + 32GB RAM + 2TB SSD',
                '100-150M':
                    'PC 100-150 triệu Super Luxury I9 14900K + RTX 4090 + 64GB RAM + 4TB SSD + Tản nhiệt AIO Cao cấp + Vỏ Cao Cấp',
                '150-200M':
                    'PC 150-200 Triệu Super MAX Luxury Custom PC: Tản nhiệt + Vỏ Case: I9 14900K + RTX 4090 + 192 Gb RAM + 8TB SSD + PSU 1200W',
                'custom-cooling': 'PC Custom Cooling 50-100 Triệu',
                'custom-ai': 'PC Làm việc AI 50-200 Triệu',
            };
            return options[values.budget] || values.budget;
        };

        const getDeliveryOptionText = () => {
            const options = {
                deposit: 'Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền còn lại',
                fullPayment: 'Thanh toán toàn bộ nhận hàng nhanh nhất',
                inStore: 'Mua và thanh toán trực tiếp tại cửa hàng',
            };
            return options[values.deliveryOption] || values.deliveryOption;
        };

        const data = {
            fullName: values.fullName,
            phone: values.phoneNumber,
            option1: getPurchaseIntentText(),
            option2: getPurposeText(),
            option3: getBudgetText(),
            option4: getDeliveryOptionText(),
        };

        const res = await requestCreateContact(data);
        if (res && res.statusCode === 201) {
            form.resetFields();
            message.success('Gửi yêu cầu tư vấn thành công!');
        }
    };

    return (
        <div>
            <header>
                <Header />
            </header>

            <div className="contact-container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                <Card bordered={false}>
                    <Title level={2} style={{ textAlign: 'center', color: '#1890ff', marginBottom: '30px' }}>
                        Máy Tính PCM - TƯ VẤN BUILD PC Theo Yêu Cầu 24/7
                    </Title>
                    <Paragraph style={{ textAlign: 'center', fontSize: '16px' }}>
                        PCM là đơn vị chuyên cung cấp PC Gaming - PC Đồ Họa - Linh Kiện PC Chất Lượng - Hiệu Năng Cao -
                        Đẹp Mắt - Giá Cực Tốt.
                    </Paragraph>
                    <Paragraph style={{ textAlign: 'center', fontSize: '16px', marginBottom: '30px' }}>
                        Đội ngũ tư vấn viên giàu kinh nghiệm dựa trên quá trình sử dụng máy tính chơi game, livestream,
                        làm việc để đưa đến cho anh em những bộ PC tối ưu nhất hiệu năng trên giá thành.
                    </Paragraph>

                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={16}>
                            <div style={{ backgroundColor: '#f5f5f5', padding: '30px', borderRadius: '8px' }}>
                                <Title level={4} style={{ marginBottom: '20px' }}>
                                    Chúng Tôi Tự Tin Đáp Ứng Mọi Yêu Cầu Build PC từ Rẻ nhất đến Cao cấp nhất - Mọi
                                    khách hàng đều là Thượng Đế!
                                </Title>

                                <Form
                                    form={form}
                                    name="contact_form"
                                    layout="vertical"
                                    onFinish={onFinish}
                                    requiredMark="optional"
                                >
                                    <Form.Item
                                        name="fullName"
                                        label="Họ và Tên"
                                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                                    >
                                        <Input placeholder="Nhập họ và tên của bạn" />
                                    </Form.Item>

                                    <Form.Item
                                        name="phoneNumber"
                                        label="Số Điện Thoại (chúng tôi sẽ gọi và tư vấn cộng add zalo của bạn)"
                                        rules={[
                                            {
                                                pattern: /^0\d{0,9}$/,
                                                message: 'SĐT phải bắt đầu bằng số 0 và tối đa 10 số',
                                            },
                                            {
                                                required: true,
                                                message: 'SĐT không được để trống',
                                            },
                                            {
                                                max: 10,
                                                message: 'SĐT tối đa 10 số',
                                            },
                                        ]}
                                    >
                                        <Input placeholder="Nhập số điện thoại của bạn" />
                                    </Form.Item>

                                    <Form.Item
                                        name="purchaseIntent"
                                        label="Bạn muốn mua PC không?"
                                        rules={[{ required: true, message: 'Vui lòng chọn một lựa chọn!' }]}
                                    >
                                        <Radio.Group>
                                            <Space direction="vertical">
                                                <Radio value="yes">Có</Radio>
                                                <Radio value="no">Không</Radio>
                                                <Radio value="consultation">Muốn được tư vấn cấu hình rồi mua</Radio>
                                                <Radio value="reference">Tham khảo (mua sau)</Radio>
                                            </Space>
                                        </Radio.Group>
                                    </Form.Item>

                                    <Form.Item
                                        name="purpose"
                                        label="Mục đích mua PC của bạn làm gì?"
                                        rules={[{ required: true, message: 'Vui lòng chọn một lựa chọn!' }]}
                                    >
                                        <Radio.Group>
                                            <Space direction="vertical">
                                                <Radio value="esport">
                                                    Chơi Game Esport: Đột kích, LOL, FIFA, CSGO, PUBG
                                                </Radio>
                                                <Radio value="heavyGaming">
                                                    Chơi Game nặng + Livestream: GTA 5, Game AAA, Game Offline nặng
                                                </Radio>
                                                <Radio value="design2D">
                                                    Làm Việc đồ họa 2D: Adobe Photoshop, Lightroom, illustrator
                                                </Radio>
                                                <Radio value="videoEditing">
                                                    Dựng phim-Render Video: Adobe Premiere, After Effects, DaVinci
                                                    Resolve, Capcut...
                                                </Radio>
                                                <Radio value="design3D">
                                                    Làm việc đồ họa 3D: 3Ds Max, Sketchup, Vray, Chaos Vantage, Enscape,
                                                    Lumion, Blender, AUTO CAD
                                                </Radio>
                                                <Radio value="ai">Làm việc Training AI</Radio>
                                                <Radio value="custom">
                                                    Bạn muốn mua PC để làm việc - Build PC Cá Nhân hóa (Vui lòng liệt kê
                                                    phần mềm bạn đang làm và ngân sách)
                                                </Radio>
                                            </Space>
                                        </Radio.Group>
                                    </Form.Item>

                                    <Form.Item
                                        name="budget"
                                        label="Bạn Build PC với mức ngân sách bao nhiêu - phục vụ mục đích nào? (Chỉ tính riêng cho PC - chưa bao gồm Màn hình - Gear)"
                                        rules={[{ required: true, message: 'Vui lòng chọn một lựa chọn!' }]}
                                    >
                                        <Radio.Group>
                                            <Space direction="vertical">
                                                <Radio value="5-7M">
                                                    PC 5-7 Triệu - Giải trí nhẹ nhàng - Văn Phòng
                                                </Radio>
                                                <Radio value="7-8M">
                                                    PC 7-8 Triệu - Chơi Game Phổ thông LOL, FC Online, CS2
                                                </Radio>
                                                <Radio value="10M">PC GAMING 10 triệu - Chiến mọi tựa game</Radio>
                                                <Radio value="11-12M">
                                                    PC 11-12 triệu: GAMING + Làm việc Nhẹ nhàng: I3 12100F/16GB RAM/
                                                    256GB SSD/ GTX 1660 Super 6GB
                                                </Radio>
                                                <Radio value="13-14M">
                                                    PC 13-14 triệu: GAMING + Làm việc Nhẹ nhàng 13,890K: I5 12400F/16GB
                                                    RAM/ 256GB SSD/ GTX 1660 Super 6Gb
                                                </Radio>
                                                <Radio value="15M">
                                                    PC 15 triệu - Hiệu Suất Cao cho cả Gaming + Làm việc tầm trung
                                                    Livestream: với RTX 2060 Super 8GB - I5 12400F/ 500GB SSD/
                                                </Radio>
                                                <Radio value="16-17M">
                                                    PC 16-17 triệu - Hiệu năng Tốt - Đa Nhiệm tốt: RTX 3060 8/12GbGB- I5
                                                    12400F- 16Gb /500GB SSD
                                                </Radio>
                                                <Radio value="17-18M">
                                                    PC 17-18 triệu - Hiệu năng Cao - Đáp ứng tốt toàn bộ game nặng nhất
                                                    với setting cao nhất RTX 4060 - I5 12400F/16GB RAM/500GB SSD
                                                </Radio>
                                                <Radio value="20M-hieuNang">
                                                    PC 20 - Hiệu năng Cực Cao - Chơi trên độ phân giải 2K- bắt mắt: RTX
                                                    3070- 12400F- 16GB RAM/500GB SSD
                                                </Radio>
                                                <Radio value="20M-doHoa">
                                                    PC: 20 triệu - Thiên về Đồ họa với RTX 3060 12GB + I5 13500/32GB
                                                    RAM/ 500GB SSD
                                                </Radio>
                                                <Radio value="22M">
                                                    PC 22 triệu - Hiệu năng VGA cực cao - Bắt mắt - PC 2 mặt kính RTX
                                                    3070TI /12400F/ 16GB RAM/ 500GB SSD
                                                </Radio>
                                                <Radio value="25M-game2k">
                                                    PC 25 triệu: Chơi game 2K Maxseting + Thoải mái làm việc đồ họa: I5
                                                    13500 + RTX 3070TI + 32GB RAM + 1TB SSD
                                                </Radio>
                                                <Radio value="25M-game4k">
                                                    PC 25 triệu: Chơi game 4K: Ngoại hình ấn tượng với RTX 3080 + 12400F
                                                    + 16GB RAM + 500GB SSD + Tản nhiệt AIO
                                                </Radio>
                                                <Radio value="25-28M">
                                                    PC 25-28 triệu: Làm việc I5 13600K + RTX 3060 12GB + 32GB SSD + 1TB
                                                    SSD + Tản nhiệt AIO
                                                </Radio>
                                                <Radio value="26-30M">
                                                    PC 26-30 triệu Gaming I5 13400F/12400F + RTX 4070 12GB - 16GB RAM -
                                                    500GB SSD
                                                </Radio>
                                                <Radio value="30-33M">
                                                    PC 30-33 triệu PC Siêu Đẹp - Hiệu năng Khỏe - Trang trí góc PC (Full
                                                    White, Thiết kế không gian PC, Led RGB, Tản nhiệt AIO) I5 13600K/I7
                                                    12700K + RTX 4070 White - RTX 4070
                                                </Radio>
                                                <Radio value="35-40M-streaming">
                                                    PC 35-40 triệu: PC Đẹp + Hiệu năng cao + Làm việc Đồ họa: Streaming
                                                    với I7 13700K + RTX 4070 TI + 32GB RAM + 1TB SSD
                                                </Radio>
                                                <Radio value="35-40M-render">
                                                    PC 35-40 Triệu: Chuyên cho render + Đồ họa: Thiết kế tinh tế + Thiên
                                                    về hiệu năng: I9 13900K + RTX 4060/RTX 4060TI/RTX 3070TI
                                                </Radio>
                                                <Radio value="40-50M-hieunang">
                                                    PC 40-50 Triệu: Cao cấp hướng tới đáp ứng toàn bộ nhu cầu (Hiệu năng
                                                    - Đẹp - Bền Bỉ): I7 14700K + RTX 4070TI + 32GB RAM + 1TB SSD
                                                </Radio>
                                                <Radio value="40-50M-cao">
                                                    PC 40-50 Triệu Cao Cấp Thiên hẳn về Hiệu suất: I9 13900K/14900K +
                                                    RTX 4070/RTX 4070TI/ RTX 4080
                                                </Radio>
                                                <Radio value="50-70M">
                                                    PC 50-70 Triệu Siêu Cao Cấp: I9 13900K/14900K + RTX 4080 + 32GB
                                                    RAM/64GB RAM
                                                </Radio>
                                                <Radio value="70-100M">
                                                    PC 70-100 triệu Luxury I9 14900K + RTX 4090 + 32GB RAM + 2TB SSD
                                                </Radio>
                                                <Radio value="100-150M">
                                                    PC 100-150 triệu Super Luxury I9 14900K + RTX 4090 + 64GB RAM + 4TB
                                                    SSD + Tản nhiệt AIO Cao cấp + Vỏ Cao Cấp
                                                </Radio>
                                                <Radio value="150-200M">
                                                    PC 150-200 Triệu Super MAX Luxury Custom PC: Tản nhiệt + Vỏ Case: I9
                                                    14900K + RTX 4090 + 192 Gb RAM + 8TB SSD + PSU 1200W
                                                </Radio>
                                                <Radio value="custom-cooling">PC Custom Cooling 50-100 Triệu</Radio>
                                                <Radio value="custom-ai">PC Làm việc AI 50-200 Triệu</Radio>
                                            </Space>
                                        </Radio.Group>
                                    </Form.Item>

                                    <Form.Item
                                        name="deliveryOption"
                                        label="Bạn muốn nhận hàng như thế nào?"
                                        rules={[{ required: true, message: 'Vui lòng chọn một lựa chọn!' }]}
                                    >
                                        <Radio.Group>
                                            <Space direction="vertical">
                                                <Radio value="deposit">
                                                    Cọc 10% giá trị đơn hàng - Nhận hàng kiểm tra rùi thanh toán số tiền
                                                    còn lại - Thời gian tùy theo địa chỉ của bạn: PC Sẽ được phân phối
                                                    lắp đặt ở Hà Nội và HCM
                                                </Radio>
                                                <Radio value="fullPayment">
                                                    Thanh toán toàn bộ nhận hàng nhanh nhất
                                                </Radio>
                                                <Radio value="inStore">Mua và thanh toán trực tiếp tại cửa hàng</Radio>
                                            </Space>
                                        </Radio.Group>
                                    </Form.Item>

                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" size="large" style={{ width: '100%' }}>
                                            Gửi Yêu Cầu Tư Vấn
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </div>
                        </Col>

                        <Col xs={24} md={8}>
                            <Card style={{ height: '100%' }}>
                                <div style={{ marginBottom: '30px' }}>
                                    <Title level={4}>Thông tin thanh toán</Title>
                                    <Paragraph>
                                        <Text strong>Lưu ý: Tránh bị Scam lừa đảo!</Text>
                                    </Paragraph>
                                    <Paragraph>
                                        Khi chuyển khoản vui lòng ghi SỐ ĐIỆN THOẠI vào mục NỘI DUNG chuyển khoản
                                    </Paragraph>
                                    <Divider style={{ margin: '15px 0' }} />
                                    <Paragraph>
                                        <Text strong>Tài khoản cá nhân - Ngân hàng TP BANK</Text>
                                        <br />
                                        STK: 0811 8889 999
                                        <br />
                                        Ngân hàng: TP BANK
                                        <br />
                                        Tên: TRUONG THI NGUYET
                                    </Paragraph>
                                </div>

                                <div>
                                    <Title level={4}>Địa chỉ cửa hàng</Title>
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Card size="small" title="SHOWROOM HÀ NỘI" style={{ marginBottom: '15px' }}>
                                            <Space align="start">
                                                <EnvironmentOutlined />
                                                <Paragraph style={{ margin: 0 }}>
                                                    83-85 Thái Hà, Trung Liệt, Đống Đa, Hà Nội
                                                </Paragraph>
                                            </Space>
                                            <Space align="start">
                                                <PhoneOutlined />
                                                <Paragraph style={{ margin: 0 }}>036.625.8142 (Liên hệ 24/7)</Paragraph>
                                            </Space>
                                        </Card>

                                        <Card size="small" title="SHOWROOM HỒ CHÍ MINH">
                                            <Space align="start">
                                                <EnvironmentOutlined />
                                                <Paragraph style={{ margin: 0 }}>
                                                    40 Vĩnh Viễn, Phường 2, Quận 10, TP Hồ Chí Minh
                                                </Paragraph>
                                            </Space>
                                            <Space align="start">
                                                <PhoneOutlined />
                                                <Paragraph style={{ margin: 0 }}>087.997.9997 (Liên hệ 24/7)</Paragraph>
                                            </Space>
                                        </Card>
                                    </Space>

                                    <Paragraph style={{ marginTop: '15px' }}>
                                        <Text strong>Thời gian mở cửa:</Text> Từ 9h00-19h00 hàng ngày
                                    </Paragraph>

                                    <Divider style={{ margin: '15px 0' }} />

                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Space align="start">
                                            <MailOutlined />
                                            <Text>l2team.contact@gmail.com</Text>
                                        </Space>
                                        <Space align="start">
                                            <FacebookOutlined />
                                            <a
                                                href="https://www.facebook.com/pcmarket.vn"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                facebook.com/pcmarket.vn
                                            </a>
                                        </Space>
                                        <Space align="start">
                                            <EnvironmentOutlined />
                                            <a href="https://pcmarket.vn/" target="_blank" rel="noopener noreferrer">
                                                pcmarket.vn
                                            </a>
                                        </Space>
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Card>
            </div>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Contact;
