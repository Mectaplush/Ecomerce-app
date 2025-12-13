// services/embeddingService.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { pinecone } = require('../config/pinecone.js');
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

class MultimodalEmbeddingService {

  constructor() {
    this.api_key = process.env.OPENAI_API_KEY;
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // Cheaper option for starter plan
    });

    this.tokenizerTask = AutoTokenizer.from_pretrained('Xenova/clip-vit-base-patch32');
    this.textModelTask = CLIPTextModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32');
    this.processorTask = AutoProcessor.from_pretrained('Xenova/clip-vit-base-patch32');
    this.visionModelTask = CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-base-patch32');

    this.index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  }

  /**
   * Create CLIP embedding for text - same vector space as images
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
        // Fallback: convert tensor to array
        embedding = Array.from(text_embeds).flat();
      }

      console.log(`Text embedding shape: [${embedding.length}]`, typeof embedding[0]);
      return Array.isArray(embedding)
        ? embedding.flat()
        : Array.from(embedding);
    } catch (error) {
      console.error('CLIP text embedding error:', error);
      throw error;
    }
  }

  /**
   * Create CLIP embedding for image - same vector space as text
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
        // Fallback: convert tensor to array
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
     * @param {{
     *  name: string,
     *  description: string,
     *  componentType: string,
     * }} product - Text data
     * @param {string[]} imagesData - Array of image data (base64 or URLs)
     * @returns {Promise<{
     *  textEmbedding: {
     *  name: number[],
     *  description: number[],
     *  componentType: number[],
     * },
     *  imagesEmbeddings: number[][]
     * }>} Embeddings vector
     */
  async embedTextAndImagesWithCLIP(product, imagesData) {
    try {
      const textEmbedding = {
        name: await this.embedTextWithCLIP(product.name),
        description: await this.embedTextWithCLIP(product.description),
        componentType: await this.embedTextWithCLIP(product.componentType)
      };
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
   * Create multimodal product embedding using CLIP
   * @param {Object} product - Product data
   * @returns {Promise<string[]>} Array of embedding record IDs
   */
  async embedProductWithCLIP(product) {
    try {
      const recordIds = [];
      const embeddings = [];
      const weights = [];

      // 1. Create text embedding with CLIP
      // const productText = `${product.name} ${product.description} ${product.componentType}`;

      const productEmbeddings = await this.embedTextAndImagesWithCLIP(
        product,
        product.images ? product.images.split(',').map(url => url.trim()) : []
      );

      const textEmbedding = productEmbeddings.textEmbedding;

      function createTextRecord(propertyName, embedding) {
        return {
          id: `${product.id}_clip_text_${propertyName}`,
          values: embedding, // Guaranteed flat array
          metadata: {
            type: `multimodal_clip_text_${propertyName}`,
            productId: product.id,
            name: product.name,
            price: product.price,
            componentType: product.componentType,
            categoryId: product.categoryId,
            embeddingType: 'text',
            embeddingMethod: 'clip',
            timestamp: new Date().toISOString()
          }
        };
      }

      const nameRecord = createTextRecord('name', textEmbedding.name);
      const descriptionRecord = createTextRecord('description', textEmbedding.description);
      const componentTypeRecord = createTextRecord('componentType', textEmbedding.componentType);


      console.log(`Text embedding validation: length=${textEmbedding.name.length}, first value type=${typeof textEmbedding.name[0]}`);

      await this.index.upsert([nameRecord]);
      recordIds.push(nameRecord.id);
      embeddings.push(textEmbedding.name);
      weights.push(0.6);

      await this.index.upsert([descriptionRecord]);
      recordIds.push(descriptionRecord.id);
      embeddings.push(textEmbedding.description);
      weights.push(0.3);

      await this.index.upsert([componentTypeRecord]);
      recordIds.push(componentTypeRecord.id);
      embeddings.push(textEmbedding.componentType);
      weights.push(0.1);

      // 3. Store each image embedding as separate record
      if (productEmbeddings.imagesEmbeddings && productEmbeddings.imagesEmbeddings.length > 0) {
        const imageWeight = 0.4 / productEmbeddings.imagesEmbeddings.length;

        for (let i = 0; i < productEmbeddings.imagesEmbeddings.length; i++) {
          // Validation: Ensure imageEmbedding is a flat array
          const imageEmbedding = Array.isArray(productEmbeddings.imagesEmbeddings[i])
            ? productEmbeddings.imagesEmbeddings[i].flat()
            : Array.from(productEmbeddings.imagesEmbeddings[i]);

          const imageRecord = {
            id: `${product.id}_clip_image_${i}`,
            values: imageEmbedding, // Guaranteed flat array
            metadata: {
              type: 'multimodal_clip_image',
              productId: product.id,
              name: product.name,
              price: product.price,
              componentType: product.componentType,
              categoryId: product.categoryId,
              embeddingType: 'image',
              imageIndex: i,
              embeddingMethod: 'clip',
              timestamp: new Date().toISOString()
            }
          };

          console.log(`Image ${i} embedding validation: length=${imageEmbedding.length}, first value type=${typeof imageEmbedding[0]}`);

          await this.index.upsert([imageRecord]);
          recordIds.push(imageRecord.id);
          embeddings.push(imageEmbedding);
          weights.push(imageWeight);
        }
      }

      // 4. Create and store combined embedding as separate record
      const combinedEmbedding = this.weightedAverageEmbeddings(embeddings, weights);

      // Validation: Ensure combinedEmbedding is a flat array
      const validatedCombinedEmbedding = Array.isArray(combinedEmbedding)
        ? combinedEmbedding.flat()
        : Array.from(combinedEmbedding);

      const combinedRecord = {
        id: `${product.id}_clip_combined`,
        values: validatedCombinedEmbedding, // Guaranteed flat array
        metadata: {
          type: 'multimodal_clip_combined',
          productId: product.id,
          name: product.name,
          price: product.price,
          componentType: product.componentType,
          categoryId: product.categoryId,
          hasImages: !!product.images,
          imageCount: product.images ? product.images.split(',').length : 0,
          embeddingType: 'combined',
          embeddingMethod: 'clip',
          timestamp: new Date().toISOString()
        }
      };

      console.log(`Combined embedding validation: length=${validatedCombinedEmbedding.length}, first value type=${typeof validatedCombinedEmbedding[0]}`);

      await this.index.upsert([combinedRecord]);
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
   * @param {string} id
   * @param {string} text
   * @param {{}} [metadata={}] 
  */
  async embedText(id, text, metadata = {}) {
    try {
      const embedding = await this.embeddings.embedQuery(text);

      const record = {
        id: id,
        values: embedding,
        metadata: {
          type: 'text',
          content: text,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      await this.index.upsert([record]);
      return record.id;
    } catch (error) {
      console.error('Text embedding error:', error);
      throw error;
    }
  }

  /**
   * Image embedding into text only occurs if description is not a string
   * 
   * @param {string} id 
   * @param {string} imageUrl 
   * @param {string?} description 
   * @param {any} metadata 
   * @returns 
   */
  async embedImage(id, imageUrl, description, metadata = {}) {
    try {
      // Generate image description if not provided
      let imageDescription = description;
      if (!imageDescription) {
        imageDescription = await this.generateImageDescription(imageUrl);
      }

      const embedding = await this.embeddings.embedQuery(imageDescription);

      const record = {
        id: id,
        values: embedding,
        metadata: {
          type: 'image',
          imageUrl,
          description: imageDescription,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      };

      await this.index.upsert([record]);
      return record.id;
    } catch (error) {
      console.error('Image embedding error:', error);
      throw error;
    }
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

  /**
   * Generate product data from multiple base64 image data
   * @param {string[]} imagesData - Array of base64 data URLs
   * @param {Set<string>|string[]} componentTypes
   * @param {Set<string>|string[]} categories
   * @returns {Promise<{
   *    name: string,
   *    description: string,
   *    category: string,
   *    componentType: string,
   *    cpu?: string,
   *    mainboard?: string,
   *    ram?: string,
   *    storage?: string,
   *    gpu?: string,
   *    powerSupply?: string,
   *    case?: string,
   *    cooler?: string
   * }>}
   */
  async generateProductDataFromImages(imagesData, componentTypes, categories) {
    try {
      if (!imagesData || imagesData.length === 0) {
        throw new Error('No image data provided');
      }

      // Convert Sets to Arrays for easier handling
      const productTypesList = Array.from(componentTypes || []);
      const categoriesList = Array.from(categories || []);

      // Process all images and get descriptions
      const imageDescriptions = [];

      for (const imageData of imagesData) {
        try {
          // Validate that it's a proper data URL
          if (!imageData.startsWith('data:image/')) {
            console.warn('Invalid image data format:', imageData.substring(0, 50) + '...');
            continue;
          }

          // Use the base64 image data directly
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
                      text: "Analyze this product image and describe what you see in detail, focusing on the product type, features, and specifications."
                    },
                    {
                      type: "image_url",
                      image_url: { url: imageData }
                    }
                  ]
                }
              ],
              max_tokens: 500
            })
          });

          const result = await response.json();
          if (result.choices && result.choices[0]) {
            imageDescriptions.push(result.choices[0].message.content);
          }
        } catch (error) {
          console.warn('Error processing image data:', error);
        }
      }

      if (imageDescriptions.length === 0) {
        throw new Error('No images could be processed successfully');
      }

      // Generate product data based on all image descriptions
      const combinedDescription = imageDescriptions.join(' ');

      const productDataResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a product data generator for an e-commerce PC shop. Based on the product images provided, generate appropriate product information.
              
              Available categories: ${categoriesList.join(', ')}
              Available component types: ${productTypesList.join(', ')}
              
              Return ONLY a valid JSON object with this exact structure:
              {
                "name": "Product name (concise but descriptive)",
                "description": "Detailed product description with specifications and features",
                "category": "One of the available categories that best matches",
                "componentType": "One of the available component types that best matches",
                "cpu": "CPU model/specification if this is a PC build or CPU component (optional)",
                "mainboard": "Mainboard model/specification if this is a PC build or mainboard component (optional)",
                "ram": "RAM specification if this is a PC build or RAM component (optional)",
                "storage": "Storage specification if this is a PC build or storage component (optional)",
                "gpu": "GPU specification if this is a PC build or GPU component (optional)",
                "powerSupply": "Power supply specification if this is a PC build or PSU component (optional)",
                "case": "Case specification if this is a PC build or case component (optional)",
                "cooler": "Cooler specification if this is a PC build or cooler component (optional)"
              }
              
              Only include the optional component fields if they are relevant to the detected product.`
            },
            {
              role: "user",
              content: `Generate product data based on these image descriptions: ${combinedDescription}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      const productDataResult = await productDataResponse.json();

      if (!productDataResult.choices || !productDataResult.choices[0]) {
        throw new Error('Failed to generate product data');
      }

      let productData;
      try {
        productData = JSON.parse(productDataResult.choices[0].message.content);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        const content = productDataResult.choices[0].message.content;
        productData = {
          name: "Generated Product",
          description: content,
          category: categoriesList.length > 0 ? categoriesList[0] : "Other",
          componentType: productTypesList.length > 0 ? productTypesList[0] : "Other"
        };
      }

      // Validate and ensure required fields, include optional component specifications
      const result = {
        name: productData.name || "Generated Product",
        description: productData.description || combinedDescription,
        category: productData.category || (categoriesList.length > 0 ? categoriesList[0] : "Other"),
        componentType: productData.componentType || (productTypesList.length > 0 ? productTypesList[0] : "Other")
      };

      // Add optional component specifications if they exist
      if (productData.cpu) result.cpu = productData.cpu;
      if (productData.mainboard) result.mainboard = productData.mainboard;
      if (productData.ram) result.ram = productData.ram;
      if (productData.storage) result.storage = productData.storage;
      if (productData.gpu) result.gpu = productData.gpu;
      if (productData.powerSupply) result.powerSupply = productData.powerSupply;
      if (productData.case) result.case = productData.case;
      if (productData.cooler) result.cooler = productData.cooler;

      return result;

    } catch (error) {
      console.error('Product data generation error:', error);
      throw error;
    }
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

  /** Hybrid search (text + image)
   * @param {string} query
   * @param {{
        topK: number,
        includeMetadata: bool,
        filter: {},
        threshold: number
      }} [options={}]  
   */
  async search(query, options = {}) {
    try {
      const {
        topK = 10,
        includeMetadata = true,
        filter = {},
        threshold = 0.7
      } = options;

      const queryEmbedding = await this.embeddings.embedQuery(query);

      const searchResults = await this.index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata,
        //filter
      });

      // Filter by similarity threshold
      const filteredResults = searchResults.matches.filter(
        match => match.score <= threshold || true
      );

      console.log('results:', filteredResults);

      return filteredResults.map(match => ({
        id: match.id,
        score: match.score,
        type: match.metadata?.type,
        content: match.metadata?.content || match.metadata?.description,
        imageUrl: match.metadata?.imageUrl,
        metadata: match.metadata
      }));
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Multimodal search using CLIP embeddings
   * @param {string} query - Text query
   * @param {string[]} [imagesData] - Optional image for visual search
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Search results
   */
  async searchMultimodal(query, imagesData = [], options = {}) {
    try {
      const {
        topK = 10,
        includeMetadata = true,
        threshold = 0.7,
      } = options;

      // Get query embeddings
      const queryEmbeddingData = await this.embedTextAndImagesWithCLIP({
        name: query,
        description: "",
        componentType: ""
      }, imagesData);

      // Create combined query embedding using same weighting as products
      //       const queryEmbeddings = [queryEmbeddingData.textEmbedding];
      //       const queryWeights = [0.6];
      // 
      //       if (queryEmbeddingData.imagesEmbeddings && queryEmbeddingData.imagesEmbeddings.length > 0) {
      //         const imageWeight = 0.4 / queryEmbeddingData.imagesEmbeddings.length;
      //         queryEmbeddings.push(...queryEmbeddingData.imagesEmbeddings);
      //         queryWeights.push(...Array(queryEmbeddingData.imagesEmbeddings.length).fill(imageWeight));
      //       }
      // 
      //       const queryEmbedding = this.weightedAverageEmbeddings(queryEmbeddings, queryWeights);
      // 
      //       // Validation: Ensure queryEmbedding is a flat array
      //       const validatedQueryEmbedding = Array.isArray(queryEmbedding)
      //         ? queryEmbedding.flat()
      //         : Array.from(queryEmbedding);
      // 
      //       console.log(`Query embedding validation: length=${validatedQueryEmbedding.length}, first value type=${typeof validatedQueryEmbedding[0]}`);

      // Search in Pinecone for combined embeddings
      // const searchResults = await this.index.query({
      //   vector: validatedQueryEmbedding, // Guaranteed flat array
      //   topK: topK * 2, // Get more results for deduplication
      //   includeMetadata,
      //   filter: {
      //     type: { $eq: 'multimodal_clip_combined' } // Only search combined CLIP embeddings
      //   }
      // });

      const searchResults = await this.index.query({
        vector: queryEmbeddingData.textEmbedding.name, // Guaranteed flat array
        topK: topK * 2, // Get more results for deduplication
        includeMetadata,
        filter: {
          type: { $eq: 'multimodal_clip_text_name' }
        }
      });

      //console.log(`Query embedding: `, queryEmbeddingData.textEmbedding.name);
      //console.log(`Multimodal search returned ${searchResults.matches}`);


      // Filter and deduplicate results
      const filteredResults = searchResults.matches
        .filter(match => match.score <= threshold || true)
        .slice(0, topK);

      return this.deduplicateProductResults(filteredResults);

    } catch (error) {
      console.error('Multimodal search error:', error);
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
        this.index.deleteOne(`${productId}_clip_text`).catch(() => null)
      );

      // Delete combined embedding
      deletePromises.push(
        this.index.deleteOne(`${productId}_clip_combined`).catch(() => null)
      );

      // Delete potential image embeddings (up to 10 images)
      for (let i = 0; i < 10; i++) {
        deletePromises.push(
          this.index.deleteOne(`${productId}_clip_image_${i}`).catch(() => null)
        );
      }

      await Promise.all(deletePromises);
      console.log(`Cleaned up embeddings for product ${productId}`);
    } catch (error) {
      console.error(`Error cleaning up embeddings for product ${productId}: `, error);
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
      const productId = result.metadata?.productId;

      if (productId && !seenProducts.has(productId)) {
        seenProducts.add(productId);
        uniqueResults.push({
          id: result.id,
          score: result.score,
          productId: productId,
          type: result.metadata?.type,
          name: result.metadata?.name,
          price: result.metadata?.price,
          componentType: result.metadata?.componentType,
          hasImages: result.metadata?.hasImages,
          embeddingMethod: result.metadata?.embeddingMethod,
          metadata: result.metadata
        });
      }
    }

    return uniqueResults;
  }
}

module.exports = new MultimodalEmbeddingService();
