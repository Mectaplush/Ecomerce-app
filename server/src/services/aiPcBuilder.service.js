const { OpenAI } = require('openai');
const modelProduct = require('../models/products.model');
const modelProductComponent = require('../models/products.model');
const { Op } = require('sequelize');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIPcBuilderService {
    /**
     * Analyze user's purpose and budget to recommend PC components
     * @param {string} purpose - User's purpose (gaming, work, video editing, etc.)
     * @param {number} budget - User's budget in VND
     * @returns {Promise<Object>} - Recommended components for each type
     */
    async recommendComponents(purpose, budget) {
        try {
            // Step 1: Use AI to analyze the purpose and generate component priorities
            const componentPriorities = await this.analyzePurpose(purpose, budget);

            // Step 2: Get available products from database for each component type
            const availableProducts = await this.getAvailableComponents();

            // Step 3: Use AI to select the best components based on purpose, budget, and available products
            const selectedComponents = await this.selectOptimalComponents(
                purpose,
                budget,
                componentPriorities,
                availableProducts
            );

            return selectedComponents;
        } catch (error) {
            console.error('Error in AI PC Builder:', error);
            throw error;
        }
    }

    /**
     * Analyze user's purpose using AI to determine component priorities
     */
    async analyzePurpose(purpose, budget) {
        const prompt = `Bạn là chuyên gia tư vấn xây dựng cấu hình máy tính. Phân tích mục đích sử dụng và ngân sách để đưa ra độ ưu tiên cho từng linh kiện.

Mục đích: ${purpose}
Ngân sách: ${budget.toLocaleString()} VNĐ

Hãy đánh giá độ ưu tiên (từ 1-10) và % ngân sách nên phân bổ cho mỗi linh kiện:

Trả về JSON theo format:
{
  "cpu": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "mainboard": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "ram": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "vga": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "ssd": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "hdd": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "power": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "cooler": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "case": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "monitor": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "keyboard": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "mouse": { "priority": number, "budgetPercent": number, "requirements": "string" },
  "headset": { "priority": number, "budgetPercent": number, "requirements": "string" }
}

Chú ý:
- Tổng budgetPercent phải = 100
- priority cao = quan trọng hơn cho mục đích này
- requirements: mô tả ngắn gọn yêu cầu cụ thể (VD: "Intel i5/i7 hoặc AMD Ryzen 5/7")`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.7,
        });

        return JSON.parse(response.choices[0].message.content);
    }

    /**
     * Get available components from database grouped by type
     */
    async getAvailableComponents() {
        const componentTypes = {
            cpu: ['CPU', 'Bộ vi xử lý'],
            mainboard: ['Mainboard', 'Bo mạch chủ'],
            ram: ['RAM', 'Bộ nhớ'],
            vga: ['VGA', 'Card màn hình', 'Card đồ họa'],
            ssd: ['SSD', 'Ổ cứng SSD'],
            hdd: ['HDD', 'Ổ cứng HDD'],
            power: ['Nguồn', 'PSU', 'Nguồn máy tính'],
            cooler: ['Tản nhiệt', 'CPU Cooler'],
            case: ['Case', 'Vỏ case', 'Thùng máy'],
            monitor: ['Màn hình', 'Monitor'],
            keyboard: ['Bàn phím', 'Keyboard'],
            mouse: ['Chuột', 'Mouse'],
            headset: ['Tai nghe', 'Headset', 'Headphone']
        };

        const results = {};

        for (const [type, categoryNames] of Object.entries(componentTypes)) {
            try {
                // Search in both product and component tables
                const products = await modelProduct.findAll({
                    where: {
                        nameCategory: {
                            [Op.in]: categoryNames
                        },
                        stock: {
                            [Op.gt]: 0
                        }
                    },
                    attributes: ['id', 'name', 'price', 'stock', 'nameCategory', 'description'],
                    limit: 50,
                    order: [['price', 'ASC']]
                });

                results[type] = products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    stock: p.stock,
                    category: p.nameCategory,
                    description: p.description || ''
                }));
            } catch (error) {
                console.error(`Error fetching ${type}:`, error);
                results[type] = [];
            }
        }

        return results;
    }

    /**
     * Use AI to select optimal components based on requirements and available products
     */
    async selectOptimalComponents(purpose, budget, priorities, availableProducts) {
        const selectedComponents = {};

        // Process each component type
        for (const [type, priority] of Object.entries(priorities)) {
            if (!availableProducts[type] || availableProducts[type].length === 0) {
                continue;
            }

            const allocatedBudget = Math.floor(budget * (priority.budgetPercent / 100));
            const products = availableProducts[type];

            // Filter products within budget range (allow ±20% flexibility)
            const budgetMin = allocatedBudget * 0.5;
            const budgetMax = allocatedBudget * 1.2;
            const suitableProducts = products.filter(p => p.price >= budgetMin && p.price <= budgetMax);

            if (suitableProducts.length === 0) {
                // If no products in range, get closest ones
                const sorted = [...products].sort((a, b) =>
                    Math.abs(a.price - allocatedBudget) - Math.abs(b.price - allocatedBudget)
                );
                suitableProducts.push(sorted[0]);
            }

            // Use AI to select the best product
            const selected = await this.selectBestProduct(
                type,
                purpose,
                priority.requirements,
                allocatedBudget,
                suitableProducts.slice(0, 10) // Limit to top 10 to avoid token limits
            );

            if (selected) {
                selectedComponents[type] = selected;
            }
        }

        return selectedComponents;
    }

    /**
     * Use AI to select the best product from candidates
     */
    async selectBestProduct(componentType, purpose, requirements, budget, candidates) {
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        const productsInfo = candidates.map((p, idx) =>
            `${idx + 1}. ${p.name} - ${p.price.toLocaleString()}đ (Stock: ${p.stock})`
        ).join('\n');

        const prompt = `Bạn là chuyên gia phần cứng máy tính. Chọn sản phẩm TỐT NHẤT cho:

Loại linh kiện: ${componentType}
Mục đích sử dụng: ${purpose}
Yêu cầu: ${requirements}
Ngân sách dự kiến: ${budget.toLocaleString()}đ

Danh sách sản phẩm:
${productsInfo}

Hãy chọn 1 sản phẩm phù hợp nhất và trả về JSON:
{
  "selectedIndex": number (1-${candidates.length}),
  "reason": "lý do chọn ngắn gọn"
}`;

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.3,
            });

            const result = JSON.parse(response.choices[0].message.content);
            const selected = candidates[result.selectedIndex - 1];

            return {
                ...selected,
                aiReason: result.reason
            };
        } catch (error) {
            console.error('Error selecting product with AI:', error);
            // Fallback: return product closest to budget
            return candidates.reduce((best, current) =>
                Math.abs(current.price - budget) < Math.abs(best.price - budget) ? current : best
            );
        }
    }
}

module.exports = new AIPcBuilderService();
