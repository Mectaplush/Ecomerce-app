import React, { useEffect, useState } from 'react';
import { Layout, Menu, Button, Drawer } from 'antd';
import {
    UserOutlined,
    ShoppingOutlined,
    HeartOutlined,
    HistoryOutlined,
    LogoutOutlined,
    MenuOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Index.module.scss';
import Header from '../../Components/Header/Header';

// Import các components
import InfoUser from './Components/InfoUser/InfoUser';
import ManagerOrder from './Components/ManagerOrder/ManagerOrder';
import ManagerProductWatch from './Components/ManagerProductWatch/ManagerProductWatch';
import { requestLogout } from '../../config/request';
import Footer from '../../Components/Footer/Footer';
 
const { Content, Sider } = Layout;
const cx = classNames.bind(styles);

function Index() {
    const navigate = useNavigate();
    const [currentComponent, setCurrentComponent] = useState(<InfoUser />);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    // Thêm state để track selected menu key
    const [selectedMenuKey, setSelectedMenuKey] = useState(['profile']);

    const { pathname } = useLocation();

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sửa useEffect để sync menu với URL
    useEffect(() => {
        if (pathname === '/orders') {
            setCurrentComponent(<ManagerOrder />);
            setSelectedMenuKey(['orders']); // Cập nhật selected key
        } else if (pathname === '/profile') {
            setCurrentComponent(<InfoUser />);
            setSelectedMenuKey(['profile']);
        } else {
            // Default case
            setCurrentComponent(<InfoUser />);
            setSelectedMenuKey(['profile']);
        }
    }, [pathname]);

    const handleMenuClick = (key, component) => {
        if (key === 'logout') {
            localStorage.removeItem('token');
            navigate('/login');
            return;
        }
        setCurrentComponent(component);
        setSelectedMenuKey([key]); // Cập nhật selected key khi click
        if (isMobile) {
            setDrawerVisible(false);
        }
    };

    const handleLogout = async () => {
        await requestLogout();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        navigate('/');
    };

    const menuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Thông tin cá nhân',
            onClick: () => handleMenuClick('profile', <InfoUser />),
        },
        {
            key: 'orders',
            icon: <ShoppingOutlined />,
            label: 'Đơn hàng của tôi',
            onClick: () => handleMenuClick('orders', <ManagerOrder />),
        },
        {
            key: 'wishlist',
            icon: <HeartOutlined />,
            label: 'Sản phẩm đã xem',
            onClick: () => handleMenuClick('wishlist', <ManagerProductWatch />),
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            onClick: () => handleLogout('logout'),
        },
    ];

    // Sửa renderSider để dùng selectedKeys thay vì defaultSelectedKeys
    const renderSider = () => (
        <Menu
            mode="inline"
            selectedKeys={selectedMenuKey} // Thay đổi từ defaultSelectedKeys
            items={menuItems}
            className={cx('menu')}
        />
    );

    return (
        <Layout className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            {/* Mobile Menu Button */}
            {isMobile && (
                <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
                    <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerVisible(true)}>
                        Menu
                    </Button>
                </div>
            )}

            <Layout>
                {/* Desktop Sider */}
                {!isMobile && (
                    <Sider width={250} theme="light" className={cx('sider')}>
                        {renderSider()}
                    </Sider>
                )}

                {/* Mobile Drawer */}
                {isMobile && (
                    <Drawer
                        title="Menu"
                        placement="left"
                        onClose={() => setDrawerVisible(false)}
                        open={drawerVisible}
                        bodyStyle={{ padding: 0 }}
                        zIndex={1070}
                        width={250}
                    >
                        {renderSider()}
                    </Drawer>
                )}

                <Layout className={cx('content-layout')}>
                    <Content className={cx('content')}>{currentComponent}</Content>
                </Layout>
            </Layout>
            <footer>
                <Footer />
            </footer>
        </Layout>
    );
}

export default Index;
