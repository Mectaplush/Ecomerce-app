const modelBlogs = require('../models/blogs.model');

const { Created, OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class controllerBlogs {
    async createBlog(req, res) {
        const { title, content, image } = req.body;
        if (!title || !content || !image) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const blog = await modelBlogs.create({
            title,
            content,
            image,
        });
        new Created({
            message: 'Tạo bài viết thành công',
            metadata: blog,
        }).send(res);
    }

    async getBlogs(req, res) {
        const blogs = await modelBlogs.findAll();
        new OK({
            message: 'Lấy danh sách bài viết thành công',
            metadata: blogs,
        }).send(res);
    }

    async getBlogById(req, res) {
        const { id } = req.query;
        const blog = await modelBlogs.findOne({
            where: {
                id,
            },
        });
        if (!blog) {
            throw new NotFoundError('Bài viết không tồn tại');
        }
        new OK({
            message: 'Lấy bài viết thành công',
            metadata: blog,
        }).send(res);
    }
    async deleteBlog(req, res) {
        const { id } = req.query;
        const blog = await modelBlogs.destroy({
            where: {
                id,
            },
        });
        new OK({
            message: 'Xóa bài viết thành công',
            metadata: blog,
        }).send(res);
    }
}

module.exports = new controllerBlogs();
