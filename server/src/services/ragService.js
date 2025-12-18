// services/ragService.js
import embeddingService from './embeddingService.js';

class MultimodalRAGService {
  async query(userQuery, options = {}) {
    try {
      const {
        maxResults = 5,
        includeImages = true,
        contextWindow = 4000
      } = options;

      // Search for relevant content
      const searchResults = await embeddingService.search(userQuery, {
        topK: maxResults * 2, // Get more results to filter
      });

      // Separate text and image results
      const textResults = searchResults.filter(r => r.type === 'text');
      const imageResults = searchResults.filter(r => r.type === 'image');

      // Build context
      let context = this.buildContext(textResults, imageResults, contextWindow);

      // Generate response
      const response = await this.generateResponse(userQuery, context, imageResults);

      return {
        answer: response,
        sources: {
          text: textResults.slice(0, maxResults),
          images: includeImages ? imageResults.slice(0, 3) : []
        },
        metadata: {
          totalResults: searchResults.length,
          textSources: textResults.length,
          imageSources: imageResults.length
        }
      };
    } catch (error) {
      console.error('RAG query error:', error);
      throw error;
    }
  }

  buildContext(textResults, imageResults, maxLength) {
    let context = '';
    let currentLength = 0;

    // Add text context
    for (const result of textResults) {
      const addition = `\nText (Score: ${result.score.toFixed(2)}): ${result.content}`;
      if (currentLength + addition.length > maxLength) break;
      context += addition;
      currentLength += addition.length;
    }

    // Add image context
    for (const result of imageResults) {
      const addition = `\nImage (Score: ${result.score.toFixed(2)}): ${result.content}`;
      if (currentLength + addition.length > maxLength) break;
      context += addition;
      currentLength += addition.length;
    }

    return context;
  }

  async generateResponse(query, context, imageResults) {
    const imageUrls = imageResults.slice(0, 2).map(r => r.imageUrl).filter(Boolean);

    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant that can answer questions based on both text and image content. 
                 Use the provided context to answer questions accurately. 
                 If referencing images, mention them clearly.`
      },
      {
        role: "user",
        content: `Context: ${context}\n\nQuestion: ${query}`
      }
    ];

    // Add images if available (for vision model)
    if (imageUrls.length > 0) {
      messages[1].content = [
        { type: "text", text: `Context: ${context}\n\nQuestion: ${query}` },
        ...imageUrls.map(url => ({
          type: "image_url",
          image_url: { url }
        }))
      ];
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageUrls.length > 0 ? "gpt-4-vision-preview" : "gpt-3.5-turbo",
        messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    const result = await response.json();
    return result.choices[0].message.content;
  }
}

export default new MultimodalRAGService();
