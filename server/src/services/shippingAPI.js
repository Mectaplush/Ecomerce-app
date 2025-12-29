const axios = require('axios');

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
const calculateShippingFee = async (address, totalWeight = 1000, totalValue = 0) => {
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
const calculateShippingFeeGHN = async (address, weight, toDistrictId, toWardCode) => {
    const GHN_API_URL = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee';
    const GHN_TOKEN = process.env.GHN_TOKEN;
    const GHN_SHOP_ID = process.env.GHN_SHOP_ID;

    if (!GHN_TOKEN || !GHN_SHOP_ID) {
        console.warn('GHN credentials not configured, using mock calculation');
        return calculateShippingFee(address, weight);
    }

    try {
        const response = await axios.post(GHN_API_URL, {
            service_type_id: 2, // Standard service
            from_district_id: 1542, // Your shop district ID (replace with actual)
            to_district_id: toDistrictId,
            to_ward_code: toWardCode,
            weight: weight,
            insurance_value: 0,
            coupon: null
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID
            }
        });

        const data = response.data;

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

/**
 * Real GHTK API Integration (Example - requires API key)
 * Uncomment and configure when ready to use
 */
const calculateShippingFeeGHTK = async (address, weight, province, district) => {
    const GHTK_API_URL = 'https://services.giaohangtietkiem.vn/services/shipment/fee';
    const GHTK_TOKEN = process.env.GHTK_TOKEN; // Add to .env file

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

        const response = await axios.get(`${GHTK_API_URL}?${params}`, {
            headers: {
                'Token': GHTK_TOKEN
            }
        });

        const data = response.data;

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

/**
     * Extract district and ward from Vietnamese address
     * Address format: Street, Ward, District, City
     * Example: "123 Đường ABC, Phường XYZ, Quận 1, TP Hồ Chí Minh"
     */
const parseAddress = (addressString) => {
    if (!addressString) return { district: null, ward: null, province: null };

    const parts = addressString.split(',').map(s => s.trim());

    let district = null;
    let ward = null;
    let province = null;

    // Find district (Quận/Huyện/Thành phố/Thị xã)
    for (const part of parts) {
        if (part.match(/^(Quận|Huyện|Thành phố|Thị xã|TP)\s+/i)) {
            district = part;
        } else if (part.match(/^(Phường|Xã|Thị trấn|TT)\s+/i)) {
            ward = part;
        } else if (part.match(/^(Tỉnh|Thành phố)\s+/i) ||
            part.match(/(Hà Nội|TP Hồ Chí Minh|Đà Nẵng|Hải Phòng|Cần Thơ)/i)) {
            province = part;
        }
    }

    return { district, ward, province };
};

/**
 * Get GHN District ID and Ward Code from address
 * Calls GHN master data API to convert location names to IDs
 */
const getGHNLocationIds = async (addressString) => {
    const { district, ward, province } = parseAddress(addressString);

    if (!district || !ward) {
        console.warn('Cannot extract district/ward from address:', addressString);
        return { districtId: null, wardCode: null };
    }

    try {
        const GHN_TOKEN = process.env.GHN_TOKEN;
        const GHN_SHOP_ID = process.env.GHN_SHOP_ID;

        if (!GHN_TOKEN) {
            console.error('GHN_TOKEN not configured in environment variables');
            return { districtId: null, wardCode: null };
        }

        // Step 1: Get province ID
        const provinceResponse = await axios.get(
            'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province',
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Token': GHN_TOKEN
                }
            }
        );

        const provinceData = provinceResponse.data;
        if (provinceData.code !== 200) {
            throw new Error('Failed to fetch provinces from GHN');
        }

        // Find matching province
        const normalizeText = (text) => {
            return text
                .toLowerCase()
                .replace(/^(tỉnh|thành phố|tp)\s+/i, '')
                .trim();
        };

        const normalizedProvince = normalizeText(province || '');
        const matchedProvince = provinceData.data.find(p =>
            normalizeText(p.ProvinceName).includes(normalizedProvince) ||
            normalizedProvince.includes(normalizeText(p.ProvinceName))
        );

        if (!matchedProvince) {
            console.warn('Province not found in GHN:', province);
            return { districtId: null, wardCode: null };
        }

        // Step 2: Get districts for this province
        const districtResponse = await axios.get(
            `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/district?province_id=${matchedProvince.ProvinceID}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Token': GHN_TOKEN
                }
            }
        );

        const districtData = districtResponse.data;
        if (districtData.code !== 200) {
            throw new Error('Failed to fetch districts from GHN');
        }

        // Find matching district
        const normalizedDistrict = normalizeText(district);
        const matchedDistrict = districtData.data.find(d =>
            normalizeText(d.DistrictName).includes(normalizedDistrict) ||
            normalizedDistrict.includes(normalizeText(d.DistrictName))
        );

        if (!matchedDistrict) {
            console.warn('District not found in GHN:', district);
            return { districtId: null, wardCode: null };
        }

        // Step 3: Get wards for this district
        const wardResponse = await axios.get(
            `https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/ward?district_id=${matchedDistrict.DistrictID}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Token': GHN_TOKEN
                }
            }
        );

        const wardData = wardResponse.data;
        if (wardData.code !== 200) {
            throw new Error('Failed to fetch wards from GHN');
        }

        // Find matching ward
        const normalizedWard = normalizeText(ward);
        const matchedWard = wardData.data.find(w =>
            normalizeText(w.WardName).includes(normalizedWard) ||
            normalizedWard.includes(normalizeText(w.WardName))
        );

        if (!matchedWard) {
            console.warn('Ward not found in GHN:', ward);
            // Return district ID even if ward not found
            return { districtId: matchedDistrict.DistrictID, wardCode: null };
        }

        console.log('GHN Location matched:', {
            province: matchedProvince.ProvinceName,
            district: matchedDistrict.DistrictName,
            ward: matchedWard.WardName,
            districtId: matchedDistrict.DistrictID,
            wardCode: matchedWard.WardCode
        });

        return {
            districtId: matchedDistrict.DistrictID,
            wardCode: matchedWard.WardCode
        };

    } catch (error) {
        console.error('Error getting GHN location IDs:', error);
        return { districtId: null, wardCode: null };
    }
};

module.exports = {
    calculateShippingFee,
    calculateShippingFeeGHN,
    calculateShippingFeeGHTK,
    parseAddress,
    getGHNLocationIds
};
