const { OpenAI } = require('openai');
// Use Typesense for embeddings and search
const embeddingService = require('../services/typesenseEmbeddingService');
require('dotenv').config();
const openAiEmbeddingService = require('../services/embeddingService');
const fs = require('node:fs/promises');

// Import order search service
const orderSearchService = require('../services/orderSearchService');

/**
 * @type {import('../services/policySearchService').PolicySearchService|null}
 */
let policySearchService;
try {
    policySearchService = require('../services/policySearchService');
    console.log('Policy search service loaded successfully');
} catch (error) {
    console.warn('Policy search service not found, policy search will be disabled:', error.message);
    policySearchService = null;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class RAGChatbot {
    /**
     * PROMPT INJECTION!!!!
     * for each image in images, generate a description and search multimodal with original question, generated description and image 
     * @param {string} question - User's question
     * @param {Array} imagesData - Array of image data
     * @param {Array} conversationHistory - Previous messages for context (default: [])
     * @param {string} userId - User ID for order search filtering (optional)
     */
    async askQuestion(question, imagesData, conversationHistory = [], userId = null) {
        try {
            let searchResults = [];
            let imageDescriptions = '';
            let clipSearchResults = [];
            let policyResults = [];
            let orderResults = [];
            let reformulatedQuery = question;

            // Step 1: Reformulate the query for better search using conversation history
            if (question && question.trim()) {
                reformulatedQuery = await this.reformulateQuery(question, conversationHistory);
                console.log(`Original query: ${question}`);
                console.log(`Reformulated query: ${reformulatedQuery}`);
            }

            // Step 2: Check if this is a policy-related question and search policies
            if (question) {
                try {
                    const isPolicyQuestion = await this.isPolicyQuestion(question, conversationHistory);
                    if (isPolicyQuestion) {
                        // Try to use the policy search service
                        if (policySearchService) {
                            // Try different possible method names for policy search
                            if (typeof policySearchService.intelligentPolicySearch === 'function') {
                                policyResults = await policySearchService.intelligentPolicySearch(question);
                            } else if (typeof policySearchService.searchPolicies === 'function') {
                                policyResults = await policySearchService.searchPolicies(question);
                            } else if (typeof policySearchService.search === 'function') {
                                policyResults = await policySearchService.search(question);
                            } else {
                                console.warn('No compatible policy search method found, using fallback');
                                policyResults = await this.fallbackPolicySearch(question);
                            }
                        } else {
                            // Use fallback policy search
                            console.log('Using fallback policy search');
                            policyResults = await this.fallbackPolicySearch(question);
                        }
                        console.log(`Found ${policyResults.length} policy results`);
                    }
                } catch (error) {
                    console.warn('Policy search failed, using fallback:', error.message);
                    try {
                        const isPolicyQuestion = await this.isPolicyQuestion(question, conversationHistory);
                        if (isPolicyQuestion) {
                            policyResults = await this.fallbackPolicySearch(question);
                        }
                    } catch (fallbackError) {
                        console.error('Fallback policy search also failed:', fallbackError.message);
                        policyResults = [];
                    }
                }
            }

            // console.log("UserId: ", userId);
            // Step 3: Check if this is an order-related question and search orders
            if (question && userId) {
                try {
                    const isOrderQuestion = await this.isOrderQuestion(question, conversationHistory);
                    // console.log("IsOrderQuestion", isOrderQuestion);
                    if (isOrderQuestion) {
                        orderResults = await orderSearchService.searchOrders(question, userId);
                        console.log(`Found ${orderResults.length} order results`);
                    }
                } catch (error) {
                    console.warn('Order search failed:', error.message);
                    orderResults = [];
                }
            }

            // Enhanced multimodal search strategy
            if (imagesData && imagesData.length > 0) {
                // Process multiple images for CLIP search and descriptions
                const imageProcessingPromises = imagesData.map(async (imageData, index) => {
                    try {
                        // Generate description for context
                        const description = await openAiEmbeddingService.generateImageDescription(imageData);

                        // Perform CLIP search for each image
                        const clipResults = await embeddingService.searchMultimodal(`${question} ${description}`, imagesData, {
                            topK: 5,
                            includeMetadata: true
                        });

                        // console.log('CLIP search: ', clipResults);

                        return {
                            index,
                            description,
                            clipResults: clipResults || []
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
                if (reformulatedQuery && reformulatedQuery.trim()) {
                    try {
                        const combinedSearch = await embeddingService.searchMultimodal(
                            reformulatedQuery, imagesData, {
                            topK: 16,
                            includeMetadata: true
                        });
                        if (combinedSearch && combinedSearch.length > 0) {
                            clipSearchResults = [...clipSearchResults, ...combinedSearch];
                        }
                    } catch (error) {
                        console.warn('Combined multimodal search failed:', error);
                    }
                }
            }

            // Step 3: Traditional text search using reformulated query (for fallback and additional context)
            if (reformulatedQuery && reformulatedQuery.trim()) {
                try {
                    const textSearchResults = await embeddingService.searchMultimodal(reformulatedQuery, imagesData, {
                        topK: 16,
                        includeMetadata: true,
                        threshold: 0.6
                    });
                    // console.log('Text Search Results: ', textSearchResults);
                    searchResults = textSearchResults;
                } catch (error) {
                    console.warn('Text search failed:', error);
                    searchResults = [];
                }
            }

            console.log(`RAG Chatbot: Found ${clipSearchResults.length} CLIP results, ${searchResults.length} text results, ${policyResults.length} policy results, and ${orderResults.length} order results`);

            // Merge and deduplicate results from CLIP and traditional search
            const allResults = [...clipSearchResults, ...searchResults];
            const uniqueResults = this.deduplicateResults(allResults);

            // Build context from merged search results
            const context = this.buildContextMultimodal(uniqueResults, true);
            const policyContext = this.buildPolicyContext(policyResults);
            const orderContext = this.buildOrderContext(orderResults);

            // Build conversation history context (last 6 messages)
            const conversationContext = this.buildConversationContext(conversationHistory);

            // console.log('Context:', context);

            const searchMethodInfo = clipSearchResults.length > 0 ?
                '\n[Hệ thống đã sử dụng AI CLIP để phân tích hình ảnh và tìm sản phẩm tương tự]' : '';

            const prompt = `
Bạn là một trợ lý bán hàng chuyên nghiệp của cửa hàng máy tính với khả năng hiểu cả văn bản và hình ảnh.

${conversationContext}

Thông tin sản phẩm liên quan:
${context}
${policyContext}
${orderContext}
${imageDescriptions}
${searchMethodInfo}

Câu hỏi gốc của khách hàng: ${question || 'Khách hàng đã gửi hình ảnh để tìm sản phẩm tương tự'}
Truy vấn đã được tối ưu: ${reformulatedQuery}

Url gốc cúa sản phẩm:
baseUrl = ${process.env.FRONTEND_HOST || 'http://localhost:5173'}

${
                // Moved to file so prompt can be updated at runtime
                await fs.readFile("responseInstructions.md", "utf8").catch(() => 'Hãy trả lời một cách chuyên nghiệp và hữu ích.')
                }
            `;

            // console.log("Prompt: ", prompt);

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
                policyResults: policyResults.slice(0, 3), // Return top 3 policy results
                orderResults: orderResults.slice(0, 5), // Return top 5 order results
                hasRelevantResults: uniqueResults.length > 0 || policyResults.length > 0 || orderResults.length > 0,
                reformulatedQuery,
                searchMethods: {
                    clipResults: clipSearchResults.length,
                    textResults: searchResults.length,
                    policyResults: policyResults.length,
                    orderResults: orderResults.length,
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
                context += `\nproductId: ${metadata?.productId}` || '';
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

    // Method to reformulate user query for better search
    async reformulateQuery(question, conversationHistory = []) {
        try {
            if (!question || question.trim().length < 3) {
                return question;
            }

            // Build recent conversation context (last 4 messages)
            const recentHistory = conversationHistory
                .slice(-4)
                .map(msg => `${msg.sender}: ${msg.content}`)
                .join('\n');

            const prompt = `
Bạn là chuyên gia tối ưu hóa tìm kiếm. Hãy chuyển đổi câu hỏi của khách hàng thành một truy vấn tìm kiếm tốt hơn cho cơ sở dữ liệu sản phẩm máy tính.

Lịch sử hội thoại gần đây:
${recentHistory}

Câu hỏi hiện tại: ${question}

Quy tắc tối ưu:
1. Trích xuất từ khóa chính về sản phẩm, thương hiệu, thông số kỹ thuật
2. Bổ sung thông tin từ lịch sử hội thoại nếu có liên quan
3. Loại bỏ từ dừng và câu hỏi chung chung
4. Tập trung vào thuật ngữ kỹ thuật và tên sản phẩm
5. Giữ nguyên tiếng Việt, không dịch sang tiếng Anh

Ví dụ:
- "Có cái nào rẻ hơn không?" → "sản phẩm giá rẻ thay thế tương tự"
- "Cấu hình này chơi game được không?" → "card đồ họa CPU RAM gaming performance"

Chỉ trả về truy vấn được tối ưu, không giải thích:`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là chuyên gia tối ưu truy vấn tìm kiếm. Chỉ trả về truy vấn được tối ưu.'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2,
                max_tokens: 100
            });

            const reformulated = completion.choices[0].message.content.trim();
            return reformulated.length > 0 ? reformulated : question;

        } catch (error) {
            console.error('Error reformulating query:', error);
            return question;
        }
    }

    // Method to detect if question is policy-related
    async isPolicyQuestion(question, conversationHistory = []) {
        try {
            if (!question) return false;

            // Simple keyword detection first
            const policyKeywords = [
                'chính sách', 'quy định', 'điều khoản', 'bảo hành', 'đổi trả', 'hoàn tiền',
                'giao hàng', 'vận chuyển', 'thanh toán', 'bảo mật', 'hỗ trợ', 'liên hệ',
                'warranty', 'return', 'refund', 'shipping', 'policy', 'terms', 'support'
            ];

            const lowerQuestion = question.toLowerCase();
            const hasKeywords = policyKeywords.some(keyword => lowerQuestion.includes(keyword));

            if (hasKeywords) return true;

            // Use AI for more sophisticated detection
            const recentHistory = conversationHistory
                .slice(-3)
                .map(msg => `${msg.sender}: ${msg.content}`)
                .join('\n');

            const prompt = `
Phân tích xem câu hỏi có liên quan đến chính sách, quy định, dịch vụ của cửa hàng không?

Lịch sử: ${recentHistory}
Câu hỏi: ${question}

Chính sách bao gồm: bảo hành, đổi trả, hoàn tiền, giao hàng, thanh toán, hỗ trợ, điều khoản sử dụng, bảo mật.

Trả lời "yes" hoặc "no":`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Phân tích câu hỏi về chính sách. Chỉ trả lời "yes" hoặc "no".'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 5
            });

            return completion.choices[0].message.content.toLowerCase().includes('yes');

        } catch (error) {
            console.error('Error detecting policy question:', error);
            return false;
        }
    }

    // Method to build policy context
    buildPolicyContext(policyResults) {
        if (!policyResults || policyResults.length === 0) {
            return '';
        }

        let context = '\n\nThông tin chính sách liên quan:\n';
        policyResults.forEach((policy, index) => {
            const title = policy.title || policy.section || `Chính sách ${index + 1}`;
            const content = policy.content || policy.text || 'Không có nội dung chi tiết';
            context += `${index + 1}. ${title}\n${content}\n\n`;
        });

        return context;
    }

    // Fallback policy search when service is not available
    async fallbackPolicySearch(question) {
        // Simple keyword-based policy responses
        const lowerQuestion = question.toLowerCase();
        const mockPolicies = [];

        if (lowerQuestion.includes('bảo hành') || lowerQuestion.includes('warranty')) {
            mockPolicies.push({
                title: 'Chính sách bảo hành',
                content: 'Sản phẩm được bảo hành theo chính sách của nhà sản xuất. Thời gian bảo hành từ 12-36 tháng tùy theo loại sản phẩm. Vui lòng liên hệ bộ phận hỗ trợ để được tư vấn cụ thể.'
            });
        }

        if (lowerQuestion.includes('đổi trả') || lowerQuestion.includes('hoàn tiền') || lowerQuestion.includes('return')) {
            mockPolicies.push({
                title: 'Chính sách đổi trả',
                content: 'Khách hàng có thể đổi/trả sản phẩm trong vòng 7-15 ngày kể từ ngày mua, với điều kiện sản phẩm còn nguyên vẹn, đầy đủ phụ kiện và hóa đơn mua hàng.'
            });
        }

        if (lowerQuestion.includes('giao hàng') || lowerQuestion.includes('vận chuyển') || lowerQuestion.includes('ship')) {
            mockPolicies.push({
                title: 'Chính sách giao hàng',
                content: 'Miễn phí giao hàng trong nội thành cho đơn hàng từ 500.000 VND. Thời gian giao hàng 1-3 ngày làm việc. Hỗ trợ giao hàng toàn quốc.'
            });
        }

        return mockPolicies;
    }

    // Method to detect if question is order-related
    async isOrderQuestion(question, conversationHistory = []) {
        try {
            if (!question) return false;

            // Simple keyword detection first
            const orderKeywords = [
                'đơn hàng', 'order', 'mua', 'thanh toán', 'giao hàng', 'delivery',
                'trạng thái', 'status', 'hủy', 'cancel', 'hoàn tiền', 'refund',
                'cod', 'momo', 'banking', 'thẻ', 'card', 'visa', 'mastercard',
                'pending', 'completed', 'delivered', 'cancelled', 'chờ', 'hoàn thành',
                'đã giao', 'đã hủy', 'lịch sử', 'history', 'mua hàng', 'purchase'
            ];

            const lowerQuestion = question.toLowerCase();
            const hasKeywords = orderKeywords.some(keyword => lowerQuestion.includes(keyword));

            console.log("LQuestion: ", lowerQuestion);

            if (hasKeywords) return true;
            return true;

            // Use AI for more sophisticated detection if no obvious keywords
            const recentHistory = conversationHistory
                .slice(-3)
                .map(msg => `${msg.sender}: ${msg.content}`)
                .join('\n');

            const prompt = `
Phân tích xem câu hỏi có liên quan đến đơn hàng, lịch sử mua hàng, trạng thái đơn hàng của khách hàng không?

Lịch sử: ${recentHistory}
Câu hỏi: ${question}

Đơn hàng bao gồm: trạng thái đơn hàng, lịch sử mua hàng, thanh toán, giao hàng, hủy đơn, hoàn tiền, theo dõi đơn hàng.

Trả lời "yes" hoặc "no":`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Phân tích câu hỏi về đơn hàng. Chỉ trả lời "yes" hoặc "no".'
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 5
            });

            return completion.choices[0].message.content.toLowerCase().includes('yes');

        } catch (error) {
            console.error('Error detecting order question:', error);
            return false;
        }
    }

    // Method to build order context
    buildOrderContext(orderResults) {
        if (!orderResults || orderResults.length === 0) {
            return '';
        }

        let context = '\n\nThông tin đơn hàng của khách hàng:\n';
        orderResults.forEach((order, index) => {
            context += `${index + 1}. Đơn hàng #${order.orderId}\n`;
            context += `   - Sản phẩm: ${order.productName}\n`;
            context += `   - Số lượng: ${order.quantity}\n`;
            context += `   - Tổng tiền: ${order.totalPrice?.toLocaleString()} VND\n`;
            context += `   - Trạng thái: ${order.status}\n`;
            context += `   - Phương thức thanh toán: ${order.paymentType}\n`;
            context += `   - Người nhận: ${order.fullName}\n`;
            context += `   - SĐT: ${order.phone}\n`;
            context += `   - Địa chỉ: ${order.address}\n`;

            if (order.createdAt) {
                const orderDate = new Date(order.createdAt);
                context += `   - Ngày đặt: ${orderDate.toLocaleDateString('vi-VN')}\n`;
            }

            if (order.updatedAt && order.updatedAt !== order.createdAt) {
                const updateDate = new Date(order.updatedAt);
                context += `   - Cập nhật cuối: ${updateDate.toLocaleDateString('vi-VN')}\n`;
            }

            context += '\n';
        });

        return context;
    }

    // Method to build conversation context
    buildConversationContext(conversationHistory) {
        if (!conversationHistory || conversationHistory.length === 0) {
            return 'Lịch sử hội thoại: Đây là tin nhắn đầu tiên.';
        }

        // Get last 6 messages for context
        const recentMessages = conversationHistory.slice(-6);
        let context = 'Lịch sử hội thoại gần đây:\n';

        recentMessages.forEach((msg, index) => {
            const role = msg.sender === 'user' ? 'Khách hàng' : 'Trợ lý';
            context += `${role}: ${msg.content}\n`;
        });

        return context;
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

async function askQuestion(question, images, conversationHistory = [], userId = null) {
    const result = await ragChatbot.askQuestion(question, images, conversationHistory, userId);
    return result.answer;
}

// New function that returns full result with sources and metadata
async function askQuestionWithMetadata(question, images, conversationHistory = [], userId = null) {
    return await ragChatbot.askQuestion(question, images, conversationHistory, userId);
}

async function analyzeConversation(messages) {
    return await ragChatbot.analyzeConversation(messages);
}

// Export both old interface and new class
module.exports = {
    askQuestion,
    askQuestionWithMetadata,
    analyzeConversation,
    RAGChatbot: ragChatbot
};
