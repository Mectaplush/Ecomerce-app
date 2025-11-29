const { requestAddToCart } = require('../config/request');

const handleAddToCart = async (data) => {
    try {
        const res = await requestAddToCart(data);
        return res;
    } catch (error) {
        console.log(error);
    }
};

export default handleAddToCart;
