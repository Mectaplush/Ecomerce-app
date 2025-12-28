const aiPcBuilderService = require('../services/aiPcBuilder.service');
const { BadRequestError } = require('../core/error.response');
const { OK } = require('../core/success.response');

class AIPcBuilderController {
    async recommendComponents(req, res) {
        const { purpose, budget } = req.body;

        if (!purpose || !purpose.trim()) {
            throw new BadRequestError('Vui lòng nhập mục đích sử dụng');
        }

        if (!budget || budget <= 0) {
            throw new BadRequestError('Vui lòng nhập ngân sách hợp lệ');
        }

        const recommendations = await aiPcBuilderService.recommendComponents(purpose, budget);

        return new OK({
            message: 'AI đã chọn linh kiện thành công',
            metadata: recommendations,
        }).send(res);
    }
}

module.exports = new AIPcBuilderController();
