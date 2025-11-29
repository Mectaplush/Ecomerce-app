const express = require('express');
const router = express.Router();

const controllerUser = require('../controllers/users.controller');
const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

router.post('/api/register', asyncHandler(controllerUser.registerUser));
router.post('/api/login', asyncHandler(controllerUser.loginUser));
router.get('/api/auth', authUser, asyncHandler(controllerUser.authUser));
router.get('/api/refresh-token', asyncHandler(controllerUser.refreshToken));

router.get('/api/logout', authUser, asyncHandler(controllerUser.logout));

router.post('/api/update-info-user', authUser, asyncHandler(controllerUser.updateInfoUser));

router.get('/api/dashboard', asyncHandler(controllerUser.getDashboardStats));

router.get('/api/get-order-stats', asyncHandler(controllerUser.getOrderStats));

router.get('/api/get-users', asyncHandler(controllerUser.getUsers));

router.post('/api/login-google', asyncHandler(controllerUser.loginGoogle));

router.post('/api/forgot-password', asyncHandler(controllerUser.forgotPassword));

router.post('/api/reset-password', asyncHandler(controllerUser.resetPassword));

router.post('/api/update-role-user', asyncHandler(controllerUser.updateRoleUser));

router.get('/api/users/pie-chart', asyncHandler(controllerUser.getBieuDoTron));

router.get('/api/admin', authAdmin, (req, res) => {
    return res.status(200).json({ message: true });
});

module.exports = router;
