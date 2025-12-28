import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class AddressAPI {
    async getProvinces() {
        try {
            console.log('Fetching provinces from:', `${BASE_URL}/api/provinces`);
            const response = await axios.get(`${BASE_URL}/api/provinces`, {
                timeout: 10000 // 10 second timeout
            });
            console.log('Provinces response:', response.data);

            // Handle different response formats
            if (response.data && response.data.metadata) {
                return response.data.metadata;
            } else if (Array.isArray(response.data)) {
                return response.data;
            } else {
                console.error('Unexpected response format:', response.data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching provinces:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);

            // Return empty array instead of throwing to prevent component crashes
            return [];
        }
    }

    async getDistricts(provinceCode) {
        try {
            const response = await axios.get(`${BASE_URL}/api/districts/${provinceCode}`, {
                timeout: 10000
            });

            if (response.data && response.data.metadata) {
                return response.data.metadata;
            } else if (Array.isArray(response.data)) {
                return response.data;
            } else {
                console.error('Unexpected districts response format:', response.data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
            return [];
        }
    }

    async getWards(districtCode) {
        try {
            const response = await axios.get(`${BASE_URL}/api/wards/${districtCode}`, {
                timeout: 10000
            });

            if (response.data && response.data.metadata) {
                return response.data.metadata;
            } else if (Array.isArray(response.data)) {
                return response.data;
            } else {
                console.error('Unexpected wards response format:', response.data);
                return [];
            }
        } catch (error) {
            console.error('Error fetching wards:', error);
            return [];
        }
    }

    async searchAddresses(query, province, district, ward) {
        try {
            const params = new URLSearchParams({ query });
            if (province) params.append('province', province);
            if (district) params.append('district', district);
            if (ward) params.append('ward', ward);

            const response = await axios.get(`${BASE_URL}/api/search?${params}`, {
                timeout: 10000
            });

            if (response.data && response.data.metadata) {
                return response.data.metadata;
            } else if (Array.isArray(response.data)) {
                return response.data;
            } else {
                console.error('Unexpected search response format:', response.data);
                return [];
            }
        } catch (error) {
            console.error('Error searching addresses:', error);
            return [];
        }
    }

    async validateAddress(address) {
        try {
            const response = await axios.post(`${BASE_URL}/api/validate`, { address }, {
                timeout: 10000
            });

            if (response.data && response.data.metadata) {
                return response.data.metadata;
            } else {
                return response.data;
            }
        } catch (error) {
            console.error('Error validating address:', error);
            return { isValid: false, error: 'Validation failed' };
        }
    }
}

export default new AddressAPI();
