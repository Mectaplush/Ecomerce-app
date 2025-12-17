const productPreview = require('../models/productPreview');
const { pipeline } = require('@xenova/transformers');
const fs = require('fs');
const path = require('path');

const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

// Initialize the model pipeline (cache it to avoid reloading)
let classificationPipeline = null;

// Initialize the classification model
async function initializeModel() {
    if (!classificationPipeline) {
        try {
            // Use a multilingual sentiment analysis model that supports Vietnamese
            classificationPipeline = await pipeline(
                'text-classification',
                'Xenova/multilingual-sentiment-analysis'
            );
        } catch (error) {
            console.error('Error initializing multilingual sentiment model:', error);
            try {
                // Second fallback: Use DistilBERT for sentiment analysis
                classificationPipeline = await pipeline(
                    'text-classification',
                    'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
                );
                console.log('Using DistilBERT sentiment model as fallback');
            } catch (fallbackError) {
                console.error('Error initializing fallback model:', fallbackError);
                // If all models fail, we'll use rule-based only
                classificationPipeline = null;
            }
        }
    }
    return classificationPipeline;
}

// Log rejected reviews
function logRejectedReview(userId, text, score, label) {
    const logDir = path.join(__dirname, '../../logs');
    const logFile = path.join(logDir, 'rejected-reviews.log');

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logEntry = {
        timestamp: new Date().toISOString(),
        userId,
        text: text.substring(0, 200), // Limit text length in log
        score,
        label,
        action: 'REJECTED'
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
        fs.appendFileSync(logFile, logLine);
        console.log(`Rejected review logged for user ${userId}: ${label} (score: ${score})`);
    } catch (error) {
        console.error('Error writing to log file:', error);
    }
}

// ML-based censorship function
async function checkInappropriateContent(text, userId = null) {
    if (!text || text.trim().length === 0) return { isInappropriate: false, reason: null };

    try {
        const model = await initializeModel();

        // If no model is available, use enhanced rule-based checking
        if (!model) {
            console.log('No ML model available, using enhanced rule-based checking');
            const enhancedInappropriate = enhancedContentCheck(text);
            if (enhancedInappropriate.isInappropriate && userId) {
                logRejectedReview(userId, text, enhancedInappropriate.score, enhancedInappropriate.label);
            }
            return enhancedInappropriate;
        }

        // Get classification result
        const result = await model(text);

        // Extract the classification with highest score
        const topPrediction = result[0];
        const { label, score } = topPrediction;

        // For sentiment models, map labels appropriately
        let isInappropriate = false;
        let mappedLabel = label.toUpperCase();

        // Handle different model outputs
        if (mappedLabel === 'NEGATIVE' && score > 0.8) {
            isInappropriate = true;
        } else if (['TOXIC', 'INAPPROPRIATE', 'SPAM', 'HATE'].includes(mappedLabel) && score > 0.7) {
            isInappropriate = true;
        }

        // If ML doesn't detect issues but score is borderline, also check with enhanced rules
        if (!isInappropriate || score < 0.9) {
            const enhancedCheck = enhancedContentCheck(text);
            if (enhancedCheck.isInappropriate) {
                isInappropriate = true;
                mappedLabel = enhancedCheck.label;
            }
        }

        if (isInappropriate && userId) {
            // Log the rejected review
            logRejectedReview(userId, text, score, mappedLabel);
        }

        return {
            isInappropriate,
            reason: isInappropriate ? `Nội dung được phân loại là ${mappedLabel} với độ tin cậy ${(score * 100).toFixed(1)}%` : null,
            score,
            label: mappedLabel
        };

    } catch (error) {
        console.error('Error in ML content checking:', error);

        // Fallback to enhanced rule-based checking if ML fails
        const enhancedInappropriate = enhancedContentCheck(text);
        if (enhancedInappropriate.isInappropriate && userId) {
            logRejectedReview(userId, text, enhancedInappropriate.score, 'FALLBACK_ENHANCED_RULES');
        }

        return {
            isInappropriate: enhancedInappropriate.isInappropriate,
            reason: enhancedInappropriate.isInappropriate ? 'Nội dung chứa từ ngữ không phù hợp (kiểm tra nâng cao)' : null,
            score: enhancedInappropriate.score,
            label: enhancedInappropriate.isInappropriate ? 'FALLBACK_ENHANCED_RULES' : 'CLEAN'
        };
    }
}

// Enhanced content checking with Vietnamese support
function enhancedContentCheck(text) {
    if (!text) return { isInappropriate: false, score: 0, label: 'CLEAN' };

    const lowerText = text.toLowerCase();
    let score = 0;
    let detectedCategory = 'CLEAN';

    // Vietnamese and English profanity
    const profanityWords = [
        'đm', 'dm', 'đmm', 'dmm', 'đụ', 'địt', 'lồn', 'cặc', 'buồi', 'chó đẻ', 'súc vật', 'thằng khốn',
        'con đĩ', 'đĩ', 'điếm', 'khốn nạn', 'khốn kiếp', 'đồ chó', 'đồ khốn', 'mẹ mày', 'fuck', 'shit', 'bitch', 'asshole'
    ];

    // Spam/promotional patterns
    const spamPatterns = [
        /(?:mua\s+ngay|khuyến\s+mãi|giảm\s+giá)/i,
        /(?:liên\s+hệ|zalo|facebook|telegram)/i,
        /(?:www\.|https?:\/\/|\.com|\.vn)/i,
        /(?:sdt|số\s+điện\s+thoại|hotline|inbox)/i,
        /(?:0[0-9]{8,9}|\+84[0-9]{8,9})/i // Phone numbers
    ];

    // Fake review patterns
    const fakeReviewWords = [
        'fake', 'giả mạo', 'lừa đảo', 'scam', 'không nên mua', 'đừng mua', 'tránh xa',
        'shop lừa đảo', 'hàng giả', 'hàng nhái', 'kém chất lượng cực kỳ'
    ];

    // Check profanity
    for (const word of profanityWords) {
        if (lowerText.includes(word)) {
            score = Math.max(score, 0.9);
            detectedCategory = 'TOXIC';
            break;
        }
    }

    // Check spam patterns
    for (const pattern of spamPatterns) {
        if (pattern.test(text)) {
            score = Math.max(score, 0.8);
            detectedCategory = 'SPAM';
            break;
        }
    }

    // Check fake reviews
    for (const word of fakeReviewWords) {
        if (lowerText.includes(word)) {
            score = Math.max(score, 0.85);
            detectedCategory = 'INAPPROPRIATE';
            break;
        }
    }

    // Check for excessive capitalization (potential spam)
    const upperCaseCount = (text.match(/[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g) || []).length;
    if (upperCaseCount > text.length * 0.7 && text.length > 10) {
        score = Math.max(score, 0.75);
        detectedCategory = 'SPAM';
    }

    // Check for excessive repetition
    const words = lowerText.split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size < words.length * 0.3) {
        score = Math.max(score, 0.7);
        detectedCategory = 'SPAM';
    }

    // Check for excessive punctuation
    const excessivePunctuation = /[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]{5,}/;
    if (excessivePunctuation.test(text)) {
        score = Math.max(score, 0.6);
        detectedCategory = 'SPAM';
    }

    return {
        isInappropriate: score >= 0.6, // Lower threshold for rule-based
        score,
        label: detectedCategory
    };
}

// Keep basic function for backwards compatibility
function basicContentCheck(text) {
    const enhanced = enhancedContentCheck(text);
    return enhanced.isInappropriate;
}

class ProductPreviewController {

    async createProductPreview(req, res) {
        const { productId, rating, content } = req.body;
        if (!productId || !rating || !content) {
            throw new BadRequestError('Vui lòng nhập đầy đủ thông tin');
        }

        // Check for inappropriate content using ML model
        const { id: userId } = req.user;
        const contentCheck = await checkInappropriateContent(content, userId);
        if (contentCheck.isInappropriate) {
            throw new BadRequestError(contentCheck.reason || 'Nội dung đánh giá chứa từ ngữ không phù hợp hoặc vi phạm quy định. Vui lòng chỉnh sửa và thử lại.');
        }

        // Validate content length
        if (content.length < 10) {
            throw new BadRequestError('Nội dung đánh giá quá ngắn. Vui lòng viết ít nhất 10 ký tự.');
        }

        if (content.length > 1000) {
            throw new BadRequestError('Nội dung đánh giá quá dài. Vui lòng giới hạn trong 1000 ký tự.');
        }

        // Validate rating (expecting 1-10 from UI conversion)
        if (rating < 1 || rating > 10) {
            throw new BadRequestError('Đánh giá phải từ 0.5 đến 5 sao.');
        }

        const dataProductPreview = await productPreview.create({ productId, rating, content, userId });
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

        // Check for inappropriate content using ML model
        const contentCheck = await checkInappropriateContent(content, userId);
        if (contentCheck.isInappropriate) {
            throw new BadRequestError(contentCheck.reason || 'Nội dung đánh giá chứa từ ngữ không phù hợp hoặc vi phạm quy định. Vui lòng chỉnh sửa và thử lại.');
        }

        // Validate content length
        if (content.length < 10) {
            throw new BadRequestError('Nội dung đánh giá quá ngắn. Vui lòng viết ít nhất 10 ký tự.');
        }

        if (content.length > 1000) {
            throw new BadRequestError('Nội dung đánh giá quá dài. Vui lòng giới hạn trong 1000 ký tự.');
        }

        // Validate rating
        if (rating < 1 || rating > 10) {
            throw new BadRequestError('Đánh giá phải từ 0.5 đến 5 sao.');
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
