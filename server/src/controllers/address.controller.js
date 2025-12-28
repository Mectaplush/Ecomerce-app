const addressService = require('../services/addressService');
const { OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class AddressController {
    async getProvinces(req, res) {
        try {
            console.log('AddressController: getProvinces called');
            const provinces = await addressService.getProvinces();
            console.log('AddressController: Provinces fetched, count:', provinces?.length);

            new OK({
                message: 'Lấy danh sách tỉnh/thành phố thành công',
                metadata: provinces
            }).send(res);
        } catch (error) {
            console.error('AddressController: Error in getProvinces:', error.message);
            console.error('AddressController: Full error stack:', error.stack);
            throw new BadRequestError('Không thể lấy danh sách tỉnh/thành phố');
        }
    }

    async getDistricts(req, res) {
        const { provinceCode } = req.params;

        if (!provinceCode) {
            throw new BadRequestError('Mã tỉnh/thành phố là bắt buộc');
        }

        try {
            const districts = await addressService.getDistricts(provinceCode);
            new OK({
                message: 'Lấy danh sách quận/huyện thành công',
                metadata: districts
            }).send(res);
        } catch (error) {
            throw new BadRequestError('Không thể lấy danh sách quận/huyện');
        }
    }

    async getWards(req, res) {
        const { districtCode } = req.params;

        if (!districtCode) {
            throw new BadRequestError('Mã quận/huyện là bắt buộc');
        }

        try {
            const wards = await addressService.getWards(districtCode);
            new OK({
                message: 'Lấy danh sách phường/xã thành công',
                metadata: wards
            }).send(res);
        } catch (error) {
            throw new BadRequestError('Không thể lấy danh sách phường/xã');
        }
    }

    async searchAddresses(req, res) {
        const { query, province, district, ward } = req.query;

        if (!query || query.length < 3) {
            throw new BadRequestError('Từ khóa tìm kiếm phải có ít nhất 3 ký tự');
        }

        try {
            const results = await addressService.searchAddresses(query, province, district, ward);
            new OK({
                message: 'Tìm kiếm địa chỉ thành công',
                metadata: results
            }).send(res);
        } catch (error) {
            throw new BadRequestError('Không thể tìm kiếm địa chỉ');
        }
    }

    async validateAddress(req, res) {
        const { address } = req.body;

        const validation = addressService.validateVietnameseAddress(address);

        if (!validation.isValid) {
            throw new BadRequestError(validation.error);
        }

        new OK({
            message: 'Địa chỉ hợp lệ',
            metadata: { isValid: true }
        }).send(res);
    }

    async clearAddressCache(req, res) {
        try {
            addressService.clearCache();
            new OK({
                message: 'Xóa cache địa chỉ thành công'
            }).send(res);
        } catch (error) {
            throw new BadRequestError('Không thể xóa cache địa chỉ');
        }
    }
}

module.exports = new AddressController();
