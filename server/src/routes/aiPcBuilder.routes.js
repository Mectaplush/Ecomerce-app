const express = require('express');
const router = express.Router();
const aiPcBuilderController = require('../controllers/aiPcBuilder.controller');
const asyncHandler = require('../auth/checkAuth').asyncHandler;

router.post('/api/ai-recommend-components', asyncHandler(aiPcBuilderController.recommendComponents));

module.exports = router;
