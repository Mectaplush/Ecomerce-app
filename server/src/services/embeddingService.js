// services/embeddingService.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { pinecone } = require('../config/pinecone.js');

class MultimodalEmbeddingService {

  constructor() {
    this.api_key = process.env.OPEN_API_KEY;
    this.embeddings = new OpenAIEmbeddings({
      apiKey: process.env.OPEN_API_KEY,
      modelName: "text-embedding-3-small", // Cheaper option for starter plan
    });

    if (!process.env.OPEN_API_KEY) {
      throw new Error("ApiKey not defined")
    }

    this.index = pinecone.index(process.env.PINECONE_INDEX_NAME);
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
   * TODO
   * Generate product data from multiple images urls
   * @param {string[]} imageUrls 
   * @param {Set<string>} productTypes
   * @param {Set<string>} categories
   * @returns {
   *  {
   *    name: string,
   *    description: string,
   *    category: string,
   *    productType: string,
   *  }
   * }
   */
  async generateProductDataFromImages(imageUrls, productTypes, categories) {
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
        match => match.score <= threshold
      );

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
}

module.exports = new MultimodalEmbeddingService();
