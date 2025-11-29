import Header from '../../Components/Header/Header';
import Footer from '../../Components/Footer/Footer';
import { useParams } from 'react-router-dom';
import { requestGetBlogById } from '../../config/request';
import { useEffect, useState } from 'react';

import classNames from 'classnames/bind';
import styles from './DetailBlogs.module.scss';

const cx = classNames.bind(styles);

function DetailBlogs() {
    const { id } = useParams();

    const [blog, setBlog] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetBlogById(id);
            setBlog(res.metadata);
        };
        fetchData();
    }, [id]);

    return (
        <div>
            <header>
                <Header />
            </header>
            <main>
                <div className={cx('container')}>
                    <h1>{blog?.title}</h1>
                    <p dangerouslySetInnerHTML={{ __html: blog?.content }} />
                </div>
            </main>
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default DetailBlogs;
