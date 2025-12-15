const fs = require('fs').promises;
const path = require('path');
const OpenAI = require('openai');
const { Client } = require('typesense');
const mammoth = require('mammoth');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

const POLICIES_COLLECTION = 'policies';

// Define the collection schema
const policiesSchema = {
    name: POLICIES_COLLECTION,
    fields: [
        { name: 'id', type: 'string' },
        { name: 'section', type: 'string', facet: true },
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'keywords', type: 'string[]', facet: true },
        { name: 'embedding', type: 'float[]', num_dim: 1536 }
    ]
};

// Function to read and parse the policies document
async function readPoliciesDocument() {
    try {
        // Try to read Vietnamese Word document first
        const docxPath = path.join(__dirname, '../../docDrafts/Chinh_Sach_Ecommerce_May_Tinh_Viet_Nam.docx');
        const mdPath = path.join(__dirname, '../../../E-Commerce Store Policies.md');

        // Check if .docx file exists
        try {
            await fs.access(docxPath);
            console.log('Reading Vietnamese Word document (.docx)...');

            // Use mammoth with options to preserve Vietnamese formatting
            const result = await mammoth.extractRawText({
                path: docxPath,
                options: {
                    includeEmbeddedStyleMap: true,
                    preserveEmptyParagraphs: false
                }
            });

            console.log('Vietnamese text extracted successfully');
            return result.value;

        } catch (docxError) {
            console.log('Vietnamese Word document not found, trying markdown file...');

            // Fallback to markdown file
            try {
                await fs.access(mdPath);
                console.log('Reading markdown file (.md)...');
                const content = await fs.readFile(mdPath, 'utf-8');
                return content;
            } catch (mdError) {
                throw new Error(`Neither Word document (${docxPath}) nor markdown file (${mdPath}) found`);
            }
        }
    } catch (error) {
        console.error('Error reading policies document:', error);
        throw error;
    }
}

// Function to chunk the policies document into sections
function chunkPoliciesDocument(content) {
    const chunks = [];

    // Try multiple splitting strategies for Vietnamese documents
    let sections = [];

    // Strategy 1: Split by double lines or section separators
    if (content.includes('═══════════════════════════════════════════════════════════════════════════════')) {
        sections = content.split('═══════════════════════════════════════════════════════════════════════════════');
    }
    // Strategy 2: Split by common Vietnamese section patterns
    else if (content.match(/\n\s*[\d\.]+\s*[A-ZÁÀẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÊỀẾỂỄỆÔỒỐỔỖỘƠỜỚỞỠỢƯỪỨỬỮỰ]/)) {
        sections = content.split(/\n(?=\s*[\d\.]+\s*[A-ZÁÀẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÊỀẾỂỄỆÔỒỐỔỖỘƠỜỚỞỠỢƯỪỨỬỮỰ])/);
    }
    // Strategy 3: Split by paragraph breaks if no clear structure
    else {
        sections = content.split(/\n\s*\n\s*\n/);
    }

    sections.forEach((section, index) => {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;

        // Skip table of contents and headers (Vietnamese and English)
        if (section.includes('TABLE OF CONTENTS') ||
            section.includes('SHOP PC - COMPUTER') ||
            section.includes('MỤC LỤC') ||
            section.includes('BẢNG NỘI DUNG') ||
            section.match(/^\s*CHÍNH SÁCH.*SHOP/i)) {
            return;
        }

        let currentChunk = {
            section: '',
            title: '',
            content: '',
            subsections: []
        };

        let currentSubsection = '';
        let currentSubContent = [];

        let allContent = [];

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Main section title (numbered) - support Vietnamese characters
            if (/^\d+\.\s+[A-ZÁÀẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÊỀẾỂỄỆÔỒỐỔỖỘƠỜỚỞỠỢƯỪỨỬỮỰ][\w\s&ÁÀẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÊỀẾỂỄỆÔỒỐỔỖỘƠỜỚỞỠỢƯỪỨỬỮỰĐ]*$/i.test(trimmedLine)) {
                currentChunk.section = trimmedLine;
                currentChunk.title = trimmedLine;
            }
            // Subsection title (x.x format or Roman numerals)
            else if (/^\d+\.\d+\s+/.test(trimmedLine) || /^[IVX]+\.\s+/.test(trimmedLine)) {
                // Save previous subsection if exists
                if (currentSubsection && currentSubContent.length > 0) {
                    currentChunk.subsections.push({
                        title: currentSubsection,
                        content: currentSubContent.join('\n')
                    });
                    currentSubContent = [];
                }
                currentSubsection = trimmedLine;
            }
            // Content lines
            else if (trimmedLine && !trimmedLine.startsWith('•')) {
                if (currentSubsection) {
                    currentSubContent.push(trimmedLine);
                } else if (currentChunk.section) {
                    // Collect content even without subsections
                    allContent.push(trimmedLine);
                }
            }
            // Bullet points
            else if (trimmedLine.startsWith('•')) {
                if (currentSubsection) {
                    currentSubContent.push(trimmedLine);
                } else if (currentChunk.section) {
                    allContent.push(trimmedLine);
                }
            }
        }

        // Add last subsection
        if (currentSubsection && currentSubContent.length > 0) {
            currentChunk.subsections.push({
                title: currentSubsection,
                content: currentSubContent.join('\n')
            });
        }

        // If no subsections but has content, store as main content
        if (currentChunk.section && currentChunk.subsections.length === 0 && allContent.length > 0) {
            currentChunk.content = `${currentChunk.section}\n\n${allContent.join('\n')}`;
        }

        if (currentChunk.section) {
            chunks.push(currentChunk);
        }
    });

    // If no structured chunks found, create chunks from paragraphs
    if (chunks.length === 0) {
        console.log('No structured sections found, creating paragraph-based chunks...');
        const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);

        paragraphs.forEach((paragraph, index) => {
            const trimmedParagraph = paragraph.trim();
            if (trimmedParagraph) {
                // Extract title from first line
                const firstLine = trimmedParagraph.split('\n')[0].trim();
                const title = firstLine.length > 100 ? firstLine.substring(0, 100) + '...' : firstLine;

                chunks.push({
                    section: `Đoạn ${index + 1}`, // "Section" in Vietnamese
                    title: title,
                    content: trimmedParagraph,
                    subsections: [{
                        title: title,
                        content: trimmedParagraph
                    }]
                });
            }
        });
    }

    return chunks;
}

// Function to generate embeddings for text
async function generateEmbedding(text) {
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

// Function to extract keywords from content
function extractKeywords(content) {
    const keywords = new Set();

    // Common words to exclude (English + Vietnamese)
    const commonWords = [
        // English
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'are', 'is', 'will', 'be', 'may', 'can',
        // Vietnamese
        'của', 'và', 'các', 'được', 'có', 'này', 'cho', 'để', 'với', 'từ', 'trong', 'theo', 'trên', 'về', 'khi', 'như', 'một', 'sẽ', 'phải', 'đã', 'không', 'hoặc', 'nếu', 'tại', 'là'
    ];

    // Extract meaningful words (support Vietnamese characters)
    const words = content.toLowerCase().match(/[\wàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+/g) || [];
    words.forEach(word => {
        if (word.length > 3 && !commonWords.includes(word)) {
            keywords.add(word);
        }
    });

    // Add domain-specific keywords (English + Vietnamese)
    const domainKeywords = {
        // Return/Refund
        'return': ['returns', 'refund', 'exchange', 'trả', 'hoàn', 'đổi', 'trả hàng', 'hoàn tiền', 'đổi hàng'],
        'warranty': ['guarantee', 'coverage', 'protection', 'bảo hành', 'đảm bảo', 'bảo vệ'],
        'shipping': ['delivery', 'transport', 'freight', 'giao hàng', 'vận chuyển', 'ship'],
        'support': ['help', 'assistance', 'service', 'hỗ trợ', 'giúp đỡ', 'dịch vụ'],
        'policy': ['terms', 'conditions', 'rules', 'chính sách', 'quy định', 'điều khoản'],
        'payment': ['billing', 'charge', 'cost', 'thanh toán', 'tính phí', 'chi phí', 'giá']
    };

    Object.entries(domainKeywords).forEach(([key, synonyms]) => {
        if (content.toLowerCase().includes(key)) {
            keywords.add(key);
            synonyms.forEach(synonym => {
                if (content.toLowerCase().includes(synonym)) {
                    keywords.add(synonym);
                }
            });
        }
    });

    return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
}

// Function to create or recreate the policies collection
async function createPoliciesCollection() {
    try {
        // Try to delete existing collection
        try {
            await typesense.collections(POLICIES_COLLECTION).delete();
            console.log('Existing policies collection deleted');
        } catch (error) {
            console.log('No existing collection to delete');
        }

        // Create new collection
        await typesense.collections().create(policiesSchema);
        console.log('Policies collection created successfully');
    } catch (error) {
        console.error('Error creating policies collection:', error);
        throw error;
    }
}

// Function to process and index policy chunks
async function processPolicyChunks(chunks) {
    const documents = [];
    let documentId = 1;

    for (const chunk of chunks) {
        // Process main section - handle both structured and unstructured content
        if (chunk.section) {
            // If has subsections, process them
            if (chunk.subsections && chunk.subsections.length > 0) {
                const sectionContent = `${chunk.section}\n\n${chunk.subsections.map(sub => `${sub.title}\n${sub.content}`).join('\n\n')}`;
                const embedding = await generateEmbedding(sectionContent);
                const keywords = extractKeywords(sectionContent);

                documents.push({
                    id: `policy_${documentId++}`,
                    section: chunk.section,
                    title: chunk.section,
                    content: sectionContent,
                    keywords: keywords,
                    embedding: embedding
                });

                // Process each subsection separately for more granular search
                for (const subsection of chunk.subsections) {
                    const subEmbedding = await generateEmbedding(`${subsection.title}\n${subsection.content}`);
                    const subKeywords = extractKeywords(`${subsection.title} ${subsection.content}`);

                    documents.push({
                        id: `policy_${documentId++}`,
                        section: chunk.section,
                        title: subsection.title,
                        content: `${subsection.title}\n\n${subsection.content}`,
                        keywords: subKeywords,
                        embedding: subEmbedding
                    });
                }
            } else {
                // No subsections - treat entire content as one document
                const content = chunk.content || chunk.section;
                const embedding = await generateEmbedding(content);
                const keywords = extractKeywords(content);

                documents.push({
                    id: `policy_${documentId++}`,
                    section: chunk.section,
                    title: chunk.title || chunk.section,
                    content: content,
                    keywords: keywords,
                    embedding: embedding
                });
            }
        }
    }

    return documents;
}

// Function to index documents in batches
async function indexDocuments(documents) {
    const batchSize = 10;

    for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);

        try {
            await typesense.collections(POLICIES_COLLECTION).documents().import(batch);
            console.log(`Indexed batch ${Math.floor(i / batchSize) + 1} (${batch.length} documents)`);
        } catch (error) {
            console.error(`Error indexing batch ${Math.floor(i / batchSize) + 1}:`, error);
        }
    }
}

// Main function to process policies
async function processPolicies() {
    try {
        console.log('Starting policies processing...');

        // Read the policies document
        console.log('Reading policies document...');
        const content = await readPoliciesDocument();

        // Debug: Show content preview
        console.log(`Content length: ${content.length} characters`);
        console.log('Content preview (first 500 chars):');
        console.log(content.substring(0, 500));
        console.log('Content preview (last 300 chars):');
        console.log(content.substring(content.length - 300));

        // Chunk the document
        console.log('Chunking policies document...');
        const chunks = chunkPoliciesDocument(content);
        console.log(`Created ${chunks.length} policy sections`);

        // Create Typesense collection
        console.log('Creating Typesense collection...');
        await createPoliciesCollection();

        // Process chunks and generate embeddings
        console.log('Processing chunks and generating embeddings...');
        const documents = await processPolicyChunks(chunks);
        console.log(`Generated ${documents.length} policy documents`);

        // Index documents in Typesense
        console.log('Indexing documents in Typesense...');
        await indexDocuments(documents);

        console.log('✅ Policies processing completed successfully!');
        console.log(`Total documents indexed: ${documents.length}`);

    } catch (error) {
        console.error('❌ Error processing policies:', error);
        process.exit(1);
    }
}

// Export functions for use in other modules
module.exports = {
    processPolicies,
    generateEmbedding,
    extractKeywords,
    POLICIES_COLLECTION
};

// Run if called directly
if (require.main === module) {
    processPolicies();
}
