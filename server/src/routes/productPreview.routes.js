const express = require('express');
const router = express.Router();

const controllerProductPreview = require('../controllers/productPreview.controller');
const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

router.post('/api/create-product-preview', authUser, asyncHandler(controllerProductPreview.createProductPreview));
router.get('/api/get-product-preview-user', authUser, asyncHandler(controllerProductPreview.getProductPreviewUser));

module.exports = router;
