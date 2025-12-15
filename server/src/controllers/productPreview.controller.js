const productPreview = require('../models/productPreview');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

class ProductPreviewController {
    async createProductPreview(req, res) {
        const { productId, rating, content } = req.body;
        if (!productId || !rating || !content) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const { id } = req.user;
        const dataProductPreview = await productPreview.create({ productId, rating, content, userId: id });
        new Created({ message: 'Đánh giá sản phẩm thành công', metadata: dataProductPreview }).send(res);
    }

    async getProductPreviewUser(req, res) {
        const { id } = req.user;
        const dataProductPreview = await productPreview.findAll({ where: { userId: id } });
        new OK({ message: 'Lấy danh sách đánh giá sản phẩm thành công', metadata: dataProductPreview }).send(res);
    }

    async updateProductPreview(req, res) {
        const { id, rating, content } = req.body;
        const userId = req.user.id;

        if (!id || !rating || !content) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Kiểm tra xem review có thuộc về user hiện tại không
        const existingReview = await productPreview.findOne({
            where: { id, userId },
        });

        if (!existingReview) {
            throw new BadRequestError('Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa');
        }

        const updatedReview = await productPreview.update(
            { rating, content },
            {
                where: { id, userId },
                returning: true,
            },
        );

        new OK({
            message: 'Cập nhật đánh giá thành công',
            metadata: updatedReview,
        }).send(res);
    }

    async deleteProductPreview(req, res) {
        const { id } = req.body;
        const userId = req.user.id;

        if (!id) {
            throw new BadRequestError('Vui lòng cung cấp ID đánh giá');
        }

        // Kiểm tra xem review có thuộc về user hiện tại không
        const existingReview = await productPreview.findOne({
            where: { id, userId },
        });

        if (!existingReview) {
            throw new BadRequestError('Không tìm thấy đánh giá hoặc bạn không có quyền xóa');
        }

        await productPreview.destroy({
            where: { id, userId },
        });

        new OK({
            message: 'Xóa đánh giá thành công',
        }).send(res);
    }
}

module.exports = new ProductPreviewController();
