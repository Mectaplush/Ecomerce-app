import classNames from 'classnames/bind';
import styles from './Header.module.scss';
import { useEffect, useState } from 'react';

import { requestGetCategory, requestGetProductSearch, requestLogout } from '../../config/request';

import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Avatar, Dropdown } from 'antd';
import { UserOutlined, ShoppingOutlined, LogoutOutlined, WindowsOutlined, SearchOutlined } from '@ant-design/icons';

import useDebounce from '../../hooks/useDebounce';

const cx = classNames.bind(styles);

function Header() {
    const [category, setCategory] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetCategory();
            setCategory(res);
        };
        fetchData();
    }, []);

    const { dataUser, dataCart } = useStore();

    const Navigate = useNavigate();

    const items = [
        {
            key: '1',
            label: <Link to="/profile">Thông tin tài khoản</Link>,
            icon: <UserOutlined />,
        },
        {
            key: '2',
            label: <Link to="/orders">Đơn hàng của tôi</Link>,
            icon: <ShoppingOutlined />,
        },
        {
            key: '3',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: async () => {
                await requestLogout();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                Navigate('/');
            },
        },
    ];

    const [selectedCategory, setSelectedCategory] = useState('all');

    const [search, setSearch] = useState('');

    const debounceSearch = useDebounce(search, 500);
    const [productSearch, setProductSearch] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetProductSearch({ search: debounceSearch });
            setProductSearch(res.metadata);
        };
        if (debounceSearch) {
            fetchData();
        }
    }, [debounceSearch]);

    const handleNavigate = () => {
        if (search.trim() !== '') {
            Navigate(`/search/${selectedCategory}/${encodeURIComponent(search)}`);
            setSearch('');
            setProductSearch([]);
        } else {
            Navigate(`/category/${selectedCategory}`);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && search.trim() !== '') {
            handleNavigate();
        }
    };

    const handleSearchItemClick = (itemId) => {
        Navigate(`/products/${itemId}`);
        setSearch('');
        setProductSearch([]);
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <Link to="/">
                    <div>
                        <img src="https://pcmarket.vn/static/assets/2021/images/logo-new.png" alt="" />
                    </div>
                </Link>

                <div className={cx('search-container')}>
                    <select name="" id="" onChange={(e) => setSelectedCategory(e.target.value)}>
                        <option value="all">Tất cả danh mục</option>
                        {category.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => {
                            setTimeout(() => {
                                setProductSearch([]);
                            }, 200);
                        }}
                    />
                    <button onClick={handleNavigate}>
                        <SearchOutlined />
                    </button>
                    {debounceSearch && productSearch.length > 0 && (
                        <div className={cx('search-result')}>
                            <ul style={{ width: '100%' }}>
                                {productSearch.length === 0 ? (
                                    <li>Không tìm thấy sản phẩm</li>
                                ) : (
                                    productSearch.map((item) => (
                                        <li key={item.id} onClick={() => handleSearchItemClick(item.id)}>
                                            <img src={item.images.split(',')[0]} alt="" />
                                            <div>
                                                <h3>{item.name}</h3>
                                                <p>
                                                    {(item.discount
                                                        ? item.price - (item.price * item.discount) / 100
                                                        : item.price
                                                    ).toLocaleString('vi-VN')}{' '}
                                                    VNĐ
                                                </p>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                </div>
                {!dataUser.id ? (
                    <div className={cx('auth-buttons')}>
                        <Link to="/login">
                            <button>Đăng nhập</button>
                        </Link>
                        <Link to="/register">
                            <button>Đăng ký</button>
                        </Link>
                    </div>
                ) : (
                    <div className={cx('user-menu')}>
                        <div>
                            <Link to="/contact" className={cx('cart-button')}>
                                <WindowsOutlined style={{ fontSize: '24px' }} />
                                Tư vấn build pc
                            </Link>
                        </div>
                        <div className={cx('cart-menu')}>
                            <Link to="/buildpc" className={cx('cart-button')}>
                                <WindowsOutlined style={{ fontSize: '24px' }} />
                                Xây dựng cấu hình
                            </Link>

                            <Link to="/cart" className={cx('cart-button')}>
                                <ShoppingOutlined style={{ fontSize: '24px' }} />
                                Giỏ hàng ({dataCart.length})
                            </Link>
                        </div>
                        <Dropdown menu={{ items }} placement="bottomRight" arrow>
                            <div className={cx('user-avatar')}>
                                {dataUser.avatar ? (
                                    <Avatar src={dataUser.avatar} size={40} />
                                ) : (
                                    <Avatar
                                        size={40}
                                        icon={<UserOutlined />}
                                        style={{
                                            backgroundColor: '#87d068',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    />
                                )}
                                <span>{dataUser.fullName || 'Người dùng'}</span>
                            </div>
                        </Dropdown>
                    </div>
                )}
            </div>
            <div className={cx('category-list')}>
                {category.map((item) => (
                    <Link key={item.id} to={`/category/${item.id}`}>
                        <div className={cx('category-item')}>
                            <img src={item.image} alt="" />
                            <span>{item.name}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default Header;
