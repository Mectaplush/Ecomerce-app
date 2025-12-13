const { Client } = require('typesense');
const OpenAI = require('openai');
const { POLICIES_COLLECTION, generateEmbedding } = require('../scripts/processPolicies');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Typesense
const typesense = new Client({
    nodes: [
        {
            host: process.env.TYPESENSE_HOST || 'localhost',
            port: process.env.TYPESENSE_PORT || 8108,
            protocol: process.env.TYPESENSE_PROTOCOL || 'http',
        },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
    connectionTimeoutSeconds: 2,
});

class PolicySearchService {
    constructor() {
        this.collection = POLICIES_COLLECTION;
    }

    // Search policies using text and vector similarity
    async searchPolicies(query, limit = 5) {
        try {
            // Generate embedding for the query
            const queryEmbedding = await generateEmbedding(query);

            // Perform hybrid search: text + vector similarity
            const searchParams = {
                searches: [
                    {
                        collection: this.collection,
                        q: query,
                        query_by: 'title,content,keywords',
                        vector_query: `embedding:(${queryEmbedding.join(',')})`,
                        limit: limit,
                        prioritize_exact_match: true,
                        include_fields: 'section,title,content,keywords',
                        highlight_fields: 'title,content',
                        snippet_threshold: 30,
                        num_typos: 2
                    }
                ]
            };

            const response = await typesense.multiSearch.perform(searchParams);

            if (response.results && response.results[0] && response.results[0].hits) {
                return response.results[0].hits.map(hit => ({
                    id: hit.document.id,
                    section: hit.document.section,
                    title: hit.document.title,
                    content: hit.document.content,
                    keywords: hit.document.keywords,
                    score: hit.text_match_score || 0,
                    highlights: hit.highlights || []
                }));
            }

            return [];
        } catch (error) {
            console.error('Error searching policies:', error);
            return [];
        }
    }

    // Search policies by specific category
    async searchPoliciesByCategory(category, query = '', limit = 3) {
        try {
            const searchParams = {
                q: query || '*',
                query_by: 'title,content,keywords',
                filter_by: `section:${category}`,
                limit: limit,
                include_fields: 'section,title,content,keywords'
            };

            const response = await typesense.collections(this.collection).documents().search(searchParams);

            if (response.hits) {
                return response.hits.map(hit => ({
                    id: hit.document.id,
                    section: hit.document.section,
                    title: hit.document.title,
                    content: hit.document.content,
                    keywords: hit.document.keywords,
                    score: hit.text_match_score || 0
                }));
            }

            return [];
        } catch (error) {
            console.error('Error searching policies by category:', error);
            return [];
        }
    }

    // Get all available policy sections
    async getPolicySections() {
        try {
            const response = await typesense.collections(this.collection).documents().search({
                q: '*',
                query_by: 'section',
                group_by: 'section',
                group_limit: 1,
                limit: 250
            });

            if (response.grouped_hits) {
                return response.grouped_hits.map(group => group.group_key[0]);
            }

            return [];
        } catch (error) {
            console.error('Error getting policy sections:', error);
            return [];
        }
    }

    // Classify query intent for policy search
    classifyPolicyIntent(query) {
        const intents = {
            'return': ['return', 'refund', 'exchange', 'money back', 'send back'],
            'warranty': ['warranty', 'guarantee', 'defective', 'broken', 'repair', 'replacement'],
            'shipping': ['shipping', 'delivery', 'ship', 'freight', 'transport', 'arrive'],
            'privacy': ['privacy', 'data', 'information', 'personal', 'collection'],
            'support': ['support', 'help', 'technical', 'assistance', 'service'],
            'terms': ['terms', 'conditions', 'rules', 'agreement', 'policy']
        };

        const queryLower = query.toLowerCase();

        for (const [intent, keywords] of Object.entries(intents)) {
            if (keywords.some(keyword => queryLower.includes(keyword))) {
                return intent;
            }
        }

        return 'general';
    }

    // Enhanced search with intent classification
    async intelligentPolicySearch(query, limit = 3) {
        try {
            const intent = this.classifyPolicyIntent(query);

            // First, try to find relevant policies using hybrid search
            const results = await this.searchPolicies(query, limit);

            // If no good results and we have a specific intent, search by category
            if (results.length === 0 || (results[0] && results[0].score < 0.5)) {
                const intentMapping = {
                    'return': '1. RETURN AND REFUND POLICY',
                    'warranty': '2. WARRANTY POLICY',
                    'shipping': '3. SHIPPING AND DELIVERY POLICY',
                    'privacy': '4. PRIVACY POLICY',
                    'support': '6. TECHNICAL SUPPORT POLICY',
                    'terms': '5. TERMS OF SERVICE'
                };

                if (intentMapping[intent]) {
                    const categoryResults = await this.searchPoliciesByCategory(intentMapping[intent], query, limit);
                    if (categoryResults.length > 0) {
                        return {
                            results: categoryResults,
                            intent: intent,
                            searchType: 'category'
                        };
                    }
                }
            }

            return {
                results: results,
                intent: intent,
                searchType: 'hybrid'
            };
        } catch (error) {
            console.error('Error in intelligent policy search:', error);
            return {
                results: [],
                intent: 'general',
                searchType: 'error'
            };
        }
    }
}

module.exports = PolicySearchService;
