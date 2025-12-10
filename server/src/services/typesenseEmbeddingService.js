// services/typesenseEmbeddingService.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { typesenseClient } = require('../config/typesense.js');
const { AutoTokenizer, AutoProcessor,
    CLIPTextModelWithProjection,
    CLIPVisionModelWithProjection,
    RawImage } = require('@xenova/transformers');

async function base64ToRawImage(base64) {
    // Remove data URL prefix if present (e.g. "data:image/png;base64,")
    const commaIndex = base64.indexOf(',');
    if (commaIndex !== -1) {
        base64 = base64.slice(commaIndex + 1);
    }
    const buffer = Buffer.from(base64, 'base64');
    const blob = new Blob([buffer]);
    return await RawImage.fromBlob(blob);
}

class TypesenseEmbeddingService {
    constructor() {
        this.api_key = process.env.OPEN_API_KEY;
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPEN_API_KEY,
            modelName: "text-embedding-3-small",
        });

        this.tokenizerTask = AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
        this.textModelTask = CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32');
        this.processorTask = AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
        this.visionModelTask = CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32');

        this.client = typesenseClient;
        this.embeddingsCollection = 'product_embeddings';
        this.productsCollection = 'products';
    }

    /**
     * Create CLIP embedding for text - ensure flat array output
     * @param {string} text 
     * @returns {Promise<number[]>} CLIP embedding vector
     */
    async embedTextWithCLIP(text) {
        try {
            const tokenizer = await this.tokenizerTask;
            const textModel = await this.textModelTask;

            const textInputs = await tokenizer(text, { padding: true, truncation: true });
            const { text_embeds } = await textModel(textInputs);

            // Ensure we return a flat array of numbers
            let embedding;
            if (text_embeds.data) {
                embedding = Array.from(text_embeds.data);
            } else if (Array.isArray(text_embeds)) {
                embedding = text_embeds.flat();
            } else if (text_embeds.tolist) {
                embedding = text_embeds.tolist().flat();
            } else {
                embedding = Array.from(text_embeds).flat();
            }

            console.log(`Text embedding shape: [${embedding.length}]`, typeof embedding[0]);
            return embedding;
        } catch (error) {
            console.error('CLIP text embedding error:', error);
            throw error;
        }
    }

    /**
     * Create CLIP embedding for image - ensure flat array output
     * @param {string|Buffer} imageData - Image URL or buffer
     * @returns {Promise<number[]>} CLIP embedding vector
     */
    async embedImageWithCLIP(imageData) {
        try {
            if (typeof imageData === 'string' && (imageData.startsWith('http://') || imageData.startsWith('https://'))) {
                const response = await fetch(imageData);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }
                const buffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);
                const mimeType = this.detectImageMimeType(uint8Array);
                const base64 = Buffer.from(buffer).toString('base64');
                imageData = `data:${mimeType};base64,${base64}`;
            }

            const processor = await this.processorTask;
            const visionModel = await this.visionModelTask;

            const rawImage = await base64ToRawImage(imageData);
            const imageInputs = await processor(rawImage);
            const { image_embeds } = await visionModel(imageInputs);

            // Ensure we return a flat array of numbers
            let embedding;
            if (image_embeds.data) {
                embedding = Array.from(image_embeds.data);
            } else if (Array.isArray(image_embeds)) {
                embedding = image_embeds.flat();
            } else if (image_embeds.tolist) {
                embedding = image_embeds.tolist().flat();
            } else {
                embedding = Array.from(image_embeds).flat();
            }

            console.log(`Image embedding shape: [${embedding.length}]`, typeof embedding[0]);
            return embedding;
        } catch (error) {
            console.error('CLIP image embedding error:', error);
            throw error;
        }
    }

    /**
     * Create multimodal product embedding using CLIP
     * @param {string} text - Text data
     * @param {string[]} imagesData - Array of image data (base64 or URLs)
     * @returns {Promise<{
     *  textEmbedding: number[],
     *  imagesEmbeddings: number[][]
     * }>} Embeddings vector
     */
    async embedTextAndImagesWithCLIP(text, imagesData) {
        try {
            const textEmbedding = await this.embedTextWithCLIP(text);
            const imagesEmbeddings = [];

            // Create image embeddings with CLIP if images exist
            if (imagesData && imagesData.length > 0) {
                for (const imageUrl of imagesData.slice(0, 3)) { // Limit to 3 images
                    try {
                        const imageEmbedding = await this.embedImageWithCLIP(imageUrl);
                        imagesEmbeddings.push(imageEmbedding);
                    } catch (error) {
                        console.warn(`Failed to embed image ${imageUrl}:`, error);
                    }
                }
            }

            return {
                textEmbedding: textEmbedding,
                imagesEmbeddings: imagesEmbeddings
            };
        } catch (error) {
            console.error('CLIP product embedding error:', error);
            throw error;
        }
    }

    /**
     * Create multimodal product embedding using CLIP and store in Typesense
     * @param {Object} product - Product data
     * @returns {Promise<string[]>} Array of embedding record IDs
     */
    async embedProductWithCLIP(product) {
        try {
            const recordIds = [];
            const embeddings = [];
            const weights = [];

            // 1. Create text embedding with CLIP
            const productText = `${product.name} ${product.description} ${product.componentType}`;

            const productEmbeddings = await this.embedTextAndImagesWithCLIP(
                productText,
                product.images ? product.images.split(',').map(url => url.trim()) : []
            );

            // Validation: Ensure textEmbedding is a flat array
            const textEmbedding = Array.isArray(productEmbeddings.textEmbedding)
                ? productEmbeddings.textEmbedding.flat()
                : Array.from(productEmbeddings.textEmbedding);

            // 2. Store text embedding as separate record in Typesense
            const textRecord = {
                id: `${product.id}_clip_text`,
                productId: String(product.id), // UUID as string
                name: product.name || '',
                description: product.description || '',
                price: parseFloat(product.price) || 0,
                componentType: product.componentType || '',
                categoryId: String(product.categoryId || ''),
                embeddingType: 'text',
                embeddingMethod: 'clip',
                embedding: textEmbedding, // Guaranteed flat array
                searchableText: productText,
                timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
            };

            console.log(`Text embedding validation: length=${textEmbedding.length}, first value type=${typeof textEmbedding[0]}`);

            await this.client.collections(this.embeddingsCollection).documents().create(textRecord);
            recordIds.push(textRecord.id);
            embeddings.push(textEmbedding);
            weights.push(0.6);

            // 3. Store each image embedding as separate record in Typesense
            if (productEmbeddings.imagesEmbeddings && productEmbeddings.imagesEmbeddings.length > 0) {
                const imageWeight = 0.4 / productEmbeddings.imagesEmbeddings.length;

                for (let i = 0; i < productEmbeddings.imagesEmbeddings.length; i++) {
                    // Validation: Ensure imageEmbedding is a flat array
                    const imageEmbedding = Array.isArray(productEmbeddings.imagesEmbeddings[i])
                        ? productEmbeddings.imagesEmbeddings[i].flat()
                        : Array.from(productEmbeddings.imagesEmbeddings[i]);

                    const imageRecord = {
                        id: `${product.id}_clip_image_${i}`,
                        productId: String(product.id), // UUID as string
                        name: product.name || '',
                        description: product.description || '',
                        price: parseFloat(product.price) || 0,
                        componentType: product.componentType || '',
                        categoryId: String(product.categoryId || ''),
                        embeddingType: 'image',
                        embeddingMethod: 'clip',
                        imageIndex: i,
                        embedding: imageEmbedding, // Guaranteed flat array
                        searchableText: `${product.name} image ${i}`,
                        timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
                    };

                    console.log(`Image ${i} embedding validation: length=${imageEmbedding.length}, first value type=${typeof imageEmbedding[0]}`);

                    await this.client.collections(this.embeddingsCollection).documents().create(imageRecord);
                    recordIds.push(imageRecord.id);
                    embeddings.push(imageEmbedding);
                    weights.push(imageWeight);
                }
            }

            // 4. Create and store combined embedding as separate record in Typesense
            const combinedEmbedding = this.weightedAverageEmbeddings(embeddings, weights);

            // Validation: Ensure combinedEmbedding is a flat array
            const validatedCombinedEmbedding = Array.isArray(combinedEmbedding)
                ? combinedEmbedding.flat()
                : Array.from(combinedEmbedding);

            const combinedRecord = {
                id: `${product.id}_clip_combined`,
                productId: String(product.id), // UUID as string
                name: product.name || '',
                description: product.description || '',
                price: parseFloat(product.price) || 0,
                componentType: product.componentType || '',
                categoryId: String(product.categoryId || ''),
                embeddingType: 'combined',
                embeddingMethod: 'clip',
                hasImages: !!product.images,
                imageCount: product.images ? product.images.split(',').length : 0,
                embedding: validatedCombinedEmbedding, // Guaranteed flat array
                searchableText: productText,
                timestamp: Math.floor(Date.now() / 1000) // Unix timestamp
            };

            console.log(`Combined embedding validation: length=${validatedCombinedEmbedding.length}, first value type=${typeof validatedCombinedEmbedding[0]}`);

            await this.client.collections(this.embeddingsCollection).documents().create(combinedRecord);
            recordIds.push(combinedRecord.id);

            console.log(`✅ Created ${recordIds.length} embedding records for product ${product.id}`);
            return recordIds;

        } catch (error) {
            console.error('CLIP product embedding error:', error);
            throw error;
        }
    }

    /**
     * Calculate weighted average of multiple embeddings
     * @param {number[][]} embeddings - Array of embedding vectors
     * @param {number[]} weights - Corresponding weights
     * @returns {number[]} Combined embedding vector
     */
    weightedAverageEmbeddings(embeddings, weights) {
        if (!embeddings || embeddings.length === 0) {
            throw new Error('No embeddings provided');
        }

        const dimensions = embeddings[0].length;
        const result = new Array(dimensions).fill(0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        for (let i = 0; i < embeddings.length; i++) {
            const weight = weights[i] / totalWeight;
            const embedding = Array.isArray(embeddings[i]) ? embeddings[i] : Array.from(embeddings[i]);

            for (let j = 0; j < dimensions; j++) {
                result[j] += embedding[j] * weight;
            }
        }

        return result;
    }

    /**
     * Multimodal search using CLIP embeddings in Typesense
     * @param {string} query - Text query
     * @param {string[]} [imagesData] - Optional image for visual search
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async searchMultimodal(query, imagesData = [], options = {}) {
        try {
            const {
                topK = 10,
                threshold = 0.7,
            } = options;

            // Get query embeddings
            const queryEmbeddingData = await this.embedTextAndImagesWithCLIP(query, imagesData);

            // Create combined query embedding using same weighting as products
            const queryEmbeddings = [queryEmbeddingData.textEmbedding];
            const queryWeights = [0.6];

            if (queryEmbeddingData.imagesEmbeddings && queryEmbeddingData.imagesEmbeddings.length > 0) {
                const imageWeight = 0.4 / queryEmbeddingData.imagesEmbeddings.length;
                queryEmbeddings.push(...queryEmbeddingData.imagesEmbeddings);
                queryWeights.push(...Array(queryEmbeddingData.imagesEmbeddings.length).fill(imageWeight));
            }

            const queryEmbedding = this.weightedAverageEmbeddings(queryEmbeddings, queryWeights);

            // Validation: Ensure queryEmbedding is a flat array
            const validatedQueryEmbedding = Array.isArray(queryEmbedding)
                ? queryEmbedding.flat()
                : Array.from(queryEmbedding);

            console.log(`Query embedding validation: length=${validatedQueryEmbedding.length}, first value type=${typeof validatedQueryEmbedding[0]}`);

            // Use text-based search with semantic context from embeddings
            // Vector search will be implemented later when Typesense vector support is properly configured
            const hybridResults = await this.client.collections(this.embeddingsCollection)
                .documents()
                .search({
                    q: query || '*',
                    query_by: 'searchableText,name,description,componentType',
                    filter_by: 'embeddingType:combined && embeddingMethod:clip',
                    per_page: topK,
                    sort_by: '_text_match:desc'
                });

            // Convert Typesense results to our format
            const results = hybridResults.hits?.map(hit => ({
                productId: hit.document.productId,
                name: hit.document.name,
                description: hit.document.description,
                price: hit.document.price,
                componentType: hit.document.componentType,
                categoryId: hit.document.categoryId,
                hasImages: hit.document.hasImages,
                imageCount: hit.document.imageCount,
                embeddingMethod: hit.document.embeddingMethod,
                score: hit.text_match / 100, // Convert to 0-1 scale
                metadata: hit.document
            })) || [];

            return this.deduplicateProductResults(results);

        } catch (error) {
            console.error('Multimodal search error:', error);
            throw error;
        }
    }

    /**
     * Hybrid search combining text search and vector similarity
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async hybridSearch(query, options = {}) {
        try {
            const { topK = 10, filters = {} } = options;

            // Text search in Typesense
            const searchParams = {
                q: query,
                query_by: 'name,description,componentType,searchableText',
                filter_by: Object.entries(filters)
                    .map(([key, value]) => `${key}:${value}`)
                    .join(' && '),
                per_page: topK,
                sort_by: '_text_match:desc'
            };

            // Remove empty filter_by
            if (!searchParams.filter_by) {
                delete searchParams.filter_by;
            }

            const searchResults = await this.client.collections(this.embeddingsCollection)
                .documents()
                .search(searchParams);

            // Also search in products collection for additional context
            const productSearchResults = await this.client.collections(this.productsCollection)
                .documents()
                .search({
                    q: query,
                    query_by: 'name,description,componentType,cpu,gpu,ram,storage',
                    per_page: topK,
                    sort_by: '_text_match:desc'
                });

            // Combine results
            const embeddingResults = searchResults.hits?.map(hit => ({
                productId: hit.document.productId,
                name: hit.document.name,
                description: hit.document.description,
                price: hit.document.price,
                componentType: hit.document.componentType,
                score: hit.text_match / 100,
                searchMethod: 'embedding_text',
                metadata: hit.document
            })) || [];

            const productResults = productSearchResults.hits?.map(hit => ({
                productId: hit.document.id,
                name: hit.document.name,
                description: hit.document.description,
                price: hit.document.price,
                componentType: hit.document.componentType,
                score: hit.text_match / 100,
                searchMethod: 'product_text',
                metadata: hit.document
            })) || [];

            // Merge and deduplicate
            const allResults = [...embeddingResults, ...productResults];
            return this.deduplicateProductResults(allResults).slice(0, topK);

        } catch (error) {
            console.error('Hybrid search error:', error);
            return [];
        }
    }

    /**
     * Store product in products collection
     * @param {Object} product - Product data
     * @returns {Promise<string>} Document ID
     */
    async storeProduct(product) {
        try {
            const document = {
                id: String(product.id), // UUID as string
                name: product.name || '',
                description: product.description || '',
                price: parseFloat(product.price) || 0,
                componentType: product.componentType || '',
                categoryId: String(product.categoryId || ''), // UUID as string
                images: product.images || '',
                cpu: product.cpu || '',
                gpu: product.gpu || '',
                ram: product.ram || '',
                storage: product.storage || '',
                mainboard: product.mainboard || '',
                powerSupply: product.powerSupply || '',
                case: product.case || '',
                cooler: product.cooler || '',
                tags: product.tags || [],
                createdAt: product.createdAt ? Math.floor(new Date(product.createdAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
                updatedAt: product.updatedAt ? Math.floor(new Date(product.updatedAt).getTime() / 1000) : Math.floor(Date.now() / 1000)
            };

            await this.client.collections(this.productsCollection).documents().upsert(document);
            console.log(`✅ Stored product ${product.id} in Typesense`);
            return document.id.toString();

        } catch (error) {
            console.error('Error storing product:', error);
            throw error;
        }
    }

    /**
     * Clean up all embeddings for a product
     * @param {number} productId - Product ID
     * @returns {Promise<void>}
     */
    async deleteProductEmbeddings(productId) {
        try {
            const deletePromises = [];

            // Delete text embedding
            deletePromises.push(
                this.client.collections(this.embeddingsCollection)
                    .documents(`${productId}_clip_text`)
                    .delete()
                    .catch(() => null)
            );

            // Delete combined embedding
            deletePromises.push(
                this.client.collections(this.embeddingsCollection)
                    .documents(`${productId}_clip_combined`)
                    .delete()
                    .catch(() => null)
            );

            // Delete potential image embeddings (up to 10 images)
            for (let i = 0; i < 10; i++) {
                deletePromises.push(
                    this.client.collections(this.embeddingsCollection)
                        .documents(`${productId}_clip_image_${i}`)
                        .delete()
                        .catch(() => null)
                );
            }

            await Promise.all(deletePromises);
            console.log(`Cleaned up embeddings for product ${productId}`);
        } catch (error) {
            console.error(`Error cleaning up embeddings for product ${productId}:`, error);
        }
    }

    /**
     * Deduplicate search results to avoid multiple chunks from same product
     * @param {Array} results - Search results
     * @returns {Array} Deduplicated results
     */
    deduplicateProductResults(results) {
        const seenProducts = new Set();
        const uniqueResults = [];

        for (const result of results) {
            const productId = result.productId;

            if (productId && !seenProducts.has(productId)) {
                seenProducts.add(productId);
                uniqueResults.push({
                    id: result.id,
                    score: result.score,
                    productId: productId,
                    name: result.name,
                    price: result.price,
                    componentType: result.componentType,
                    hasImages: result.hasImages,
                    embeddingMethod: result.embeddingMethod,
                    searchMethod: result.searchMethod,
                    metadata: result.metadata
                });
            }
        }

        return uniqueResults.sort((a, b) => b.score - a.score);
    }

    // Helper method to detect image MIME type from buffer
    detectImageMimeType(buffer) {
        const signatures = {
            'image/jpeg': [0xFF, 0xD8, 0xFF],
            'image/png': [0x89, 0x50, 0x4E, 0x47],
            'image/gif': [0x47, 0x49, 0x46],
            'image/webp': [0x52, 0x49, 0x46, 0x46]
        };

        for (const [mimeType, signature] of Object.entries(signatures)) {
            if (signature.every((byte, index) => buffer[index] === byte)) {
                return mimeType;
            }
        }
        return 'image/jpeg'; // Default fallback
    }
}

module.exports = new TypesenseEmbeddingService();
