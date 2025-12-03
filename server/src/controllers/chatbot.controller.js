const { Created, OK } = require('../core/success.response');
const chatbotModel = require('../models/chatbot.model');
const chatbotConversationModel = require('../models/chatbotConversation.model');
const userModel = require('../models/users.model');
const { askQuestion, analyzeConversation } = require('../utils/Chatbot');

class ChatbotController {
    async createMessager(req, res) {
        // TODO: handle case where id == undefined
        // console.log(req);
        const { id } = req.user;
        const { question, images } = req.body;

        const response = await askQuestion(question, images);

        // Tìm hoặc tạo conversation cho user này
        let conversation = await chatbotConversationModel.findOne({
            where: { userId: id },
            order: [['createdAt', 'DESC']],
        });

        if (!conversation) {
            conversation = await chatbotConversationModel.create({
                userId: id,
                lastMessage: question,
                messageCount: 0,
            });
        }

        // Lưu tin nhắn của user
        await chatbotModel.create({
            userId: id,
            conversationId: conversation.id,
            sender: 'user',
            content: question,
        });

        // Lưu tin nhắn của bot
        await chatbotModel.create({
            userId: id,
            conversationId: conversation.id,
            sender: 'bot',
            content: response,
        });

        // Cập nhật conversation
        const newMessageCount = conversation.messageCount + 2;
        await conversation.update({
            lastMessage: question,
            messageCount: newMessageCount,
        });

        // Tự động phân tích conversation nếu có >= 4 tin nhắn và status vẫn là pending
        if (newMessageCount >= 4 && conversation.status === 'pending') {
            // Lấy tất cả tin nhắn trong conversation để phân tích
            const allMessages = await chatbotModel.findAll({
                where: { conversationId: conversation.id },
                order: [['createdAt', 'ASC']],
            });

            // Phân tích bằng AI
            const analyzedStatus = await analyzeConversation(allMessages);

            // Cập nhật status nếu không phải pending
            if (analyzedStatus !== 'pending') {
                await conversation.update({ status: analyzedStatus });
                console.log(`✅ Auto-analyzed conversation ${conversation.id}: ${analyzedStatus}`);
            }
        }

        new Created({
            message: 'OK',
            metadata: response,
        }).send(res);
    }

    async getChatbot(req, res) {
        const { id } = req.user;
        const messages = await chatbotModel.findAll({ where: { userId: id } });

        // Sort messages by createdAt in ascending order (oldest first)
        messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        new OK({
            message: 'OK',
            metadata: messages,
        }).send(res);
    }

    // Admin APIs
    async getAllConversations(req, res) {
        const conversations = await chatbotConversationModel.findAll({
            include: [
                {
                    model: userModel,
                    attributes: ['id', 'fullName', 'email', 'phone', 'address'],
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        new OK({
            message: 'OK',
            metadata: conversations,
        }).send(res);
    }

    async getConversationDetail(req, res) {
        const { id } = req.params;

        const conversation = await chatbotConversationModel.findByPk(id, {
            include: [
                {
                    model: userModel,
                    attributes: ['id', 'fullName', 'email', 'phone', 'address'],
                },
            ],
        });

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        const messages = await chatbotModel.findAll({
            where: { conversationId: id },
            order: [['createdAt', 'ASC']],
        });

        new OK({
            message: 'OK',
            metadata: {
                conversation,
                messages,
            },
        }).send(res);
    }

    async updateConversationStatus(req, res) {
        const { id } = req.params;
        const { status } = req.body;

        const conversation = await chatbotConversationModel.findByPk(id);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        await conversation.update({ status });

        new OK({
            message: 'Cập nhật trạng thái thành công',
            metadata: conversation,
        }).send(res);
    }

    async deleteConversation(req, res) {
        const { id } = req.params;

        const conversation = await chatbotConversationModel.findByPk(id);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Xóa tất cả messages trong conversation
        await chatbotModel.destroy({ where: { conversationId: id } });

        // Xóa conversation
        await conversation.destroy();

        new OK({
            message: 'Xóa cuộc trò chuyện thành công',
        }).send(res);
    }

    async reanalyzeConversation(req, res) {
        const { id } = req.params;

        const conversation = await chatbotConversationModel.findByPk(id);

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Lấy tất cả tin nhắn trong conversation
        const messages = await chatbotModel.findAll({
            where: { conversationId: id },
            order: [['createdAt', 'ASC']],
        });

        if (messages.length === 0) {
            return res.status(400).json({ message: 'No messages to analyze' });
        }

        // Phân tích bằng AI
        const analyzedStatus = await analyzeConversation(messages);

        // Cập nhật status
        await conversation.update({ status: analyzedStatus });

        new OK({
            message: 'Phân tích lại thành công',
            metadata: {
                conversationId: id,
                newStatus: analyzedStatus,
            },
        }).send(res);
    }

    async reanalyzeAllConversations(req, res) {
        try {
            // Lấy tất cả conversations cần phân tích (có thể lọc theo status nếu muốn)
            const conversations = await chatbotConversationModel.findAll();

            let analyzed = 0;
            let failed = 0;

            for (const conversation of conversations) {
                try {
                    // Lấy tin nhắn
                    const messages = await chatbotModel.findAll({
                        where: { conversationId: conversation.id },
                        order: [['createdAt', 'ASC']],
                    });

                    if (messages.length >= 2) {
                        // Phân tích
                        const analyzedStatus = await analyzeConversation(messages);

                        // Cập nhật
                        await conversation.update({ status: analyzedStatus });
                        analyzed++;
                        console.log(`✅ Analyzed conversation ${conversation.id}: ${analyzedStatus}`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to analyze conversation ${conversation.id}:`, error);
                    failed++;
                }
            }

            new OK({
                message: 'Hoàn thành phân tích tất cả cuộc trò chuyện',
                metadata: {
                    total: conversations.length,
                    analyzed,
                    failed,
                },
            }).send(res);
        } catch (error) {
            console.error('Error in reanalyzeAllConversations:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}

module.exports = new ChatbotController();
