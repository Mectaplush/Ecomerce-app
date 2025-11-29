const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerProducts = require('../controllers/products.controller');

router.post('/api/create-product', authAdmin, asyncHandler(controllerProducts.createProduct));
router.get('/api/get-products', asyncHandler(controllerProducts.getProducts));
router.post('/api/update-product', authAdmin, asyncHandler(controllerProducts.updateProduct));
router.delete('/api/delete-product', authAdmin, asyncHandler(controllerProducts.deleteProduct));

router.get('/api/get-products-by-categories', asyncHandler(controllerProducts.getProductsByCategories));
router.get('/api/get-product-by-id', asyncHandler(controllerProducts.getProductById));

router.get('/api/get-product-by-component-type', asyncHandler(controllerProducts.getProductByComponentType));
router.post('/api/build-pc-cart', authUser, asyncHandler(controllerProducts.buildPcCart));
router.get('/api/get-cart-build-pc', authUser, asyncHandler(controllerProducts.getBuildPcCart));

router.post('/api/update-quantity-cart-build-pc', authUser, asyncHandler(controllerProducts.updateQuantityCartBuildPc));

router.post('/api/delete-cart-build-pc', authUser, asyncHandler(controllerProducts.deleteCartBuildPc));

router.post('/api/create-product-watch', authUser, asyncHandler(controllerProducts.createProductWatch));

router.get('/api/get-product-watch', authUser, asyncHandler(controllerProducts.getProductWatch));

router.get('/api/get-product-by-id-category', asyncHandler(controllerProducts.getProductByIdCategory));

router.get('/api/get-product-hot-sale', asyncHandler(controllerProducts.getProductHotSale));

router.get('/api/get-product-search', asyncHandler(controllerProducts.getProductSearch));

router.get('/api/get-product-search-by-category', asyncHandler(controllerProducts.getProductSearchByCategory));

module.exports = router;
