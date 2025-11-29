const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerCart = require('../controllers/cart.controller');

router.post('/api/add-to-cart', authUser, asyncHandler(controllerCart.addToCart));
router.get('/api/get-cart', authUser, asyncHandler(controllerCart.getCart));
router.post('/api/delete-cart', authUser, asyncHandler(controllerCart.deleteCart));

router.post('/api/update-info-cart', authUser, asyncHandler(controllerCart.updateInfoCart));

router.post('/api/add-to-cart-build-pc', authUser, asyncHandler(controllerCart.addToCartBuildPC));

router.post('/api/update-quantity', authUser, asyncHandler(controllerCart.updateQuantity));

router.get('/api/get-cart-build-pc', authUser, asyncHandler(controllerCart.getCartBuildPc));

router.post('/api/delete-all-cart-build-pc', authUser, asyncHandler(controllerCart.deleteAllCartBuildPC));

module.exports = router;
