/**
 * Shipping Fee Calculation Service
 * This service calculates shipping fees based on cart items and delivery address
 * 
 * In a real application, you would integrate with third-party APIs like:
 * - GHN (Giao Hàng Nhanh): https://api.ghn.vn/home/docs/detail
 * - GHTK (Giao Hàng Tiết Kiệm): https://docs.giaohangtietkiem.vn/
 * - ViettelPost: https://viettelpost.com.vn/
 * - VNPost: https://www.vnpost.vn/
 */

/**
 * Mock shipping fee calculation
 * In production, replace this with actual API calls
 */
export const calculateShippingFee = async (address, totalWeight = 1000, totalValue = 0) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Base shipping fee
    let baseFee = 30000; // 30,000 VNĐ base fee

    // Calculate fee based on address (mock logic)
    if (address) {
        const addressLower = address.toLowerCase();

        // Major cities get standard shipping
        if (addressLower.includes('hà nội') ||
            addressLower.includes('hồ chí minh') ||
            addressLower.includes('đà nẵng')) {
            baseFee = 25000; // 25,000 VNĐ
        }
        // Suburban areas
        else if (addressLower.includes('quận') || addressLower.includes('thành phố')) {
            baseFee = 30000; // 30,000 VNĐ
        }
        // Rural/remote areas
        else if (addressLower.includes('huyện') || addressLower.includes('xã')) {
            baseFee = 45000; // 45,000 VNĐ
        }
    }

    // Weight-based fee (per kg above 1kg)
    const weightInKg = totalWeight / 1000;
    const extraWeight = Math.max(0, weightInKg - 1);
    const weightFee = Math.ceil(extraWeight) * 5000; // 5,000 VNĐ per extra kg

    // Free shipping for orders above 5 million VNĐ
    if (totalValue >= 5000000) {
        return {
            fee: 0,
            originalFee: baseFee + weightFee,
            discount: baseFee + weightFee,
            freeShipping: true,
            message: 'Miễn phí vận chuyển cho đơn hàng từ 5,000,000đ'
        };
    }

    const totalFee = baseFee + weightFee;

    return {
        fee: totalFee,
        originalFee: totalFee,
        discount: 0,
        freeShipping: false,
        breakdown: {
            baseFee,
            weightFee,
            extraWeight: Math.ceil(extraWeight)
        }
    };
};

/**
 * Real GHN API Integration (Example - requires API key)
 * Uncomment and configure when ready to use
 */
/*
export const calculateShippingFeeGHN = async (address, weight, toDistrictId, toWardCode) => {
    const GHN_API_URL = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee';
    const GHN_TOKEN = process.env.REACT_APP_GHN_TOKEN; // Add to .env file
    const GHN_SHOP_ID = process.env.REACT_APP_GHN_SHOP_ID;

    try {
        const response = await fetch(GHN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID
            },
            body: JSON.stringify({
                service_type_id: 2, // Standard service
                from_district_id: 1542, // Your shop district ID
                to_district_id: toDistrictId,
                to_ward_code: toWardCode,
                weight: weight,
                insurance_value: 0,
                coupon: null
            })
        });

        const data = await response.json();
        
        if (data.code === 200) {
            return {
                fee: data.data.total,
                originalFee: data.data.total,
                discount: 0,
                freeShipping: false,
                service: 'GHN'
            };
        } else {
            throw new Error(data.message || 'Cannot calculate shipping fee');
        }
    } catch (error) {
        console.error('GHN API Error:', error);
        // Fallback to mock calculation
        return calculateShippingFee(address, weight);
    }
};
*/

/**
 * Real GHTK API Integration (Example - requires API key)
 * Uncomment and configure when ready to use
 */
/*
export const calculateShippingFeeGHTK = async (address, weight, province, district) => {
    const GHTK_API_URL = 'https://services.giaohangtietkiem.vn/services/shipment/fee';
    const GHTK_TOKEN = process.env.REACT_APP_GHTK_TOKEN; // Add to .env file

    try {
        const params = new URLSearchParams({
            pick_province: 'Hà Nội', // Your shop location
            pick_district: 'Quận Hai Bà Trưng',
            province: province,
            district: district,
            weight: weight,
            value: 0,
            transport: 'road' // road or fly
        });

        const response = await fetch(`${GHTK_API_URL}?${params}`, {
            method: 'GET',
            headers: {
                'Token': GHTK_TOKEN
            }
        });

        const data = await response.json();
        
        if (data.success) {
            return {
                fee: data.fee.fee,
                originalFee: data.fee.fee,
                discount: 0,
                freeShipping: false,
                service: 'GHTK',
                estimatedTime: data.fee.delivery_time
            };
        } else {
            throw new Error(data.message || 'Cannot calculate shipping fee');
        }
    } catch (error) {
        console.error('GHTK API Error:', error);
        // Fallback to mock calculation
        return calculateShippingFee(address, weight);
    }
};
*/
