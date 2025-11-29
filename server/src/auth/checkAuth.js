const { BadUserRequestError, BadUser2RequestError } = require('../core/error.response');
const { verifyToken } = require('../services/tokenServices');
const modelUser = require('../models/users.model');

const asyncHandler = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

const authUser = async (req, res, next) => {
    try {
        // Kiểm tra token từ cookie trước
        let token = req.cookies.token;

        // Nếu không có token trong cookie, kiểm tra Authorization header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Bỏ "Bearer " prefix
            }
        }

        if (!token) throw new BadUserRequestError('Vui lòng đăng nhập');

        const decoded = await verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

const authAdmin = async (req, res, next) => {
    try {
        // Kiểm tra token từ cookie trước
        let token = req.cookies.token;

        // Nếu không có token trong cookie, kiểm tra Authorization header
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Bỏ "Bearer " prefix
            }
        }

        if (!token) throw new BadUserRequestError('Bạn không có quyền truy cập');

        const decoded = await verifyToken(token);
        const { id } = decoded;
        const findUser = await modelUser.findOne({ where: { id } });
        if (findUser.isAdmin === '0') {
            throw new BadUser2RequestError('Bạn không có quyền truy cập');
        }
        req.user = decoded;
        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    asyncHandler,
    authUser,
    authAdmin,
};
