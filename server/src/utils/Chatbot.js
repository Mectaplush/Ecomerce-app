const { OpenAI } = require('openai');
const embeddingService = require('../services/embeddingService');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPEN_API_KEY });

class RAGChatbot {
    async askQuestion(question, imagesData) {
        try {
            let searchResults = [];
            let imageDescriptions = '';
            let clipSearchResults = [];

            // Enhanced multimodal search strategy
            if (imagesData && imagesData.length > 0) {
                // Process multiple images for CLIP search and descriptions
                const imageProcessingPromises = imagesData.map(async (imageData, index) => {
                    try {
                        // Generate description for context
                        const description = await embeddingService.generateImageDescription(imageData);

                        // Perform CLIP search for each image
                        const clipResults = await embeddingService.searchMultimodal(question, imagesData, {
                            topK: 5,
                            includeMetadata: true
                        });

                        return {
                            index,
                            description,
                            clipResults: clipResults.matches || []
                        };
                    } catch (error) {
                        console.error(`Error processing image ${index + 1}:`, error);
                        return {
                            index,
                            description: 'Không thể xử lý hình ảnh này',
                            clipResults: []
                        };
                    }
                });

                const imageResults = await Promise.all(imageProcessingPromises);

                // Build image descriptions
                const descriptions = imageResults.map(result =>
                    `Hình ảnh ${result.index + 1}: ${result.description}`
                );
                imageDescriptions = `\nHình ảnh khách hàng gửi:\n${descriptions.join('\n')}`;

                // Combine CLIP results from all images
                clipSearchResults = imageResults.flatMap(result => result.clipResults);

                // If we have both text and images, do combined multimodal search
                if (question && question.trim()) {
                    try {
                        const combinedSearch = await embeddingService.searchMultimodal(
                            question, imagesData, {
                            topK: 8,
                            includeMetadata: true
                        });
                        if (combinedSearch.matches) {
                            clipSearchResults = [...clipSearchResults, ...combinedSearch.matches];
                        }
                    } catch (error) {
                        console.warn('Combined multimodal search failed:', error);
                    }
                }
            }

            // Traditional text search (for fallback and additional context)
            if (question && question.trim()) {
                try {
                    const textSearchResults = await embeddingService.searchMultimodal(question, imagesData, {
                        topK: 8,
                        includeMetadata: true,
                        threshold: 0.6
                    });
                    searchResults = textSearchResults;
                } catch (error) {
                    console.warn('Text search failed:', error);
                    searchResults = [];
                }
            }

            // Merge and deduplicate results from CLIP and traditional search
            const allResults = [...clipSearchResults, ...searchResults];
            const uniqueResults = this.deduplicateResults(allResults);

            // Build context from merged search results
            const context = this.buildContextMultimodal(uniqueResults, true);

            const searchMethodInfo = clipSearchResults.length > 0 ?
                '\n[Hệ thống đã sử dụng AI CLIP để phân tích hình ảnh và tìm sản phẩm tương tự]' : '';

            const prompt = `
Bạn là một trợ lý bán hàng chuyên nghiệp của cửa hàng máy tính với khả năng hiểu cả văn bản và hình ảnh.

Thông tin sản phẩm liên quan:
${context}
${imageDescriptions}
${searchMethodInfo}

Câu hỏi của khách hàng: ${question || 'Khách hàng đã gửi hình ảnh để tìm sản phẩm tương tự'}

Hướng dẫn trả lời:
- Trả lời dựa trên thông tin sản phẩm được cung cấp từ cả tìm kiếm văn bản và AI CLIP
- Nếu có hình ảnh, hãy phân tích và so sánh với sản phẩm có sẵn dựa trên kết quả CLIP AI
- Ưu tiên các sản phẩm có độ liên quan cao (từ CLIP AI hoặc tìm kiếm văn bản)
- Nếu có sản phẩm phù hợp, hãy giới thiệu cụ thể với tên và giá
- Nếu không có thông tin, hãy lịch sự nói rằng cần kiểm tra thêm
- Trả lời một cách tự nhiên và thân thiện
- Không bịa đặt thông tin không có trong dữ liệu
- Nếu dùng CLIP AI, có thể nhắc đến rằng hệ thống đã phân tích hình ảnh để tìm sản phẩm tương tự
            `;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là trợ lý bán hàng chuyên nghiệp với khả năng hiểu cả văn bản và hình ảnh thông qua AI CLIP. Chỉ sử dụng thông tin được cung cấp để trả lời.'
                    },
                    { role: 'user', content: prompt },
                ],
                temperature: 0.7,
                max_tokens: 600 // Increased for more detailed multimodal responses
            });

            const answer = completion.choices[0].message.content;

            return {
                answer,
                sources: uniqueResults.slice(0, 8), // Return top 8 relevant products from both searches
                hasRelevantResults: uniqueResults.length > 0,
                searchMethods: {
                    clipResults: clipSearchResults.length,
                    textResults: searchResults.length,
                    combinedResults: uniqueResults.length,
                    hasImages: imagesData && imagesData.length > 0
                }
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

    buildContextMultimodal(searchResults, hasClipResults = false) {
        if (searchResults.length === 0) {
            return 'Không tìm thấy sản phẩm liên quan trong cơ sở dữ liệu.';
        }

        let context = '';
        const seenProducts = new Set();
        let clipResultsCount = 0;
        let textResultsCount = 0;

        for (const result of searchResults) {
            const { metadata, score } = result;

            // Avoid duplicate products
            if (metadata && metadata.productId && seenProducts.has(metadata.productId)) {
                continue;
            }

            if (metadata && metadata.productId) {
                seenProducts.add(metadata.productId);
            }

            // Determine if this is a CLIP result (from multimodal search)
            const isClipResult = result.id && result.id.includes('_clip');
            if (isClipResult) {
                clipResultsCount++;
            } else {
                textResultsCount++;
            }

            const searchMethod = isClipResult ? 'CLIP AI' : 'Tìm kiếm văn bản';

            if (result.type === 'text' || !result.type) {
                context += `\nSản phẩm: ${metadata?.name || 'N/A'}`;
                if (metadata?.price) {
                    const finalPrice = metadata.discount > 0
                        ? metadata.price - (metadata.price * metadata.discount / 100)
                        : metadata.price;
                    context += ` - Giá: ${finalPrice.toLocaleString()} VND`;
                }
                context += ` - Loại: ${metadata?.componentType || 'N/A'}`;
                if (result.content) {
                    context += ` - Nội dung: ${result.content}`;
                }
                context += ` (Độ liên quan: ${(score * 100).toFixed(1)}% - ${searchMethod})`;
            } else if (result.type === 'image') {
                context += `\nHình ảnh sản phẩm: ${metadata?.name || 'N/A'}`;
                if (result.content) {
                    context += ` - Mô tả: ${result.content}`;
                }
                context += ` (Độ liên quan: ${(score * 100).toFixed(1)}% - ${searchMethod})`;
            }
        }

        // Add summary of search methods used
        if (hasClipResults && clipResultsCount > 0) {
            context += `[Tìm kiếm bằng AI CLIP: ${clipResultsCount} kết quả, Tìm kiếm văn bản: ${textResultsCount} kết quả]\n${context}`;
        }

        return context || 'Không có thông tin chi tiết về sản phẩm liên quan.';
    }

    // Helper method to deduplicate search results
    deduplicateResults(results) {
        const seen = new Set();
        const uniqueResults = [];

        for (const result of results) {
            const productId = result.metadata?.productId;
            if (productId && !seen.has(productId)) {
                seen.add(productId);
                uniqueResults.push(result);
            } else if (!productId) {
                // Include results without productId (shouldn't happen but just in case)
                uniqueResults.push(result);
            }
        }

        // Sort by score (highest first)
        return uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 15);
    }

    async analyzeConversation(messages) {
        try {
            // Get user messages only
            const userMessages = messages
                .filter((msg) => msg.sender === 'user')
                .map((msg) => msg.content)
                .join('\n');

            // Use RAG to understand if user is asking about products
            const searchResults = await embeddingService.searchMultimodal(userMessages, [], {
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

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
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
            const searchResults = await embeddingService.searchMultimodal(query, [], {
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

const ragChatbot = new RAGChatbot();

async function askQuestion(question, images) {
    const result = await ragChatbot.askQuestion(question, images);
    return result.answer;
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
