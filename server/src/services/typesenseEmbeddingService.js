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
        this.api_key = process.env.OPENAI_API_KEY;
        this.embeddings = new OpenAIEmbeddings({
            apiKey: process.env.OPENAI_API_KEY,
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
     * Embeds a product using CLIP (Contrastive Language-Image Pre-training) model.
     * Creates separate embedding records for text, images, and a combined weighted average.
     * 
     * @async
     * @function embedProductWithCLIP
     * @param {Object} product - The product object to embed
     * @param {string|number} product.id - Unique product identifier (UUID)
     * @param {string} [product.name=''] - Product name
     * @param {string} [product.description=''] - Product description
     * @param {string} [product.componentType=''] - Type of component/product category
     * @param {string|number} [product.price=0] - Product price
     * @param {string} [product.categoryId=''] - Category identifier
     * @param {string} [product.images] - Comma-separated list of image URLs
     * @returns {Promise<string[]>} Array of created record IDs in Typesense
     * @throws {Error} Throws error if embedding generation or Typesense operations fail
     * 
     * @description
     * This method performs the following operations:
     * 1. Generates text embedding from product name, description, and component type
     * 2. Generates image embeddings for each product image (if any)
     * 3. Creates separate Typesense records for text embedding (weight: 0.6)
     * 4. Creates separate Typesense records for each image embedding (weight: 0.4/image_count)
     * 5. Creates a combined embedding record using weighted average of all embeddings
     * 
     * Each record includes product metadata, embedding type, method, and searchable text.
     * All embeddings are validated to ensure they are flat arrays before storage.
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
     * Performs multimodal search combining text and image queries using CLIP embeddings
     * @param {string} query - The text query to search for
     * @param {Array} [imagesData=[]] - Array of image data to include in the search
     * @param {Object} [options={}] - Search configuration options
     * @param {number} [options.topK=10] - Maximum number of results to return
     * @param {number} [options.threshold=0.7] - Similarity threshold for filtering results
     * @returns {Promise<Array>} Array of search results with product information and similarity scores
     * @throws {Error} When search operation fails or embeddings cannot be generated
     * @description This method creates weighted embeddings from text (60%) and images (40% total),
     * performs hybrid search using Typesense text matching with semantic context,
     * and returns deduplicated results sorted by relevance score
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

            // Use multi-search for better performance with larger payloads
            console.log('Performing multi-search with vector and text queries...');

            const multiSearchQueries = {
                searches: [
                    {
                        collection: this.embeddingsCollection,
                        q: '*',
                        vector_query: `embedding:([${validatedQueryEmbedding.join(',')}], k:${topK})`,
                        filter_by: 'embeddingType:combined && embeddingMethod:clip',
                        per_page: topK
                    },
                    {
                        collection: this.embeddingsCollection,
                        q: query || '*',
                        query_by: 'searchableText,name,description,componentType',
                        filter_by: 'embeddingType:combined && embeddingMethod:clip',
                        per_page: topK,
                        sort_by: '_text_match:desc'
                    }
                ]
            };

            const multiSearchResults = await this.client.multiSearch.perform(multiSearchQueries);
            const vectorResults = multiSearchResults.results[0];
            const textResults = multiSearchResults.results[1];

            // console.log("Query:", query);
            // console.log("Multimodal search result", multiSearchResults);

            // Combine vector and text results with weighted scoring
            const combinedResults = new Map();

            // Add vector search results (70% weight)
            vectorResults.hits?.forEach(hit => {
                const productId = hit.document.productId;
                combinedResults.set(productId, {
                    ...hit.document,
                    vectorScore: 1 - (hit.vector_distance || 0), // Convert distance to similarity
                    textScore: 0,
                    combinedScore: (1 - (hit.vector_distance || 0)) * 0.7
                });
            });

            // Add text search results (30% weight)
            textResults.hits?.forEach(hit => {
                const productId = hit.document.productId;
                const textScore = (hit.text_match || 0) / 100; // Convert to 0-1 scale

                if (combinedResults.has(productId)) {
                    const existing = combinedResults.get(productId);
                    existing.textScore = textScore;
                    existing.combinedScore += textScore * 0.3;
                } else {
                    combinedResults.set(productId, {
                        ...hit.document,
                        vectorScore: 0,
                        textScore: textScore,
                        combinedScore: textScore * 0.3
                    });
                }
            });

            // Sort by combined score and convert to array
            const hybridResults = {
                hits: Array.from(combinedResults.values())
                    .sort((a, b) => b.combinedScore - a.combinedScore)
                    .slice(0, topK)
                    .map(result => ({
                        document: result,
                        text_match: result.combinedScore * 100, // Convert back for compatibility
                        vector_distance: 1 - result.vectorScore
                    }))
            };

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
                score: hit.document.combinedScore || (hit.text_match / 100), // Use combined score or fallback
                vectorScore: hit.document.vectorScore || 0,
                textScore: hit.document.textScore || 0,
                metadata: hit.document
            })) || [];

            return this.deduplicateProductResults(results);

        } catch (error) {
            console.error('Multimodal search error:', error);

            // Fallback to text-only search if vector search or multi-search fails
            if (error.message && (error.message.includes('vector_query') || error.message.includes('multi_search'))) {
                console.log('Multi-search failed, falling back to single text-only search...');

                try {
                    const fallbackResults = await this.client.collections(this.embeddingsCollection)
                        .documents()
                        .search({
                            q: query || '*',
                            query_by: 'searchableText,name,description,componentType',
                            filter_by: 'embeddingType:combined && embeddingMethod:clip',
                            per_page: topK,
                            sort_by: '_text_match:desc'
                        });

                    const results = fallbackResults.hits?.map(hit => ({
                        productId: hit.document.productId,
                        name: hit.document.name,
                        description: hit.document.description,
                        price: hit.document.price,
                        componentType: hit.document.componentType,
                        categoryId: hit.document.categoryId,
                        hasImages: hit.document.hasImages,
                        imageCount: hit.document.imageCount,
                        embeddingMethod: hit.document.embeddingMethod,
                        score: hit.text_match / 100,
                        vectorScore: 0,
                        textScore: hit.text_match / 100,
                        metadata: hit.document
                    })) || [];

                    return this.deduplicateProductResults(results);

                } catch (fallbackError) {
                    console.error('Fallback search also failed:', fallbackError);
                    throw fallbackError;
                }
            }

            throw error;
        }
    }

    /**
     * Similarity search by document ID - will not return queried id:
     * https://typesense.org/docs/29.0/api/vector-search.html#querying-for-similar-documents
     * @param {string} productId 
     * @param {*} options 
     * @returns {Promise<Array>}
     */
    async similaritySearchById(productId, options = {}) {
        try {
            return await this.similaritySearch([], { ...options, id: productId + "_clip_combined" });
        } catch (error) {
            console.error('Similarity search by ID error:', error);
        }
    }

    /**
     * Similarity search using CLIP embeddings in Typesense with multi-search support
     * @param {number[]} queryEmbedding 
     * @param {*} options 
     * @returns {Promise<Array>}
     */
    async similaritySearch(queryEmbedding, options = {}) {
        try {
            const {
                topK = 10,
                threshold = 0.7,
                filters = {},
                id = null,
            } = options;

            const largerTopK = topK * 5; // Fetch more to account for deduplication

            // Prepare filter string
            const filterBy = Object.entries(filters)
                .map(([key, value]) => {
                    // Handle special operators like !== for exclusion
                    if (value.startsWith('!=')) {
                        return `${key}:${value}`;
                    }
                    return `${key}:${value}`;
                })
                .join(' && ');

            // Use multi-search for better performance with large embeddings
            const multiSearchQueries = {
                searches: [
                    {
                        collection: this.embeddingsCollection,
                        q: "*",
                        filter_by: filterBy || undefined,
                        per_page: topK,
                        exclude_fields: 'embedding',
                        vector_query: `embedding:([${queryEmbedding.join(',')}], k:${largerTopK}, threshold:${threshold} ${id ? ',id: ' + id : ''})`
                    }
                ]
            };

            // Clean up undefined fields
            multiSearchQueries.searches[0] = Object.fromEntries(
                Object.entries(multiSearchQueries.searches[0]).filter(([_, v]) => v !== undefined)
            );

            const multiSearchResults = await this.client.multiSearch.perform(multiSearchQueries);
            const results = multiSearchResults.results[0];

            const mappedResults = results.hits?.map(hit => hit.document) || [];

            return this.deduplicateProductResults(mappedResults).slice(0, topK);
        } catch (error) {
            console.error('Similarity search error:', error);

            // Fallback to single search if multi-search fails
            try {
                const fallbackFilterBy = Object.entries(filters)
                    .map(([key, value]) => {
                        if (value.startsWith('!=')) {
                            return `${key}:${value}`;
                        }
                        return `${key}:${value}`;
                    })
                    .join(' && ');

                const searchParams = {
                    q: "*",
                    filter_by: fallbackFilterBy || undefined,
                    per_page: topK,
                    exclude_fields: 'embedding',
                    vector_query: `embedding:([${queryEmbedding.join(',')}], k:${topK * 5}, threshold:${threshold} ${id ? ',id: ' + id : ''})`
                };

                // Clean up undefined fields
                searchParams = Object.fromEntries(
                    Object.entries(searchParams).filter(([_, v]) => v !== undefined)
                );

                const results = await this.client.collections(this.embeddingsCollection)
                    .documents()
                    .search(searchParams);

                const mappedResults = results.hits?.map(hit => hit.document) || [];
                return this.deduplicateProductResults(mappedResults).slice(0, topK);
            } catch (fallbackError) {
                console.error('Fallback similarity search also failed:', fallbackError);
                throw fallbackError;
            }
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

    async generateImageDescription(imageUrl) {
        try {
            // Fetch image data from URL
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
            }

            // Get image as buffer
            const imageBuffer = await imageResponse.arrayBuffer();
            const buffer = Buffer.from(imageBuffer);

            // Detect MIME type
            const mimeType = this.detectImageMimeType(buffer);

            // Convert to base64
            const base64Image = buffer.toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64Image}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.api_key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Describe this image in detail for search purposes:"
                                },
                                {
                                    type: "image_url",
                                    image_url: { url: dataUrl }
                                }
                            ]
                        }
                    ],
                    max_tokens: 300
                })
            });

            const result = await response.json();
            return result.choices[0].message.content;
        } catch (error) {
            console.error('Image description error:', error);
            return 'Image content description unavailable';
        }
    }
}

module.exports = new TypesenseEmbeddingService();
