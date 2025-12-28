import React, { useState, useEffect, useCallback } from 'react';
import { AutoComplete, Input, Form, Space, Select, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import { debounce } from 'lodash';
import addressAPI from '../../services/addressAPI';

const AddressAutocomplete = ({ value, onChange, form, disabled = false }) => {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [streetSuggestions, setStreetSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedDistrict, setSelectedDistrict] = useState(null);
    const [selectedWard, setSelectedWard] = useState(null);
    const [streetAddress, setStreetAddress] = useState('');

    // Load provinces on mount
    useEffect(() => {
        fetchProvinces();
    }, []);

    const fetchProvinces = async () => {
        try {
            console.log('AddressAutocomplete: Fetching provinces...');
            const data = await addressAPI.getProvinces();
            console.log('AddressAutocomplete: Received provinces data:', data);
            
            if (!data || !Array.isArray(data)) {
                console.error('Invalid provinces data received:', data);
                message.error('Dữ liệu tỉnh/thành phố không hợp lệ');
                return;
            }
            
            // Handle both formats: direct array or nested structure
            const provinceList = Array.isArray(data) ? data : data.data || [];
            
            setProvinces(provinceList.map(item => ({
                value: item.code,
                label: item.name,
                fullName: item.name
            })));
        } catch (error) {
            console.error('AddressAutocomplete: Error fetching provinces:', error);
            message.warning('Không thể tải danh sách tỉnh/thành phố. Vui lòng thử lại sau.');
        }
    };

    const fetchDistricts = async (provinceCode) => {
        try {
            const data = await addressAPI.getDistricts(provinceCode);
            const districtList = Array.isArray(data) ? data : [];
            setDistricts(districtList.map(item => ({
                value: item.code,
                label: item.name,
                fullName: item.name
            })));
            setWards([]);
        } catch (error) {
            console.error('Error fetching districts:', error);
            message.warning('Không thể tải danh sách quận/huyện');
            setDistricts([]);
            setWards([]);
        }
    };

    const fetchWards = async (districtCode) => {
        try {
            const data = await addressAPI.getWards(districtCode);
            const wardList = Array.isArray(data) ? data : [];
            setWards(wardList.map(item => ({
                value: item.code,
                label: item.name,
                fullName: item.name
            })));
        } catch (error) {
            console.error('Error fetching wards:', error);
            message.warning('Không thể tải danh sách phường/xã');
            setWards([]);
        }
    };

    // Debounced street search
    const searchStreets = useCallback(
        debounce(async (query, province, district, ward) => {
            if (query.length < 3) {
                setStreetSuggestions([]);
                return;
            }

            setLoading(true);
            try {
                console.log('Searching for streets with query:', query, 'in', { province, district, ward });
                const results = await addressAPI.searchAddresses(query, province, district, ward);
                
                console.log('Street search results:', results);
                
                const suggestions = (results || []).map((item, index) => ({
                    value: `${item.houseNumber ? item.houseNumber + ' ' : ''}${item.road}`,
                    label: `${item.houseNumber ? item.houseNumber + ' ' : ''}${item.road}`,
                    key: `street-${index}`
                })).filter(item => item.value.trim() !== '');
                
                console.log('Formatted suggestions:', suggestions);
                setStreetSuggestions(suggestions);
            } catch (error) {
                console.error('Error searching streets:', error);
                setStreetSuggestions([]);
                // Don't show error message for search failures to avoid annoying users
            } finally {
                setLoading(false);
            }
        }, 500),
        []
    );

    const handleProvinceChange = (provinceCode) => {
        const province = provinces.find(p => p.value === provinceCode);
        setSelectedProvince(province);
        setSelectedDistrict(null);
        setSelectedWard(null);
        setDistricts([]);
        setWards([]);
        setStreetAddress('');
        
        if (provinceCode) {
            fetchDistricts(provinceCode);
        }
        
        updateFullAddress('', '', '', province?.fullName || '');
    };

    const handleDistrictChange = (districtCode) => {
        const district = districts.find(d => d.value === districtCode);
        setSelectedDistrict(district);
        setSelectedWard(null);
        setWards([]);
        setStreetAddress('');
        
        if (districtCode) {
            fetchWards(districtCode);
        }
        
        updateFullAddress('', '', district?.fullName || '', selectedProvince?.fullName || '');
    };

    const handleWardChange = (wardCode) => {
        const ward = wards.find(w => w.value === wardCode);
        setSelectedWard(ward);
        setStreetAddress('');
        
        updateFullAddress(
            '',
            ward?.fullName || '',
            selectedDistrict?.fullName || '',
            selectedProvince?.fullName || ''
        );
    };

    const handleStreetChange = (value) => {
        setStreetAddress(value);
        updateFullAddress(
            value,
            selectedWard?.fullName || '',
            selectedDistrict?.fullName || '',
            selectedProvince?.fullName || ''
        );
        
        if (selectedProvince && selectedDistrict && selectedWard && value.length >= 3) {
            searchStreets(value, selectedProvince.fullName, selectedDistrict.fullName, selectedWard.fullName);
        }
    };

    const updateFullAddress = (street, ward, district, province) => {
        const parts = [street, ward, district, province].filter(Boolean);
        const fullAddress = parts.join(', ');
        onChange?.(fullAddress);
    };

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
                label="Tỉnh/Thành phố"
                required
                rules={[{ required: true, message: 'Vui lòng chọn tỉnh/thành phố!' }]}
            >
                <Select
                    showSearch
                    placeholder="Chọn tỉnh/thành phố"
                    optionFilterProp="label"
                    value={selectedProvince?.value}
                    onChange={handleProvinceChange}
                    options={provinces}
                    disabled={disabled}
                    style={{ width: '100%' }}
                />
            </Form.Item>

            <Form.Item
                label="Quận/Huyện"
                required
                rules={[{ required: true, message: 'Vui lòng chọn quận/huyện!' }]}
            >
                <Select
                    showSearch
                    placeholder="Chọn quận/huyện"
                    optionFilterProp="label"
                    value={selectedDistrict?.value}
                    onChange={handleDistrictChange}
                    disabled={!selectedProvince || disabled}
                    options={districts}
                    style={{ width: '100%' }}
                />
            </Form.Item>

            <Form.Item
                label="Phường/Xã"
                required
                rules={[{ required: true, message: 'Vui lòng chọn phường/xã!' }]}
            >
                <Select
                    showSearch
                    placeholder="Chọn phường/xã"
                    optionFilterProp="label"
                    value={selectedWard?.value}
                    onChange={handleWardChange}
                    disabled={!selectedDistrict || disabled}
                    options={wards}
                    style={{ width: '100%' }}
                />
            </Form.Item>

            <Form.Item
                label="Số nhà, tên đường"
                required
                rules={[
                    { required: true, message: 'Vui lòng nhập số nhà và tên đường!' },
                    { min: 3, message: 'Địa chỉ phải có ít nhất 3 ký tự!' }
                ]}
            >
                <AutoComplete
                    value={streetAddress}
                    onChange={handleStreetChange}
                    options={streetSuggestions}
                    placeholder="Nhập số nhà, tên đường (VD: 123 Nguyễn Du)"
                    filterOption={false}
                    disabled={!selectedWard || disabled}
                    style={{ width: '100%' }}
                >
                    <Input 
                        prefix={<EnvironmentOutlined />}
                        loading={loading}
                    />
                </AutoComplete>
            </Form.Item>

            <Form.Item label="Địa chỉ đầy đủ">
                <Input.TextArea
                    value={value}
                    placeholder="Địa chỉ sẽ được tự động tạo từ các trường trên"
                    rows={2}
                    disabled
                    style={{ backgroundColor: '#f5f5f5' }}
                />
            </Form.Item>
        </Space>
    );
};

export default AddressAutocomplete;
