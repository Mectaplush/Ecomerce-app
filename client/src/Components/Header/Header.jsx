import classNames from 'classnames/bind';
import styles from './Header.module.scss';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { requestGetCategory, requestGetProductSearch, requestLogout } from '../../config/request';

import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../hooks/useStore';
import { Avatar, Dropdown, message } from 'antd';
import {
    UserOutlined,
    ShoppingOutlined,
    LogoutOutlined,
    WindowsOutlined,
    SearchOutlined,
    DesktopOutlined,
    LaptopOutlined,
    MenuOutlined,
} from '@ant-design/icons';

import useDebounce from '../../hooks/useDebounce';

const cx = classNames.bind(styles);

function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize(); // Check initial size
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { category, dataUser, dataCart } = useStore();

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
    const [productSearch, setProductSearch] = useState([]);
    const [showSearchResult, setShowSearchResult] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const handleCategoryChange = useCallback(
        (e) => {
            const categoryId = e.target.value;
            setSelectedCategory(categoryId);

            // Nếu chọn danh mục khác "all" và không có text search, tự động navigate
            if (categoryId !== 'all' && search.trim() === '') {
                // Kiểm tra xem đã ở trang này chưa để tránh navigate không cần thiết
                const currentPath = window.location.pathname;
                if (!currentPath.includes(`/category/${categoryId}`)) {
                    setTimeout(() => {
                        Navigate(`/category/${categoryId}`);
                    }, 100); // Delay nhỏ để UX mượt hơn
                }
            }
        },
        [search, Navigate],
    );

    const debounceSearch = useDebounce(search, 500);

    const totalQuantity = useMemo(() => {
        return dataCart?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }, [dataCart]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsSearching(true);
                const res = await requestGetProductSearch({ search: debounceSearch });
                setProductSearch(res.metadata || []);
                setIsSearching(false);
            } catch (error) {
                console.error('Error fetching search results:', error);
                setProductSearch([]);
                setIsSearching(false);
            }
        };
        if (debounceSearch && debounceSearch.trim() !== '') {
            fetchData();
        } else {
            setProductSearch([]);
            setIsSearching(false);
        }
    }, [debounceSearch]);

    const handleNavigate = useCallback(() => {
        if (search.trim() !== '') {
            // Có text tìm kiếmkh
            Navigate(`/search/${selectedCategory}/${encodeURIComponent(search)}`);
            setSearch('');
            setProductSearch([]);
        } else if (selectedCategory !== 'all') {
            // Không có text nhưng đã chọn category cụ thể
            Navigate(`/category/${selectedCategory}`);
        } else {
            // Không có gì để tìm kiếm
            message.warning('Vui lòng chọn danh mục hoặc nhập từ khóa tìm kiếm!');
        }
    }, [search, selectedCategory, Navigate]);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter') {
                handleNavigate();
            }
        },
        [handleNavigate],
    );

    const handleSearchItemClick = useCallback(
        (productId) => {
            setSearch('');
            setProductSearch([]);
            setShowSearchResult(false);
            Navigate(`/products/${productId}`);
        },
        [Navigate],
    );

    return (
        <div className={cx('wrapper')}>
            <div className={cx('inner')}>
                <Link to="/">
                    <div>
                        <img src="https://pcmarket.vn/static/assets/2021/images/logo-new.png" alt="" />
                    </div>
                </Link>

                {/* Nút menu cho mobile */}
                {isMobile && (
                    <button className={cx('menu-toggle')} onClick={() => setMenuOpen(!menuOpen)}>
                        <MenuOutlined style={{ fontSize: 28, color: '#fff' }} />
                    </button>
                )}

                <div className={cx('search-container')}>
                    <select name="" id="" value={selectedCategory} onChange={handleCategoryChange}>
                        <option value="all">Tất cả danh mục</option>
                        {category.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        placeholder={
                            selectedCategory === 'all'
                                ? 'Tìm kiếm sản phẩm...'
                                : 'Nhập từ khóa hoặc click để xem danh mục...'
                        }
                        value={search}
                        onChange={(e) => {
                            const value = e.target.value;
                            setSearch(value);
                            if (value.trim() !== '') {
                                setShowSearchResult(true);
                            } else {
                                setShowSearchResult(false);
                            }
                        }}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            if (search.trim() !== '') {
                                setShowSearchResult(true);
                            }
                        }}
                        onBlur={() => {
                            setTimeout(() => {
                                setShowSearchResult(false);
                            }, 200);
                        }}
                    />
                    <button onClick={handleNavigate}>
                        <SearchOutlined />
                    </button>
                    {showSearchResult && search.trim() !== '' && (
                        <div
                            className={cx('search-result')}
                            onMouseDown={(e) => e.preventDefault()} // Ngăn onBlur khi click vào kết quả
                            style={{
                                zIndex: 999999,
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                backgroundColor: '#fff',
                            }}
                        >
                            <ul style={{ width: '100%' }}>
                                {isSearching ? (
                                    <li
                                        style={{
                                            textAlign: 'center',
                                            padding: '20px',
                                            color: '#666',
                                            fontSize: '14px',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        🔍 Đang tìm kiếm...
                                    </li>
                                ) : productSearch.length === 0 ? (
                                    <li
                                        style={{
                                            textAlign: 'center',
                                            padding: '20px',
                                            color: '#999',
                                            fontSize: '14px',
                                        }}
                                    >
                                        ❌ Không tìm thấy sản phẩm phù hợp
                                    </li>
                                ) : (
                                    productSearch.map((item) => (
                                        <li
                                            key={item.id}
                                            onClick={() => handleSearchItemClick(item.id)}
                                            style={{ cursor: 'pointer' }}
                                        >
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
                                Giỏ hàng ({totalQuantity})
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

            {/* Hiển thị category-list khi menuOpen hoặc ở desktop */}
            {(menuOpen || !isMobile) && (
                <div className={cx('category-list', menuOpen ? 'show' : '')}>
                    <div className={cx('category-wrapper')}>
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
            )}
        </div>
    );
}

export default Header;
