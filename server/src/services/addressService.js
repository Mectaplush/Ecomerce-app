const axios = require('axios');

class AddressService {
    constructor() {
        this.vietnamApiBase = 'https://provinces.open-api.vn/api';
        this.nominatimBase = 'https://nominatim.openstreetmap.org';
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    }

    async getProvinces() {
        const cacheKey = 'provinces';
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log('AddressService: Returning cached provinces');
                return cached.data;
            }
        }

        try {
            console.log('AddressService: Fetching provinces from external API...');
            const response = await axios.get(`${this.vietnamApiBase}/p/`, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'ShopPC/1.0 (contact@shoppc.com)'
                }
            });
            const data = response.data;

            // Validate response data
            if (!data || !Array.isArray(data)) {
                console.error('AddressService: Invalid response format for provinces:', data);
                throw new Error('Invalid province data format');
            }

            console.log('AddressService: Successfully fetched provinces:', data?.length, 'items');

            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('AddressService: Error fetching provinces:', error.message);

            // Return fallback data if API fails
            const fallbackProvinces = this.getFallbackProvinces();
            console.log('AddressService: Returning fallback province data');
            return fallbackProvinces;
        }
    }

    async getDistricts(provinceCode) {
        const cacheKey = `districts_${provinceCode}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await axios.get(`${this.vietnamApiBase}/p/${provinceCode}?depth=2`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'ShopPC/1.0 (contact@shoppc.com)'
                }
            });

            const data = response.data?.districts || [];

            if (!Array.isArray(data)) {
                console.error('AddressService: Invalid districts data format:', response.data);
                throw new Error('Invalid districts data format');
            }

            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('AddressService: Error fetching districts for province', provinceCode, ':', error.message);
            // Return empty array instead of throwing
            return [];
        }
    }

    async getWards(districtCode) {
        const cacheKey = `wards_${districtCode}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await axios.get(`${this.vietnamApiBase}/d/${districtCode}?depth=2`, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'ShopPC/1.0 (contact@shoppc.com)'
                }
            });

            const data = response.data?.wards || [];

            if (!Array.isArray(data)) {
                console.error('AddressService: Invalid wards data format:', response.data);
                throw new Error('Invalid wards data format');
            }

            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error('AddressService: Error fetching wards for district', districtCode, ':', error.message);
            // Return empty array instead of throwing
            return [];
        }
    }

    async searchAddresses(query, province, district, ward) {
        try {
            const locationContext = [ward, district, province].filter(Boolean).join(', ');
            const fullQuery = `${query}, ${locationContext}, Vietnam`;

            const response = await axios.get(`${this.nominatimBase}/search`, {
                params: {
                    q: fullQuery,
                    format: 'json',
                    addressdetails: 1,
                    limit: 5,
                    countrycodes: 'vn'
                },
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'ShopPC/1.0 (contact@shoppc.com)' // Required for Nominatim
                }
            });

            if (!Array.isArray(response.data)) {
                console.error('AddressService: Invalid search response format:', response.data);
                return [];
            }

            return response.data.map(item => ({
                displayName: item.display_name,
                road: item.address?.road || '',
                houseNumber: item.address?.house_number || '',
                lat: item.lat,
                lon: item.lon
            }));
        } catch (error) {
            console.error('AddressService: Error searching addresses:', error.message);
            // Return empty array instead of throwing to not break the UI
            return [];
        }
    }

    validateVietnameseAddress(address) {
        // Enhanced validation for Vietnamese addresses
        if (!address || typeof address !== 'string') {
            return { isValid: false, error: 'Địa chỉ không hợp lệ' };
        }

        const trimmed = address.trim();
        if (trimmed.length < 10) {
            return { isValid: false, error: 'Địa chỉ quá ngắn' };
        }

        if (trimmed.length > 500) {
            return { isValid: false, error: 'Địa chỉ quá dài' };
        }

        // Check for basic Vietnamese address components
        const hasProvince = /(?:tỉnh|thành phố|tp\.|hà nội|hồ chí minh|đà nẵng)/i.test(trimmed);
        const hasDistrict = /(?:quận|huyện|thị xã|thành phố)/i.test(trimmed);
        const hasWard = /(?:phường|xã|thị trấn)/i.test(trimmed);

        if (!hasProvince && !hasDistrict && !hasWard) {
            return {
                isValid: false,
                error: 'Địa chỉ phải bao gồm thông tin phường/xã, quận/huyện, tỉnh/thành phố'
            };
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
            /^[\s,.-]*$/,           // Only whitespace/punctuation
            /(.)\1{5,}/,            // Repeated characters
            /^(test|abc|123+|xxx+)$/i, // Common test values
            /<script|javascript:/i,  // XSS prevention
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(trimmed))) {
            return {
                isValid: false,
                error: 'Vui lòng nhập địa chỉ thực và hợp lệ'
            };
        }

        return { isValid: true };
    }

    clearCache() {
        this.cache.clear();
    }

    getFallbackProvinces() {
        // Basic Vietnam provinces as fallback when external API fails
        return [
            { code: 1, name: "Hà Nội" },
            { code: 79, name: "Thành phố Hồ Chí Minh" },
            { code: 48, name: "Đà Nẵng" },
            { code: 31, name: "Hải Phòng" },
            { code: 92, name: "Cần Thơ" },
            { code: 2, name: "Hà Giang" },
            { code: 4, name: "Cao Bằng" },
            { code: 6, name: "Bắc Kạn" },
            { code: 8, name: "Tuyên Quang" },
            { code: 10, name: "Lào Cai" },
            { code: 11, name: "Điện Biên" },
            { code: 12, name: "Lai Châu" },
            { code: 14, name: "Sơn La" },
            { code: 15, name: "Yên Bái" },
            { code: 17, name: "Hoà Bình" },
            { code: 19, name: "Thái Nguyên" },
            { code: 20, name: "Lạng Sơn" },
            { code: 22, name: "Quảng Ninh" },
            { code: 24, name: "Bắc Giang" },
            { code: 25, name: "Phú Thọ" },
            { code: 26, name: "Vĩnh Phúc" },
            { code: 27, name: "Bắc Ninh" },
            { code: 30, name: "Hải Dương" },
            { code: 33, name: "Hưng Yên" },
            { code: 34, name: "Thái Bình" },
            { code: 35, name: "Hà Nam" },
            { code: 36, name: "Nam Định" },
            { code: 37, name: "Ninh Bình" },
            { code: 38, name: "Thanh Hóa" },
            { code: 40, name: "Nghệ An" },
            { code: 42, name: "Hà Tĩnh" },
            { code: 44, name: "Quảng Bình" },
            { code: 45, name: "Quảng Trị" },
            { code: 46, name: "Thừa Thiên Huế" },
            { code: 49, name: "Quảng Nam" },
            { code: 51, name: "Quảng Ngãi" },
            { code: 52, name: "Bình Định" },
            { code: 54, name: "Phú Yên" },
            { code: 56, name: "Khánh Hòa" },
            { code: 58, name: "Ninh Thuận" },
            { code: 60, name: "Bình Thuận" },
            { code: 62, name: "Kon Tum" },
            { code: 64, name: "Gia Lai" },
            { code: 66, name: "Đắk Lắk" },
            { code: 67, name: "Đắk Nông" },
            { code: 68, name: "Lâm Đồng" },
            { code: 70, name: "Bình Phước" },
            { code: 72, name: "Tây Ninh" },
            { code: 74, name: "Bình Dương" },
            { code: 75, name: "Đồng Nai" },
            { code: 77, name: "Bà Rịa - Vũng Tàu" },
            { code: 80, name: "Long An" },
            { code: 82, name: "Tiền Giang" },
            { code: 83, name: "Bến Tre" },
            { code: 84, name: "Trà Vinh" },
            { code: 86, name: "Vĩnh Long" },
            { code: 87, name: "Đồng Tháp" },
            { code: 89, name: "An Giang" },
            { code: 91, name: "Kiên Giang" },
            { code: 93, name: "Hậu Giang" },
            { code: 94, name: "Sóc Trăng" },
            { code: 95, name: "Bạc Liêu" },
            { code: 96, name: "Cà Mau" }
        ];
    }
}

module.exports = new AddressService();
