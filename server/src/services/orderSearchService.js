// services/orderSearchService.js
const paymentsModel = require('../models/payments.model');
const productsModel = require('../models/products.model');
const { Sequelize } = require('sequelize');

class OrderSearchService {
    /**
     * Search orders for a specific user based on query
     * @param {string} query - User's search query
     * @param {string} userId - User ID to filter orders
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of order results
     */
    async searchOrders(query, userId, limit = 10) {
        try {
            if (!userId) {
                console.warn('No user ID provided for order search');
                return [];
            }

            const lowerQuery = query.toLowerCase();

            // Build search conditions based on query content
            const searchConditions = {
                userId: userId // Always filter by user ID for security
            };

            // console.log("UserId: ", userId);

            // Detect order status queries
            if (lowerQuery.includes('pending') || lowerQuery.includes('chờ')) {
                searchConditions.status = 'pending';
            } else if (lowerQuery.includes('completed') || lowerQuery.includes('hoàn thành')) {
                searchConditions.status = 'completed';
            } else if (lowerQuery.includes('delivered') || lowerQuery.includes('giao hàng') || lowerQuery.includes('đã giao')) {
                searchConditions.status = 'delivered';
            } else if (lowerQuery.includes('cancelled') || lowerQuery.includes('hủy')) {
                searchConditions.status = 'cancelled';
            }

            // Detect payment method queries
            if (lowerQuery.includes('cod') || lowerQuery.includes('tiền mặt')) {
                searchConditions.typePayment = { [Sequelize.Op.iLike]: '%cod%' };
            } else if (lowerQuery.includes('card') || lowerQuery.includes('thẻ') || lowerQuery.includes('visa')) {
                searchConditions.typePayment = { [Sequelize.Op.iLike]: '%card%' };
            } else if (lowerQuery.includes('momo') || lowerQuery.includes('banking')) {
                searchConditions.typePayment = { [Sequelize.Op.iLike]: `%${lowerQuery.includes('momo') ? 'momo' : 'banking'}%` };
            }

            // Search for orders with product information
            const orders = await paymentsModel.findAll({
                where: searchConditions,
                include: [{
                    model: productsModel,
                    required: false,
                    attributes: ['id', 'name', 'price', 'componentType']
                }],
                order: [['createdAt', 'DESC']],
                limit: limit
            });

            // console.log("Strict: ", orders);

            // If no orders found with specific conditions, try broader search
            if (orders.length === 0 && Object.keys(searchConditions).length > 1) {
                const broadOrders = await paymentsModel.findAll({
                    where: { userId: userId },
                    include: [{
                        model: productsModel,
                        required: false,
                        attributes: ['id', 'name', 'price', 'componentType']
                    }],
                    order: [['createdAt', 'DESC']],
                    limit: limit
                });

                //console.log("Broad: ", broadOrders);

                // Filter based on text search in product names or order details
                return this.filterOrdersByText(broadOrders, query);
            }

            let result = orders.map(order => this.formatOrderResult(order));
            // console.log("Map Strict: ", result);
            return result;

        } catch (error) {
            console.error('Error searching orders:', error);
            return [];
        }
    }

    /**
     * Filter orders by text content in product names or order details
     */
    filterOrdersByText(orders, query) {
        const lowerQuery = query.toLowerCase();

        return orders
            .filter(order => {
                const orderText = [
                    order.idPayment,
                    order.fullName,
                    order.phone,
                    order.address,
                    order.status,
                    order.typePayment,
                    order.product?.name || ''
                ].join(' ').toLowerCase();

                return orderText.includes(lowerQuery) ||
                    lowerQuery.split(' ').some(term => orderText.includes(term));
            })
            .slice(0, 10)
            .map(order => this.formatOrderResult(order));
    }

    /**
     * Format order data for chatbot consumption
     */
    formatOrderResult(order) {
        const orderData = order.toJSON ? order.toJSON() : order;

        return {
            orderId: orderData.idPayment,
            productName: orderData.product?.name || 'Sản phẩm không xác định',
            quantity: orderData.quantity,
            totalPrice: orderData.totalPrice,
            status: this.translateStatus(orderData.status),
            paymentType: orderData.typePayment,
            fullName: orderData.fullName,
            phone: orderData.phone,
            address: orderData.address,
            createdAt: orderData.createdAt,
            updatedAt: orderData.updatedAt
        };
    }

    /**
     * Translate status to Vietnamese
     */
    translateStatus(status) {
        const statusMap = {
            'pending': 'Đang xử lý',
            'completed': 'Hoàn thành',
            'delivered': 'Đã giao hàng',
            'cancelled': 'Đã hủy'
        };
        return statusMap[status] || status;
    }

    /**
     * Get order statistics for a user
     */
    async getOrderStats(userId) {
        try {
            if (!userId) return null;

            const stats = await paymentsModel.findAll({
                where: { userId: userId },
                attributes: [
                    'status',
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                    [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalValue']
                ],
                group: ['status']
            });

            const totalOrders = await paymentsModel.count({ where: { userId: userId } });
            const totalValue = await paymentsModel.sum('totalPrice', { where: { userId: userId } });

            return {
                totalOrders,
                totalValue: totalValue || 0,
                statusBreakdown: stats.map(stat => ({
                    status: this.translateStatus(stat.dataValues.status),
                    count: parseInt(stat.dataValues.count),
                    totalValue: parseInt(stat.dataValues.totalValue) || 0
                }))
            };
        } catch (error) {
            console.error('Error getting order stats:', error);
            return null;
        }
    }
}

module.exports = new OrderSearchService();
