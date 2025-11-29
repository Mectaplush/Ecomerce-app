const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerPayments = require('../controllers/payments.controller');

router.post('/api/payments', authUser, asyncHandler(controllerPayments.payments));
router.get('/api/check-payment-momo', asyncHandler(controllerPayments.checkPaymentMomo));
router.get('/api/check-payment-vnpay', asyncHandler(controllerPayments.checkPaymentVnpay));

router.get('/api/get-payments', authUser, asyncHandler(controllerPayments.getPayments));

router.post('/api/cancel-order', authUser, asyncHandler(controllerPayments.cancelOrder));
router.get('/api/get-payment', authUser, asyncHandler(controllerPayments.getProductByIdPayment));

router.get('/api/get-order-admin', asyncHandler(controllerPayments.getOrderAdmin));
router.post('/api/update-order-status', asyncHandler(controllerPayments.updateOrderStatus));

module.exports = router;
