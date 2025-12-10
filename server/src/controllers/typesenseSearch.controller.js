// server/src/controllers/typesenseSearch.controller.js
const typesenseEmbeddingService = require('../services/typesenseEmbeddingService');
const modelProducts = require('../models/products.model');

/**
 * Hybrid search controller using Typesense
 */
const hybridSearch = async (req, res) => {
    try {
        const { 
            query, 
            topK = 10,
            searchType = 'hybrid', // 'text', 'multimodal', 'hybrid'
            includeImages = false
        } = req.query;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        let results = [];

        switch (searchType) {
            case 'text':
                results = await typesenseEmbeddingService.hybridSearch(query, { 
                    topK: parseInt(topK) 
                });
                break;

            case 'multimodal':
                results = await typesenseEmbeddingService.searchMultimodal(query, [], { 
                    topK: parseInt(topK) 
                });
                break;

            case 'hybrid':
            default:
                // Use both text and multimodal search
                const [textResults, multimodalResults] = await Promise.all([
                    typesenseEmbeddingService.hybridSearch(query, { topK: parseInt(topK) }),
                    typesenseEmbeddingService.searchMultimodal(query, [], { topK: parseInt(topK) })
                ]);

                // Combine and deduplicate results
                const combinedResults = [...textResults, ...multimodalResults];
                results = typesenseEmbeddingService.deduplicateProductResults(combinedResults)
                    .slice(0, parseInt(topK));
                break;
        }

        res.json({
            success: true,
            results,
            totalResults: results.length,
            searchType,
            query: query.trim()
        });

    } catch (error) {
        console.error('Hybrid search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
};

/**
 * Get similar products using Typesense
 */
const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const { topK = 5 } = req.query;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        // First get the product details
        const product = await modelProducts.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Use the product name and description for similarity search
        const searchQuery = `${product.name} ${product.description} ${product.componentType}`;
        const similarProducts = await typesenseEmbeddingService.searchMultimodal(
            searchQuery, 
            [], 
            { topK: parseInt(topK) + 1 } // +1 to exclude the original product
        );

        // Filter out the original product (compare as strings since UUIDs are strings)
        const filteredResults = similarProducts
            .filter(result => String(result.productId) !== String(productId))
            .slice(0, parseInt(topK));

        res.json({
            success: true,
            results: filteredResults,
            totalResults: filteredResults.length,
            originalProduct: {
                id: product.id,
                name: product.name,
                componentType: product.componentType
            }
        });

    } catch (error) {
        console.error('Similar products error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get similar products',
            error: error.message
        });
    }
};

/**
 * Search products with image input
 */
const searchWithImage = async (req, res) => {
    try {
        const { query = '', topK = 10 } = req.body;
        const imageFile = req.file;

        if (!imageFile) {
            return res.status(400).json({
                success: false,
                message: 'Image file is required'
            });
        }

        // Convert uploaded image to base64
        const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

        // Perform multimodal search with image
        const results = await typesenseEmbeddingService.searchMultimodal(
            query,
            [imageBase64],
            { topK: parseInt(topK) }
        );

        res.json({
            success: true,
            results,
            totalResults: results.length,
            searchType: 'multimodal_with_image',
            query,
            hasImage: true
        });

    } catch (error) {
        console.error('Image search error:', error);
        res.status(500).json({
            success: false,
            message: 'Image search failed',
            error: error.message
        });
    }
};

module.exports = {
    hybridSearch,
    getSimilarProducts,
    searchWithImage
};