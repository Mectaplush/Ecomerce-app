// services/embeddingService.js
const { OpenAIEmbeddings } = require('@langchain/openai');
const { PineconeStore } = require('@langchain/pinecone');
const { pinecone } = require('../config/pinecone.js');

class MultimodalEmbeddingService {

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "text-embedding-3-small", // Cheaper option for starter plan
    });
    
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

  // Generate image description using OpenAI Vision
  async generateImageDescription(imageUrl) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4-vision-preview",
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
                  image_url: { url: imageUrl }
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

  // Hybrid search (text + image)
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
        filter
      });

      // Filter by similarity threshold
      const filteredResults = searchResults.matches.filter(
        match => match.score >= threshold
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
