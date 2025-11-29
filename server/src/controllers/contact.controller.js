const modelContact = require('../models/contact.model');

const { Created, OK } = require('../core/success.response');
const { BadRequestError } = require('../core/error.response');

class ContactController {
    async createContact(req, res) {
        const { fullName, phone, option1, option2, option3, option4 } = req.body;
        if (!fullName || !phone || !option1 || !option2 || !option3 || !option4) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }
        const contact = await modelContact.create({ fullName, phone, option1, option2, option3, option4 });
        new Created({ message: 'Tạo liên hệ thành công', metadata: contact }).send(res);
    }

    async getContacts(req, res) {
        const contacts = await modelContact.findAll();
        new OK({ message: 'Lấy danh sách liên hệ thành công', metadata: contacts }).send(res);
    }
}

module.exports = new ContactController();
