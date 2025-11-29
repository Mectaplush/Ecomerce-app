import classNames from 'classnames/bind';
import styles from './SlideHome.module.scss';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

const cx = classNames.bind(styles);
function SlideHome() {
    return (
        <div className={cx('wrapper')}>
            <Swiper
                spaceBetween={30}
                centeredSlides={true}
                autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                }}
                navigation={true}
                modules={[Autoplay, Pagination, Navigation]}
                className="mySwiper"
            >
                <SwiperSlide>
                    <img src="https://pcmarket.vn/media/banner/30_Augbe003688eca1fd03506599abb0f3c003.jpg" alt="" />
                </SwiperSlide>

                <SwiperSlide>
                    <img src="https://pcmarket.vn/media/banner/31_Mar910aebc273881fc6526a9df58b98963a.jpg" alt="" />
                </SwiperSlide>

                <SwiperSlide>
                    <img src="https://pcmarket.vn/media/banner/30_Aug6324a66ccc6c6e8064276fb4f8d29b65.jpg" alt="" />
                </SwiperSlide>

                <SwiperSlide>
                    <img src="https://pcmarket.vn/media/banner/banner-top-pc-assassin_pcm.jpg" alt="" />
                </SwiperSlide>
            </Swiper>
        </div>
    );
}

export default SlideHome;
