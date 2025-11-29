const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const modelProduct = require('../models/products.model');

async function askQuestion(question) {
    try {
        const products = await modelProduct.findAll({});
        const productData = products
            .map(
                (product) =>
                    `Tên: ${product.name}, Giá: ${
                        product.discount > 0 ? product.price - (product.price * product.discount) / 100 : product.price
                    }`,
            )
            .join('\n');

        const prompt = `
Bạn là một trợ lý bán hàng chuyên nghiệp.
Đây là danh sách sản phẩm hiện có trong cửa hàng:
${productData}

Câu hỏi của khách hàng: ${question}
Hãy trả lời một cách tự nhiên và thân thiện.
        `;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'Bạn là trợ lý bán hàng chuyên nghiệp.' },
                { role: 'user', content: prompt },
            ],
        });

        const answer = completion.choices[0].message.content;
        return answer;
    } catch (error) {
        console.error(error);
        return 'Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu!';
    }
}

async function analyzeConversation(messages) {
    try {
        // Lấy các tin nhắn của user (không tính tin nhắn bot)
        const userMessages = messages
            .filter((msg) => msg.sender === 'user')
            .map((msg) => msg.content)
            .join('\n');

        const prompt = `
Bạn là một chuyên gia phân tích hành vi khách hàng. Hãy phân tích các tin nhắn sau của khách hàng và xác định xem họ có thực sự quan tâm đến việc mua sản phẩm máy tính hay không.

Tin nhắn của khách hàng:
${userMessages}

Tiêu chí đánh giá:
1. QUAN TÂM (interested): Khách hàng hỏi về sản phẩm, giá cả, thông số kỹ thuật, so sánh sản phẩm, yêu cầu tư vấn, hoặc thể hiện ý định mua hàng rõ ràng.
2. SPAM: Tin nhắn không liên quan, chào hỏi chung chung không có mục đích rõ ràng, tin nhắn ngắn 1-2 từ, spam quảng cáo, hoặc tin nhắn lặp lại vô nghĩa.

Hãy trả lời CHÍNH XÁC 1 trong 2 từ: "interested" hoặc "spam"
`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'Bạn là chuyên gia phân tích hành vi khách hàng. Chỉ trả lời "interested" hoặc "spam".',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 10,
        });

        const result = completion.choices[0].message.content.toLowerCase().trim();

        // Đảm bảo kết quả hợp lệ
        if (result.includes('interested')) {
            return 'interested';
        } else if (result.includes('spam')) {
            return 'spam';
        }

        // Mặc định trả về pending nếu không phân tích được
        return 'pending';
    } catch (error) {
        console.error('Error analyzing conversation:', error);
        return 'pending'; // Nếu có lỗi, để pending để admin xem lại
    }
}

module.exports = { askQuestion, analyzeConversation };
