const express = require('express');
const router = express.Router();

const { authUser, authAdmin } = require('../auth/checkAuth');
const { asyncHandler } = require('../auth/checkAuth');

const controllerBlogs = require('../controllers/blogs.controller');

router.post('/api/create-blog', authAdmin, asyncHandler(controllerBlogs.createBlog));
router.get('/api/get-blogs', asyncHandler(controllerBlogs.getBlogs));
router.get('/api/get-blog-by-id', asyncHandler(controllerBlogs.getBlogById));
router.delete('/api/delete-blog', authAdmin, asyncHandler(controllerBlogs.deleteBlog));

module.exports = router;
