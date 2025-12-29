const { OpenAI } = require('openai');
// Use Typesense for embeddings and search
const embeddingService = require('../services/typesenseEmbeddingService');
require('dotenv').config();
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
        let stopwatch = process.hrtime();

        try {

            let searchResults = [];
            let imageDescriptions = '';
            let clipSearchResults = [];
            let policyResults = [];
            let orderResults = [];
            let adviceContext = '';
            let reformulatedQuery = question;

            // Step 1: Process images first - generate descriptions and use them throughout
            if (imagesData && imagesData.length > 0) {
                console.log(`Processing ${imagesData.length} images for multimodal search...`);

                const imageProcessingPromises = imagesData.map(async (imageData, index) => {
                    try {
                        // Generate description for each image
                        const description = await embeddingService.generateImageDescription(imageData);

                        // Search with CLIP for this specific image
                        const clipResults = await embeddingService.searchMultimodal('', [imageData], {
                            topK: 8,
                            includeMetadata: true
                        });

                        return {
                            index,
                            description: description || 'Không thể tạo mô tả cho hình ảnh này',
                            clipResults: clipResults || []
                        };
                    } catch (error) {
                        console.warn(`Failed to process image ${index}:`, error);
                        return {
                            index,
                            description: 'Không thể xử lý hình ảnh này',
                            clipResults: []
                        };
                    }
                });

                const imageResults = await Promise.all(imageProcessingPromises);

                // Build image descriptions for use in prompt and query reformulation
                const descriptions = imageResults.map(result =>
                    `Hình ảnh ${result.index + 1}: ${result.description}`
                );
                imageDescriptions = `\nHình ảnh khách hàng gửi:\n${descriptions.join('\n')}`;

                // Combine CLIP results from all images
                clipSearchResults = imageResults.flatMap(result => result.clipResults);
            }

            // Step 2: Reformulate the query using conversation history AND image descriptions
            if (question && question.trim() || imageDescriptions) {
                // Include image descriptions in query reformulation context
                const contextForReformulation = imageDescriptions ?
                    `${question}\n\nNgười dùng cũng gửi kèm hình ảnh: ${imageDescriptions}` : question;
                reformulatedQuery = await this.reformulateQuery(contextForReformulation, conversationHistory);
                console.log(`Original query: ${question}`);
                console.log(`Image descriptions: ${imageDescriptions}`);
                console.log(`Reformulated query: ${reformulatedQuery}`);
            }

            // Step 3: Check if this is a policy-related question and search policies (using image context if available)
            if (question) {
                try {
                    // Use both question and image descriptions for policy detection
                    const questionWithImageContext = imageDescriptions ?
                        `${question}\n${imageDescriptions}` : question;
                    const isPolicyQuestion = await this.isPolicyQuestion(questionWithImageContext, conversationHistory);
                    if (isPolicyQuestion) {
                        // Try to use the policy search service
                        if (policySearchService) {
                            // Try different possible method names for policy search
                            if (typeof policySearchService.intelligentPolicySearch === 'function') {
                                policyResults = await policySearchService.intelligentPolicySearch(questionWithImageContext);
                            } else if (typeof policySearchService.searchPolicies === 'function') {
                                policyResults = await policySearchService.searchPolicies(questionWithImageContext);
                            } else if (typeof policySearchService.search === 'function') {
                                policyResults = await policySearchService.search(questionWithImageContext);
                            } else {
                                console.warn('No compatible policy search method found, using fallback');
                                policyResults = await this.fallbackPolicySearch(questionWithImageContext);
                            }
                        } else {
                            // Use fallback policy search
                            console.log('Using fallback policy search');
                            policyResults = await this.fallbackPolicySearch(questionWithImageContext);
                        }
                        console.log(`Found ${policyResults.length} policy results`);
                    }
                } catch (error) {
                    console.warn('Policy search failed, using fallback:', error.message);
                    try {
                        const questionWithImageContext = imageDescriptions ?
                            `${question}\n${imageDescriptions}` : question;
                        const isPolicyQuestion = await this.isPolicyQuestion(questionWithImageContext, conversationHistory);
                        if (isPolicyQuestion) {
                            policyResults = await this.fallbackPolicySearch(questionWithImageContext);
                        }
                    } catch (fallbackError) {
                        console.error('Fallback policy search also failed:', fallbackError.message);
                        policyResults = [];
                    }
                }
            }

            // console.log("UserId: ", userId);
            // Step 4: Check if this is an order-related question and search orders (using image context)
            if (question && userId) {
                try {
                    const questionWithImageContext = imageDescriptions ?
                        `${question}\n${imageDescriptions}` : question;
                    const isOrderQuestion = await this.isOrderQuestion(questionWithImageContext, conversationHistory);
                    // console.log("IsOrderQuestion", isOrderQuestion);
                    if (isOrderQuestion) {
                        orderResults = await orderSearchService.searchOrders(questionWithImageContext, userId);
                        console.log(`Found ${orderResults.length} order results`);
                    }
                } catch (error) {
                    console.warn('Order search failed:', error.message);
                    orderResults = [];
                }
            }

            // Step 5: Combined multimodal search if we have both text and images
            if (reformulatedQuery && reformulatedQuery.trim() && imagesData && imagesData.length > 0) {
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

            // Step 6: Traditional text search using reformulated query enhanced with image descriptions
            if (reformulatedQuery && reformulatedQuery.trim()) {
                try {
                    // Enhance text search with image descriptions if available
                    const enhancedQuery = imageDescriptions ?
                        `${reformulatedQuery}. ${imageDescriptions}` : reformulatedQuery;
                    const textSearchResults = await embeddingService.searchMultimodal(enhancedQuery, imagesData, {
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

            // Step 7: Detect user purpose/profession and budget, generate targeted advice
            const purposeAndBudget = await this.detectPurposeAndBudget(question, conversationHistory, imageDescriptions);
            if (purposeAndBudget.hasPurpose || purposeAndBudget.hasBudget) {
                adviceContext = await this.generateAdvice(purposeAndBudget, uniqueResults);
                console.log(`Generated advice for: ${purposeAndBudget.profession || 'general'} with budget: ${purposeAndBudget.budget || 'not specified'}`);
            }

            // Build context from merged search results
            const context = this.buildContextMultimodal(uniqueResults, true);
            const policyContext = this.buildPolicyContext(policyResults);
            const orderContext = this.buildOrderContext(orderResults);

            // Build conversation history context (last 6 messages)
            const conversationContext = this.buildConversationContext(conversationHistory);

            // Get current time in Vietnamese format
            const currentTime = new Date();
            const vietnamTime = new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).format(currentTime);

            // console.log('Context:', context);

            const searchMethodInfo = clipSearchResults.length > 0 ?
                '\n[Hệ thống đã sử dụng AI CLIP để phân tích hình ảnh và tìm sản phẩm tương tự]' : '';

            const prompt = `
Bạn là một trợ lý bán hàng chuyên nghiệp của cửa hàng máy tính với khả năng hiểu cả văn bản và hình ảnh.

Thời gian hiện tại: ${vietnamTime}

${conversationContext}

Thông tin sản phẩm liên quan:
${context}
${policyContext}
${orderContext}
${adviceContext}
${imageDescriptions}
${searchMethodInfo}

Câu hỏi gốc của khách hàng: ${question || 'Khách hàng đã gửi hình ảnh để tìm sản phẩm tương tự'}
Truy vấn đã được tối ưu: ${reformulatedQuery}

Url gốc cúa sản phẩm:
baseUrl = ${process.env.CLIENT_BASE_URL || 'http://localhost:5173'}

${
                // Moved to file so prompt can be updated at runtime
                await fs.readFile("responseInstructions.md", "utf8").catch(() => 'Hãy trả lời một cách chuyên nghiệp và hữu ích.')
                }
            `;

            console.log("Prompt: ", prompt);

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Bạn là trợ lý bán hàng chuyên nghiệp với khả năng hiểu cả văn bản và hình ảnh thông qua AI CLIP. Chỉ sử dụng thông tin được cung cấp để trả lời..'
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
        } finally {
            const end = process.hrtime(stopwatch);
            console.log(`Execution time: ${end[0]}s ${end[1] / 1000000}ms`);
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

                // Add createdAt and updatedAt information
                if (metadata?.createdAt) {
                    const createdDate = new Date(metadata.createdAt * 1000); // Convert from Unix timestamp
                    const createdTime = new Intl.DateTimeFormat('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }).format(createdDate);
                    context += ` - Ngày thêm: ${createdTime}`;
                }

                if (metadata?.updatedAt && metadata.updatedAt !== metadata.createdAt) {
                    const updatedDate = new Date(metadata.updatedAt * 1000); // Convert from Unix timestamp
                    const updatedTime = new Intl.DateTimeFormat('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }).format(updatedDate);
                    context += ` - Cập nhật cuối: ${updatedTime}`;
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

    // Method to detect user purpose/profession and budget constraints
    async detectPurposeAndBudget(question, conversationHistory = [], imageDescriptions = '') {
        try {
            const fullContext = `${question}\n${imageDescriptions}\n${conversationHistory.slice(-5).map(msg => msg.content).join('\n')}`;

            // Keywords for different professions and use cases
            const professionKeywords = {
                doctor: ['bác sĩ', 'y tá', 'phòng khám', 'bệnh viện', 'chẩn đoán hình ảnh', 'x-ray', 'ct scan', 'mri', 'dicom', 'y khoa', 'medical'],
                designer: ['thiết kế', 'đồ họa', 'designer', 'photoshop', 'illustrator', 'render', '3d modeling', 'animation', 'video editing'],
                gamer: ['chơi game', 'gaming', 'stream', 'fps', 'moba', 'rpg', 'esports', 'livestream'],
                student: ['học sinh', 'sinh viên', 'học tập', 'làm bài', 'nghiên cứu', 'thesis', 'project'],
                office: ['văn phòng', 'office', 'excel', 'word', 'powerpoint', 'công việc', 'làm việc'],
                engineer: ['kỹ sư', 'lập trình', 'developer', 'coding', 'autocad', 'solidworks', 'matlab'],
                trader: ['đầu tư', 'chứng khoán', 'forex', 'crypto', 'trading', 'phân tích kỹ thuật']
            };

            // Budget detection patterns
            const budgetPatterns = [
                /(?:trong khoảng|ngân sách|budget|giá từ|từ)\s*([\d,\.]+)\s*(?:đến|-)\s*([\d,\.]+)/i,
                /(?:dưới|không quá|tối đa|max)\s*([\d,\.]+)/i,
                /(?:khoảng|xấp xỉ|around)\s*([\d,\.]+)/i,
                /([\d,\.]+)\s*(?:triệu|tr|million)/i
            ];

            let detectedProfession = null;
            let budgetRange = null;

            // Detect profession
            const lowerContext = fullContext.toLowerCase();
            for (const [profession, keywords] of Object.entries(professionKeywords)) {
                if (keywords.some(keyword => lowerContext.includes(keyword))) {
                    detectedProfession = profession;
                    break;
                }
            }

            // Detect budget
            for (const pattern of budgetPatterns) {
                const match = fullContext.match(pattern);
                if (match) {
                    if (match[2]) {
                        // Range detected
                        budgetRange = {
                            min: parseFloat(match[1].replace(/[,\.]/g, '')),
                            max: parseFloat(match[2].replace(/[,\.]/g, ''))
                        };
                    } else {
                        // Single value detected
                        const value = parseFloat(match[1].replace(/[,\.]/g, ''));
                        if (fullContext.toLowerCase().includes('triệu') || fullContext.toLowerCase().includes('tr')) {
                            budgetRange = { max: value * 1000000 };
                        } else {
                            budgetRange = { max: value };
                        }
                    }
                    break;
                }
            }

            return {
                hasPurpose: !!detectedProfession,
                hasBudget: !!budgetRange,
                profession: detectedProfession,
                budget: budgetRange
            };

        } catch (error) {
            console.error('Error detecting purpose and budget:', error);
            return { hasPurpose: false, hasBudget: false };
        }
    }

    // Method to generate targeted advice based on purpose and budget
    async generateAdvice(purposeAndBudget, searchResults) {
        try {
            const { profession, budget } = purposeAndBudget;

            let advicePrompt = '';
            let budgetFilteredResults = searchResults;

            // Filter results by budget if specified
            if (budget) {
                budgetFilteredResults = searchResults.filter(result => {
                    const price = result.metadata?.price || 0;
                    if (budget.min && budget.max) {
                        return price >= budget.min && price <= budget.max;
                    } else if (budget.max) {
                        return price <= budget.max;
                    }
                    return true;
                });
            }

            // Generate profession-specific advice
            const professionAdvice = {
                doctor: {
                    title: 'Tư vấn cho ngành Y tế',
                    requirements: [
                        'CPU mạnh mẽ cho xử lý hình ảnh y khoa (Intel i7/i9 hoặc AMD Ryzen 7/9)',
                        'RAM tối thiểu 32GB để xử lý file DICOM lớn',
                        'Card đồ họa chuyên nghiệp (RTX 4070 trở lên) cho hình ảnh 3D',
                        'Ổ cứng SSD NVMe tốc độ cao để truy xuất dữ liệu nhanh',
                        'Màn hình độ phân giải cao (4K) với độ chính xác màu sắc tốt',
                        'Hệ thống làm mát ổn định cho hoạt động liên tục 24/7'
                    ],
                    software: 'Tương thích với phần mềm y khoa: DICOM viewers, medical imaging software'
                },
                designer: {
                    title: 'Tư vấn cho Thiết kế Đồ họa',
                    requirements: [
                        'CPU đa nhân mạnh (Intel i7/i9, AMD Ryzen 7/9) cho render',
                        'RAM 32GB+ cho Photoshop, After Effects, 3D software',
                        'Card đồ họa cao cấp (RTX 4070 Ti/4080) cho GPU rendering',
                        'Ổ cứng SSD lớn cho lưu trữ project và asset',
                        'Màn hình IPS với color gamut rộng (sRGB 99%+)',
                        'Bàn vẽ Wacom hoặc display tablet cho workflow'
                    ],
                    software: 'Tối ưu cho Adobe Creative Suite, Blender, Cinema 4D, Maya'
                },
                gamer: {
                    title: 'Tư vấn cho Gaming',
                    requirements: [
                        'CPU gaming tối ưu (Intel i5-13600K/i7-13700K, AMD Ryzen 5 7600X/7700X)',
                        'RAM DDR4/DDR5 16-32GB tốc độ cao',
                        'Card đồ họa mạnh (RTX 4060 Ti/4070/4080) tùy độ phân giải',
                        'SSD NVMe Gen4 để giảm loading time',
                        'PSU 80+ Gold với công suất dư để nâng cấp',
                        'Tản nhiệt hiệu quả và case thông gió tốt'
                    ],
                    software: 'Hỗ trợ DirectX 12, Ray Tracing, DLSS 3.0 cho trải nghiệm tốt nhất'
                },
                student: {
                    title: 'Tư vấn cho Học tập',
                    requirements: [
                        'CPU tốt với giá hợp lý (Intel i5, AMD Ryzen 5)',
                        'RAM 16GB đủ cho đa nhiệm và học tập',
                        'SSD 512GB cho khởi động nhanh và lưu trữ',
                        'Card đồ họa tích hợp hoặc entry-level',
                        'Laptop nhẹ di động hoặc PC desktop tiết kiệm điện',
                        'Bảo hành tốt và hỗ trợ kỹ thuật'
                    ],
                    software: 'Tương thích với Office, học trực tuyến, nghiên cứu'
                },
                office: {
                    title: 'Tư vấn cho Văn phòng',
                    requirements: [
                        'CPU hiệu quả năng lượng (Intel i3/i5, AMD Ryzen 3/5)',
                        'RAM 8-16GB cho Office và browsing',
                        'SSD 256-512GB cho khởi động và ứng dụng nhanh',
                        'Card đồ họa tích hợp tiết kiệm điện',
                        'Case compact, ít tiếng ồn',
                        'Nhiều cổng USB và kết nối mạng ổn định'
                    ],
                    software: 'Tối ưu cho Microsoft Office, email, web browsing'
                },
                engineer: {
                    title: 'Tư vấn cho Kỹ thuật',
                    requirements: [
                        'CPU mạnh đa luồng (Intel i7/i9, AMD Ryzen 7/9)',
                        'RAM 32GB+ cho simulation và CAD',
                        'Card đồ họa workstation (RTX A-series) hoặc gaming cao cấp',
                        'SSD NVMe lớn cho project files',
                        'ECC RAM nếu cần độ chính xác cao',
                        'Hệ thống làm mát mạnh cho workload nặng'
                    ],
                    software: 'Tương thích AutoCAD, SolidWorks, MATLAB, engineering software'
                },
                trader: {
                    title: 'Tư vấn cho Trading',
                    requirements: [
                        'CPU nhanh cho phân tích realtime (Intel i5/i7)',
                        'RAM 16-32GB cho đa monitor và ứng dụng',
                        'SSD nhanh cho boot và ứng dụng trading',
                        'Card đồ họa hỗ trợ nhiều màn hình',
                        'Kết nối mạng ổn định và UPS backup',
                        'Setup đa màn hình cho theo dõi thị trường'
                    ],
                    software: 'Tối ưu cho trading platform, charting software, analysis tools'
                }
            };

            let adviceText = '';

            // Add profession-specific advice
            if (profession && professionAdvice[profession]) {
                const advice = professionAdvice[profession];
                adviceText += `\n\n📋 **${advice.title}**\n`;
                adviceText += `\n**Yêu cầu kỹ thuật quan trọng:**\n`;
                advice.requirements.forEach((req, index) => {
                    adviceText += `${index + 1}. ${req}\n`;
                });
                adviceText += `\n**Phần mềm:** ${advice.software}\n`;
            }

            // Add budget advice
            if (budget) {
                adviceText += `\n\n💰 **Tư vấn ngân sách**\n`;
                if (budget.min && budget.max) {
                    adviceText += `Ngân sách: ${budget.min.toLocaleString()} - ${budget.max.toLocaleString()} VND\n`;
                } else if (budget.max) {
                    adviceText += `Ngân sách tối đa: ${budget.max.toLocaleString()} VND\n`;
                }

                // Budget optimization advice
                if (budget.max <= 15000000) {
                    adviceText += `- Ưu tiên CPU và RAM, card đồ họa có thể nâng cấp sau\n`;
                    adviceText += `- Chọn mainboard có khả năng mở rộng tốt\n`;
                    adviceText += `- SSD 512GB + HDD để tiết kiệm chi phí\n`;
                } else if (budget.max <= 30000000) {
                    adviceText += `- Cân bằng tốt giữa CPU và GPU\n`;
                    adviceText += `- RAM 16-32GB tùy mục đích sử dụng\n`;
                    adviceText += `- SSD NVMe chính + SSD SATA phụ\n`;
                } else {
                    adviceText += `- Có thể đầu tư cấu hình cao cấp\n`;
                    adviceText += `- Ưu tiên linh kiện chất lượng cao và bền bỉ\n`;
                    adviceText += `- Đầu tư làm mát và nguồn chất lượng\n`;
                }

                // Show filtered results count
                adviceText += `\n**Sản phẩm phù hợp ngân sách:** ${budgetFilteredResults.length} sản phẩm\n`;
            }

            // Add general recommendations based on search results
            if (budgetFilteredResults.length > 0) {
                const avgPrice = budgetFilteredResults.reduce((sum, result) => {
                    return sum + (result.metadata?.price || 0);
                }, 0) / budgetFilteredResults.length;

                adviceText += `\n\n🎯 **Gợi ý dựa trên tìm kiếm:**\n`;
                adviceText += `- Giá trung bình sản phẩm tìm thấy: ${Math.round(avgPrice).toLocaleString()} VND\n`;

                // Component type distribution
                const componentTypes = {};
                budgetFilteredResults.forEach(result => {
                    const type = result.metadata?.componentType;
                    if (type) {
                        componentTypes[type] = (componentTypes[type] || 0) + 1;
                    }
                });

                if (Object.keys(componentTypes).length > 0) {
                    adviceText += `- Loại sản phẩm phổ biến: ${Object.entries(componentTypes)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3)
                        .map(([type, count]) => `${type} (${count})`)
                        .join(', ')}\n`;
                }
            }

            return adviceText || '';

        } catch (error) {
            console.error('Error generating advice:', error);
            return '';
        }
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

    // Method to build order context with support for multiple products per order
    buildOrderContext(orderResults) {
        if (!orderResults || orderResults.length === 0) {
            return '';
        }

        let context = '\n\nThông tin đơn hàng của khách hàng:\n';

        // Group orders by orderId to handle multiple products per order
        const groupedOrders = {};
        orderResults.forEach(order => {
            if (!groupedOrders[order.orderId]) {
                groupedOrders[order.orderId] = {
                    ...order,
                    products: []
                };
            }
            groupedOrders[order.orderId].products.push({
                productName: order.productName,
                quantity: order.quantity,
                price: order.price
            });
        });

        Object.values(groupedOrders).forEach((order, index) => {
            context += `${index + 1}. Đơn hàng #${order.orderId}\n`;

            // List all products in the order
            if (order.products && order.products.length > 0) {
                context += `   - Sản phẩm (${order.products.length} items):\n`;
                order.products.forEach((product, productIndex) => {
                    context += `     ${productIndex + 1}. ${product.productName} - SL: ${product.quantity}`;
                    if (product.price) {
                        context += ` - Giá: ${product.price?.toLocaleString()} VND`;
                    }
                    context += `\n`;
                });
            }

            context += `   - Tổng tiền: ${order.totalPrice?.toLocaleString()} VND\n`;
            context += `   - Trạng thái: ${order.status}\n`;
            context += `   - Phương thức thanh toán: ${order.paymentType}\n`;
            context += `   - Người nhận: ${order.fullName}\n`;
            context += `   - SĐT: ${order.phone}\n`;
            context += `   - Địa chỉ: ${order.address}\n`;

            if (order.createdAt) {
                const orderDate = new Date(order.createdAt);
                const createdTime = new Intl.DateTimeFormat('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(orderDate);
                context += `   - Ngày đặt: ${createdTime}\n`;
            }

            if (order.updatedAt && order.updatedAt !== order.createdAt) {
                const updateDate = new Date(order.updatedAt);
                const updatedTime = new Intl.DateTimeFormat('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(updateDate);
                context += `   - Cập nhật cuối: ${updatedTime}\n`;
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
