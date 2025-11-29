const Groq = require('groq-sdk');
const embeddingService = require('../services/embeddingService');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

class RAGChatbot {
    async askQuestion(question) {
        try {
            // Search for relevant products using RAG
            const searchResults = await embeddingService.search(question, {
                topK: 10,
                includeMetadata: true,
                threshold: 0.6
            });

            // Build context from search results
            const context = this.buildContext(searchResults);

            const prompt = `
Bạn là một trợ lý bán hàng chuyên nghiệp của cửa hàng máy tính.

Thông tin sản phẩm liên quan:
${context}

Câu hỏi của khách hàng: ${question}

Hướng dẫn trả lời:
- Trả lời dựa trên thông tin sản phẩm được cung cấp
- Nếu có sản phẩm phù hợp, hãy giới thiệu cụ thể với tên và giá
- Nếu không có thông tin, hãy lịch sự nói rằng cần kiểm tra thêm
- Trả lời một cách tự nhiên và thân thiện
- Không bịa đặt thông tin không có trong dữ liệu
            `;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { 
                        role: 'system', 
                        content: 'Bạn là trợ lý bán hàng chuyên nghiệp. Chỉ sử dụng thông tin được cung cấp để trả lời.' 
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 500
            });

            const answer = completion.choices[0].message.content;
            
            return {
                answer,
                sources: searchResults.slice(0, 5), // Return top 5 relevant products
                hasRelevantResults: searchResults.length > 0
            };

        } catch (error) {
            console.error('RAG Chatbot Error:', error);
            return {
                answer: 'Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau!',
                sources: [],
                hasRelevantResults: false
            };
        }
    }

    buildContext(searchResults) {
        if (searchResults.length === 0) {
            return 'Không tìm thấy sản phẩm liên quan trong cơ sở dữ liệu.';
        }

        let context = '';
        const seenProducts = new Set();

        for (const result of searchResults) {
            const { metadata, score } = result;
            
            // Avoid duplicate products
            if (metadata.productId && seenProducts.has(metadata.productId)) {
                continue;
            }
            
            if (metadata.productId) {
                seenProducts.add(metadata.productId);
            }

            if (result.type === 'text') {
                context += `\nSản phẩm: ${metadata.name}`;
                if (metadata.price) {
                    const finalPrice = metadata.discount > 0 
                        ? metadata.price - (metadata.price * metadata.discount / 100)
                        : metadata.price;
                    context += ` - Giá: ${finalPrice.toLocaleString()} VND`;
                }
                context += ` - Loại: ${metadata.componentType}`;
                context += ` - Nội dung: ${result.content}`;
                context += ` (Độ liên quan: ${(score * 100).toFixed(1)}%)`;
            } else if (result.type === 'image') {
                context += `\nHình ảnh sản phẩm: ${metadata.name}`;
                if (result.content) {
                    context += ` - Mô tả: ${result.content}`;
                }
                context += ` (Độ liên quan: ${(score * 100).toFixed(1)}%)`;
            }
        }

        return context || 'Không có thông tin chi tiết về sản phẩm liên quan.';
    }

    async analyzeConversation(messages) {
        try {
            // Get user messages only
            const userMessages = messages
                .filter((msg) => msg.sender === 'user')
                .map((msg) => msg.content)
                .join('\n');

            // Use RAG to understand if user is asking about products
            const searchResults = await embeddingService.search(userMessages, {
                topK: 5,
                threshold: 0.4
            });

            const hasProductQueries = searchResults.length > 0;

            const prompt = `
Bạn là một chuyên gia phân tích hành vi khách hàng. Hãy phân tích các tin nhắn sau của khách hàng.

Tin nhắn của khách hàng:
${userMessages}

Thông tin bổ sung: ${hasProductQueries ? 'Khách hàng có hỏi về sản phẩm trong cơ sở dữ liệu' : 'Không tìm thấy liên quan đến sản phẩm'}

Tiêu chí đánh giá:
1. QUAN TÂM (interested): 
   - Hỏi về sản phẩm, giá cả, thông số kỹ thuật
   - So sánh sản phẩm, yêu cầu tư vấn
   - Thể hiện ý định mua hàng
   - Hỏi về khuyến mãi, bảo hành
   - Câu hỏi có ý nghĩa và liên quan đến việc mua sắm

2. SPAM: 
   - Tin nhắn không liên quan đến sản phẩm
   - Chào hỏi chung chung không mục đích
   - Tin nhắn ngắn 1-2 từ vô nghĩa
   - Spam quảng cáo hoặc nội dung lặp lại

Trả lời CHÍNH XÁC 1 trong 2 từ: "interested" hoặc "spam"
`;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là chuyên gia phân tích khách hàng. Chỉ trả lời "interested" hoặc "spam".',
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.1,
                max_tokens: 10,
            });

            const result = completion.choices[0].message.content.toLowerCase().trim();

            // Parse result with fallback logic
            if (result.includes('interested')) {
                return 'interested';
            } else if (result.includes('spam')) {
                return 'spam';
            }

            // Enhanced fallback logic using RAG results
            if (hasProductQueries && userMessages.length > 10) {
                return 'interested'; // If they asked about products with decent message length
            }

            return 'pending';

        } catch (error) {
            console.error('Error analyzing conversation:', error);
            return 'pending';
        }
    }

    // New method to get product recommendations based on user query
    async getRecommendations(query, limit = 5) {
        try {
            const searchResults = await embeddingService.search(query, {
                topK: limit * 2, // Get more to filter duplicates
                threshold: 0.5
            });

            const recommendations = [];
            const seenProducts = new Set();

            for (const result of searchResults) {
                if (recommendations.length >= limit) break;
                
                const { metadata } = result;
                if (metadata.productId && !seenProducts.has(metadata.productId)) {
                    seenProducts.add(metadata.productId);
                    recommendations.push({
                        productId: metadata.productId,
                        name: metadata.name,
                        price: metadata.price,
                        componentType: metadata.componentType,
                        relevanceScore: result.score
                    });
                }
            }

            return recommendations;
        } catch (error) {
            console.error('Error getting recommendations:', error);
            return [];
        }
    }
}

// Create singleton instance
const ragChatbot = new RAGChatbot();

// Export functions for backward compatibility
async function askQuestion(question) {
    const result = await ragChatbot.askQuestion(question);
    return result.answer; // Return just the answer for compatibility
}

async function analyzeConversation(messages) {
    return await ragChatbot.analyzeConversation(messages);
}

// Export both old interface and new class
module.exports = { 
    askQuestion, 
    analyzeConversation,
    RAGChatbot: ragChatbot
};
