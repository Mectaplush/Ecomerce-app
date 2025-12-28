const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../auth/checkAuth');
const addressController = require('../controllers/address.controller');

// Public endpoints for address data
router.get('/provinces', asyncHandler(addressController.getProvinces));
router.get('/districts/:provinceCode', asyncHandler(addressController.getDistricts));
router.get('/wards/:districtCode', asyncHandler(addressController.getWards));
router.get('/search', asyncHandler(addressController.searchAddresses));
router.post('/validate', asyncHandler(addressController.validateAddress));

// Test endpoint to verify the API is working
router.get('/test', asyncHandler(async (req, res) => {
    res.json({
        success: true,
        message: 'Address API is working',
        timestamp: new Date().toISOString()
    });
}));

// Admin endpoint for cache management
router.delete('/cache', asyncHandler(addressController.clearAddressCache));

module.exports = router;
