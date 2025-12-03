import { requestAddToCart } from '../config/request';

const handleAddToCart = async (data) => {
    try {
        const res = await requestAddToCart(data);
        return res.data || res;
    } catch (error) {
        console.error('Add to cart failed:', error);
        throw error;
    }
};

export default handleAddToCart;
