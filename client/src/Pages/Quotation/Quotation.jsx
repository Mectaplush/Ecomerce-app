import React, { useEffect, useState } from 'react';
import PrintImage from '../../Components/PrintImage/PrintImage';
import { requestGetCartBuildPcUser } from '../../config/request';
import Footer from '../../Components/Footer/Footer';

function Quotation() {
    const [dataCart, setDataCart] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await requestGetCartBuildPcUser();
            setDataCart(res);
        };
        fetchData();
    }, []);

    return (
        <div className="quotation-page">
            <PrintImage dataCart={dataCart} />
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Quotation;
