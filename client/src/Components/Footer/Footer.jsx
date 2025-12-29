import classNames from 'classnames/bind';
import styles from './Footer.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faPhone, faClock } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function Footer() {
    return (
        <div className={cx('wrapper')}>
            <div className={cx('container')}>
                <div className={cx('showroom-section')}>
                    <h2 className={cx('showroom-title')}>HỆ THỐNG CÁC CỬA HÀNG CỦA MÁY TÍNH PCM</h2>

                    <div className={cx('showroom-list')}>
                        <div className={cx('showroom-item')}>
                            <div className={cx('showroom-header')}>
                                <div className={cx('showroom-number')}>1</div>
                                <div className={cx('showroom-name')}>CỬA HÀNG - THỦ ĐỨC - HỒ CHÍ MINH</div>
                            </div>
                            <div className={cx('showroom-info')}>
                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                                    <span>Địa chỉ: 1 Võ Văn Ngân, Thủ Đức, TP. Hồ Chí Minh</span>
                                </div>

                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faPhone} />
                                    <span>Liên hệ 24/7 Tel: 038.896.7992</span>
                                </div>
                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faClock} />
                                    <span>Thời gian mở cửa: Từ 9h00-20h00 hàng ngày</span>
                                </div>
                            </div>
                        </div>

                        <div className={cx('showroom-item')}>
                            <div className={cx('showroom-header')}>
                                <div className={cx('showroom-number')}>2</div>
                                <div className={cx('showroom-name')}>CỬA HÀNG - QUẬN 1 - HỒ CHÍ MINH (SẮP CÓ)</div>
                            </div>
                            <div className={cx('showroom-info')}>
                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                                    <span>Địa chỉ: </span>
                                </div>

                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faPhone} />
                                    <span>Liên hệ 24/7 Tel: </span>
                                </div>
                                <div className={cx('info-item')}>
                                    <FontAwesomeIcon icon={faClock} />
                                    <span>Thời gian mở cửa: </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx('footer-sections')}>
                    <div className={cx('footer-section')}>
                        <h3 className={cx('section-title')}>GIỚI THIỆU PC MARKET</h3>
                        <ul className={cx('section-links')}>
                            <li>
                                <a href="#">Giới thiệu công ty</a>
                            </li>
                            <li>
                                <a href="#">Thông tin liên hệ</a>
                            </li>
                            <li>
                                <a href="#">Tin tức</a>
                            </li>
                        </ul>
                    </div>

                    <div className={cx('footer-section')}>
                        <h3 className={cx('section-title')}>HỖ TRỢ KHÁCH HÀNG</h3>
                        <ul className={cx('section-links')}>
                            <li>
                                <a href="#">Hướng dẫn mua hàng trực tuyến</a>
                            </li>
                            <li>
                                <a href="#">Hướng dẫn thanh toán</a>
                            </li>
                            <li>
                                <a href="#">Góp ý, Khiếu Nại</a>
                            </li>
                        </ul>
                    </div>

                    <div className={cx('footer-section')}>
                        <h3 className={cx('section-title')}>CHÍNH SÁCH CHUNG</h3>
                        <ul className={cx('section-links')}>
                            <li>
                                <a href="#">Chính sách vận chuyển</a>
                            </li>
                            <li>
                                <a href="#">Chính sách thanh toán</a>
                            </li>
                            <li>
                                <a href="#">Chính sách bảo hành</a>
                            </li>
                            <li>
                                <a href="#">Chính sách đổi trả</a>
                            </li>
                            <li>
                                <a href="#">Bảo mật thông tin khách hàng</a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Footer;
