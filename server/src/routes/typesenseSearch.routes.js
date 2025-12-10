// server/src/routes/typesenseSearch.routes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { 
    hybridSearch, 
    getSimilarProducts, 
    searchWithImage 
} = require('../controllers/typesenseSearch.controller');

// Configure multer for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only images
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Hybrid search endpoint
router.get('/search', hybridSearch);

// Similar products endpoint
router.get('/similar/:productId', getSimilarProducts);

// Image search endpoint
router.post('/search/image', upload.single('image'), searchWithImage);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Typesense search API is healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;