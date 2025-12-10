// config/typesense.js
const Typesense = require('typesense');
require('dotenv').config();

// Typesense client configuration
const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: process.env.TYPESENSE_PORT || 8108,
      protocol: process.env.TYPESENSE_PROTOCOL || 'http'
    }
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10
});

// Product embeddings collection schema
const productEmbeddingsSchema = {
  name: 'product_embeddings',
  fields: [
    { name: 'id', type: 'string', facet: false },
    { name: 'productId', type: 'string', facet: true }, // UUID
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false, optional: true },
    { name: 'price', type: 'float', facet: true, optional: true },
    { name: 'componentType', type: 'string', facet: true, optional: true },
    { name: 'categoryId', type: 'string', facet: true, optional: true }, // UUID
    { name: 'embeddingType', type: 'string', facet: true }, // 'text', 'image', 'combined'
    { name: 'embeddingMethod', type: 'string', facet: true }, // 'clip', 'openai'
    { name: 'imageIndex', type: 'int32', facet: true, optional: true },
    { name: 'hasImages', type: 'bool', facet: true, optional: true },
    { name: 'imageCount', type: 'int32', facet: true, optional: true },
    { name: 'embedding', type: 'float[]', facet: false, num_dim: 512 }, // Vector embedding with dimensionality
    { name: 'timestamp', type: 'int64', facet: false, sort: true }, // Unix timestamp for sorting
    // Additional searchable text fields
    { name: 'searchableText', type: 'string', facet: false, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true }
  ],
  default_sorting_field: 'timestamp',
  enable_nested_fields: true
};

// Products collection schema for hybrid search
const productsSchema = {
  name: 'products',
  fields: [
    { name: 'id', type: 'string', facet: false }, // UUID
    { name: 'name', type: 'string', facet: false },
    { name: 'description', type: 'string', facet: false, optional: true },
    { name: 'price', type: 'float', facet: true, sort: true },
    { name: 'componentType', type: 'string', facet: true },
    { name: 'categoryId', type: 'string', facet: true }, // UUID
    { name: 'images', type: 'string', facet: false, optional: true },
    { name: 'cpu', type: 'string', facet: false, optional: true },
    { name: 'gpu', type: 'string', facet: false, optional: true },
    { name: 'ram', type: 'string', facet: false, optional: true },
    { name: 'storage', type: 'string', facet: false, optional: true },
    { name: 'mainboard', type: 'string', facet: false, optional: true },
    { name: 'powerSupply', type: 'string', facet: false, optional: true },
    { name: 'case', type: 'string', facet: false, optional: true },
    { name: 'cooler', type: 'string', facet: false, optional: true },
    { name: 'tags', type: 'string[]', facet: true, optional: true },
    { name: 'createdAt', type: 'int64', facet: false, optional: true },
    { name: 'updatedAt', type: 'int64', facet: false, sort: true }
  ],
  default_sorting_field: 'updatedAt'
};

// Initialize collections
async function initializeCollections() {
  try {
    // Check if collections exist, create if they don't
    const collections = await typesenseClient.collections().retrieve();
    const collectionNames = collections.map(col => col.name);

    if (!collectionNames.includes('product_embeddings')) {
      console.log('Creating product_embeddings collection...');
      await typesenseClient.collections().create(productEmbeddingsSchema);
      console.log('✅ product_embeddings collection created');
    }

    if (!collectionNames.includes('products')) {
      console.log('Creating products collection...');
      await typesenseClient.collections().create(productsSchema);
      console.log('✅ products collection created');
    }

    console.log('Typesense collections initialized successfully');
  } catch (error) {
    console.error('Error initializing Typesense collections:', error);
    throw error;
  }
}

// Helper function to recreate collections (for development)
async function recreateCollections() {
  try {
    console.log('🗑️ Recreating Typesense collections...');

    // Delete existing collections
    const collections = ['product_embeddings', 'products'];
    for (const collectionName of collections) {
      try {
        await typesenseClient.collections(collectionName).delete();
        console.log(`✅ Deleted collection: ${collectionName}`);
      } catch (error) {
        console.log(`ℹ️ Collection ${collectionName} doesn't exist or already deleted`);
      }
    }

    // Small delay to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Recreate collections
    await initializeCollections();
    console.log('🎉 Collections recreated successfully');
  } catch (error) {
    console.error('❌ Error recreating collections:', error);
    throw error;
  }
}

module.exports = {
  typesenseClient,
  initializeCollections,
  recreateCollections,
  productEmbeddingsSchema,
  productsSchema
};
