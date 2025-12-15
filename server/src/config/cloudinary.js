const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

require('dotenv').config();

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình storage cho avatar
const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'shop-pc/avatars', // Thư mục lưu avatar
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' }, // Resize về 200x200, tập trung vào khuôn mặt
            { quality: 'auto:good' }, // Tự động tối ưu chất lượng
        ],
        public_id: (req, file) => {
            // Tạo tên file duy nhất với userId và timestamp
            return `avatar_${req.user.id}_${Date.now()}`;
        },
    },
});

// Middleware multer cho upload avatar
const uploadAvatar = multer({
    storage: avatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024, // Giới hạn 5MB
    },
    fileFilter: (req, file, cb) => {
        // Chỉ cho phép upload file ảnh
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ được upload file ảnh!'), false);
        }
    },
});

module.exports = {
    cloudinary,
    uploadAvatar,
};
