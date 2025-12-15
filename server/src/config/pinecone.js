// config/pinecone.js
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('@langchain/openai');

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
});

module.exports = { pinecone, openai };
