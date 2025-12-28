const modelPayments = require('../models/payments.model');
const modelCart = require('../models/cart.model');

const modelUsers = require('../models/users.model');
const modelProducts = require('../models/products.model');
const emailService = require('../services/email.service');

const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');

const axios = require('axios');
const crypto = require('crypto');

const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const { log } = require('util');
const Typesense = require('typesense');

// Initialize Typesense client
const typesenseClient = new Typesense.Client({
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

function generatePayID() {
    // Tạo ID thanh toán bao gồm cả giây để tránh trùng lặp
    const now = new Date();
    const timestamp = now.getTime();
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    return `PAY${timestamp}${seconds}${milliseconds}`;
}

class PaymentsController {
    constructor() {
        // Bind methods to ensure proper 'this' context
        this.getOrderDetails = this.getOrderDetails.bind(this);
        this.syncOrderToTypesense = this.syncOrderToTypesense.bind(this);
        this.payments = this.payments.bind(this);
        this.checkPaymentMomo = this.checkPaymentMomo.bind(this);
        this.checkPaymentVnpay = this.checkPaymentVnpay.bind(this);
        this.getPayments = this.getPayments.bind(this);
        this.cancelOrder = this.cancelOrder.bind(this);
        this.getProductByIdPayment = this.getProductByIdPayment.bind(this);
        this.getOrderAdmin = this.getOrderAdmin.bind(this);
        this.updateOrderStatus = this.updateOrderStatus.bind(this);
    }

    // Helper method to get complete order information
    async getOrderDetails(idPayment, userId = null) {
        const whereClause = { idPayment };
        if (userId) {
            whereClause.userId = userId;
        }

        const payments = await modelPayments.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        if (!payments.length) {
            return null;
        }

        // Get order info from first payment record
        const firstPayment = payments[0];
        const user = await modelUsers.findOne({ where: { id: firstPayment.userId } });

        // Get product details for all items
        const productDetails = await Promise.all(
            payments.map(async (payment) => {
                const product = await modelProducts.findOne({
                    where: { id: payment.productId }
                });
                return {
                    id: payment.id,
                    productId: product?.id,
                    name: product?.name,
                    price: product?.price,
                    quantity: payment.quantity,
                    images: product?.images,
                    color: product?.color,
                    size: product?.size
                };
            })
        );

        return {
            orderId: firstPayment.idPayment,
            userId: firstPayment.userId,
            fullName: firstPayment.fullName || user?.fullName,
            phone: firstPayment.phone || user?.phone,
            address: firstPayment.address || user?.address,
            totalPrice: firstPayment.totalPrice,
            status: firstPayment.status,
            typePayment: firstPayment.typePayment,
            createdAt: firstPayment.createdAt,
            updatedAt: firstPayment.updatedAt,
            products: productDetails
        };
    }

    // Method to sync order data to Typesense
    async syncOrderToTypesense(orderDetails, operation = 'upsert') {
        try {
            if (!orderDetails) return;

            const orderDocument = {
                id: orderDetails.orderId,
                order_id: orderDetails.orderId,
                user_id: orderDetails.userId.toString(),
                full_name: orderDetails.fullName || '',
                phone: orderDetails.phone || '',
                address: orderDetails.address || '',
                total_price: orderDetails.totalPrice || 0,
                status: orderDetails.status || 'pending',
                payment_type: orderDetails.typePayment || '',
                created_at: Math.floor(new Date(orderDetails.createdAt).getTime() / 1000),
                updated_at: Math.floor(new Date(orderDetails.updatedAt || orderDetails.createdAt).getTime() / 1000),
                product_count: orderDetails.products?.length || 0,
                product_names: orderDetails.products?.map(p => p.name).filter(Boolean) || [],
                product_ids: orderDetails.products?.map(p => p.productId?.toString()).filter(Boolean) || [],
                total_quantity: orderDetails.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0
            };

            if (operation === 'delete') {
                await typesenseClient.collections('orders').documents(orderDetails.orderId).delete();
                console.log(`Order ${orderDetails.orderId} deleted from Typesense`);
            } else {
                await typesenseClient.collections('orders').documents().upsert(orderDocument);
                console.log(`Order ${orderDetails.orderId} synced to Typesense`);
            }
        } catch (error) {
            console.error('Error syncing order to Typesense:', error);
            // Don't throw error to prevent breaking the main flow
        }
    }

    async payments(req, res) {
        const { id } = req.user;
        const { typePayment } = req.body;
        const findCart = await modelCart.findAll({ where: { userId: id } });
        if (!findCart[0].address || !findCart[0].phone || !findCart[0].fullName) {
            throw new BadRequestError('Vui lòng nhập thống tin giỏ hàng');
        }

        const totalPrice = findCart.reduce((total, item) => total + item.totalPrice, 0);
        // Tạo mã thanh toán mới cho mỗi yêu cầu thanh toán
        const paymentId = generatePayID();

        if (typePayment === 'COD') {
            const dataCart = await modelCart.findAll({
                where: { userId: id },
            });

            // Kiểm tra stock trước khi thanh toán
            for (const cartItem of dataCart) {
                const product = await modelProducts.findOne({ where: { id: cartItem.productId } });
                if (!product) {
                    throw new BadRequestError(`Sản phẩm ID ${cartItem.productId} không tồn tại`);
                }
                if (product.stock < cartItem.quantity) {
                    throw new BadRequestError(
                        `Sản phẩm "${product.name}" chỉ còn ${product.stock} trong kho, không đủ cho yêu cầu ${cartItem.quantity}`,
                    );
                }
            }

            // Tạo payment records
            const paymentPromises = dataCart.map((cartItem) => {
                return modelPayments.create({
                    userId: id,
                    productId: cartItem.productId,
                    quantity: cartItem.quantity,
                    fullName: cartItem.fullName,
                    phone: cartItem.phone,
                    address: cartItem.address,
                    totalPrice: totalPrice,
                    status: 'pending',
                    typePayment: typePayment,
                    idPayment: paymentId,
                });
            });

            // Trừ stock cho từng sản phẩm
            const stockUpdatePromises = dataCart.map(async (cartItem) => {
                const product = await modelProducts.findOne({ where: { id: cartItem.productId } });
                const newStock = product.stock - cartItem.quantity;
                await modelProducts.update({ stock: newStock }, { where: { id: cartItem.productId } });
                console.log(
                    `✅ COD Payment: Reduced stock for ${product.name} by ${cartItem.quantity}. New stock: ${newStock}`,
                );
            });

            await Promise.all([...paymentPromises, ...stockUpdatePromises]);

            // Clear the cart after successful payment creation
            await modelCart.destroy({ where: { userId: id } });

            // Get complete order information
            const orderDetails = await this.getOrderDetails(paymentId, id);

            // Sync order to Typesense
            // await this.syncOrderToTypesense(orderDetails, 'upsert');

            // Send order confirmation email
            const user = await modelUsers.findOne({ where: { id } });
            if (user && user.email) {
                await emailService.sendOrderConfirmation(user.email, orderDetails);
            }

            new OK({
                message: 'Thanh toán thành công',
                metadata: paymentId
            }).send(res);
        }

        if (typePayment === 'MOMO') {
            var partnerCode = 'MOMO';
            var accessKey = process.env.MOMO_ACCESS_KEY;
            var secretkey = process.env.MOMO_SECRET_KEY;
            var requestId = partnerCode + new Date().getTime();
            var orderId = requestId;
            var orderInfo = `Thanh toán ${findCart[0]?.userId}`; // nội dung giao dịch thanh toán
            var redirectUrl = 'http://localhost:3000/api/check-payment-momo'; // 8080
            var ipnUrl = 'http://localhost:3000/api/check-payment-momo';
            var amount = totalPrice;
            var requestType = 'captureWallet';
            var extraData = ''; //pass empty value if your merchant does not have stores

            var rawSignature =
                'accessKey=' +
                accessKey +
                '&amount=' +
                amount +
                '&extraData=' +
                extraData +
                '&ipnUrl=' +
                ipnUrl +
                '&orderId=' +
                orderId +
                '&orderInfo=' +
                orderInfo +
                '&partnerCode=' +
                partnerCode +
                '&redirectUrl=' +
                redirectUrl +
                '&requestId=' +
                requestId +
                '&requestType=' +
                requestType;
            //puts raw signature

            //signature
            var signature = crypto.createHmac('sha256', secretkey).update(rawSignature).digest('hex');

            //json object send to MoMo endpoint
            const requestBody = JSON.stringify({
                partnerCode: partnerCode,
                accessKey: accessKey,
                requestId: requestId,
                amount: amount,
                orderId: orderId,
                orderInfo: orderInfo,
                redirectUrl: redirectUrl,
                ipnUrl: ipnUrl,
                extraData: extraData,
                requestType: requestType,
                signature: signature,
                lang: 'en',
            });

            const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return new OK({ message: 'Thanh toán thông báo', metadata: response.data }).send(res);
        }

        if (typePayment === 'VNPAY') {
            const vnpay = new VNPay({
                tmnCode: process.env.VNPAY_TMN_CODE,
                secureSecret: process.env.VNPAY_SECURE_SECRET,
                vnpayHost: 'https://sandbox.vnpayment.vn',
                testMode: true, // tùy chọn
                hashAlgorithm: 'SHA512', // tùy chọn
                loggerFn: ignoreLogger, // tùy chọn
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const vnpayResponse = vnpay.buildPaymentUrl({
                vnp_Amount: totalPrice,
                vnp_IpAddr: '127.0.0.1', //
                //vnp_TxnRef: `${findCart[0]?.userId} + ${paymentId}`, // Sử dụng paymentId thay vì singlePaymentId
                vnp_TxnRef: `${findCart[0]?.userId}_${paymentId}`,
                vnp_OrderInfo: `${findCart[0]?.userId} `,
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: `http://localhost:3000/api/check-payment-vnpay`, //
                vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
                vnp_CreateDate: dateFormat(new Date()), // tùy chọn, mặc định là hiện tại
                vnp_ExpireDate: dateFormat(tomorrow), // tùy chọn
            });
            return new OK({ message: 'Thanh toán thông báo', metadata: vnpayResponse }).send(res);
        }

        throw new BadRequestError('Phương thức thanh toán không hợp lệ');
    }

    async checkPaymentMomo(req, res, next) {
        const { orderInfo, resultCode } = req.query;

        if (resultCode === '0') {
            const result = orderInfo.split(' ')[2];
            const findCart = await modelCart.findAll({ userId: result });
            const paymentId = generatePayID();

            // Kiểm tra và trừ stock cho từng sản phẩm
            const paymentPromises = findCart.map(async (item) => {
                // Kiểm tra stock trước khi tạo payment
                const product = await modelProducts.findOne({ where: { id: item.productId } });
                if (!product) {
                    throw new Error(`Sản phẩm ID ${item.productId} không tồn tại`);
                }
                if (product.stock < item.quantity) {
                    throw new Error(`Sản phẩm "${product.name}" không đủ hàng`);
                }

                // Trừ stock
                const newStock = product.stock - item.quantity;
                await modelProducts.update({ stock: newStock }, { where: { id: item.productId } });
                console.log(
                    `✅ MOMO Payment: Reduced stock for ${product.name} by ${item.quantity}. New stock: ${newStock}`,
                );
                return modelPayments.create({
                    userId: item.userId,
                    productId: item.productId,
                    quantity: item.quantity,
                    fullName: item.fullName,
                    phone: item.phone,
                    address: item.address,
                    totalPrice: findCart.reduce((total, item) => total + item.totalPrice, 0),
                    status: 'pending',
                    typePayment: 'MOMO',
                    idPayment: paymentId,
                });
            });

            await Promise.all(paymentPromises);
            await modelCart.destroy({ where: { userId: result } });

            // Get order details and sync to Typesense
            const orderDetails = await this.getOrderDetails(paymentId, result);
            // await this.syncOrderToTypesense(orderDetails, 'upsert');

            // Send order confirmation email
            const user = await modelUsers.findOne({ where: { id: result } });
            if (user && user.email) {
                await emailService.sendOrderConfirmation(user.email, orderDetails);
            }

            // Store order details in session or pass via query params
            return res.redirect(`http://localhost:5173/payment/${paymentId}?status=success&type=MOMO`);

        }
    }

    async checkPaymentVnpay(req, res) {
        const { vnp_ResponseCode, vnp_OrderInfo } = req.query;
        if (vnp_ResponseCode === '00') {
            const idCart = vnp_OrderInfo.split(' ')[0];
            const paymentId = generatePayID();
            const findCart = await modelCart.findAll({ userId: idCart });

            // Kiểm tra và trừ stock cho từng sản phẩm
            const paymentPromises = findCart.map(async (item) => {
                // Kiểm tra stock trước khi tạo payment
                const product = await modelProducts.findOne({ where: { id: item.productId } });
                if (!product) {
                    throw new Error(`Sản phẩm ID ${item.productId} không tồn tại`);
                }
                if (product.stock < item.quantity) {
                    throw new Error(`Sản phẩm "${product.name}" không đủ hàng`);
                }

                // Trừ stock
                const newStock = product.stock - item.quantity;
                await modelProducts.update({ stock: newStock }, { where: { id: item.productId } });
                console.log(
                    `✅ VNPAY Payment: Reduced stock for ${product.name} by ${item.quantity}. New stock: ${newStock}`,
                );

                return modelPayments.create({
                    userId: item.userId,
                    productId: item.productId,
                    quantity: item.quantity,
                    fullName: item.fullName,
                    phone: item.phone,
                    address: item.address,
                    totalPrice: findCart.reduce((total, item) => total + item.totalPrice, 0),
                    status: 'pending',
                    typePayment: 'VNPAY',
                    idPayment: paymentId,
                });
            });

            await Promise.all(paymentPromises);
            await modelCart.destroy({ where: { userId: idCart } });

            // Get order details and sync to Typesense
            const orderDetails = await this.getOrderDetails(paymentId, idCart);
            // await this.syncOrderToTypesense(orderDetails, 'upsert');

            // Send order confirmation email
            const user = await modelUsers.findOne({ where: { id: idCart } });
            if (user && user.email) {
                await emailService.sendOrderConfirmation(user.email, orderDetails);
            }

            // Store order details in session or pass via query params
            return res.redirect(`http://localhost:5173/payment/${paymentId}?status=success&type=VNPAY`);
        }
    }

    async getPayments(req, res) {
        const { id } = req.user;
        const payments = await modelPayments.findAll({ where: { userId: id }, order: [['createdAt', 'DESC']] });

        // Tạo map để gom nhóm theo idPayment
        const paymentGroups = new Map();

        // Gom nhóm payments theo idPayment
        for (const payment of payments) {
            const product = await modelProducts.findOne({ where: { id: payment.productId } });

            if (!paymentGroups.has(payment.idPayment)) {
                paymentGroups.set(payment.idPayment, {
                    orderId: payment.idPayment,
                    orderDate: payment.createdAt,
                    totalAmount: payment.totalPrice,
                    status: payment.status,
                    typePayment: payment.typePayment,
                    products: [],
                });
            }

            const group = paymentGroups.get(payment.idPayment);
            group.products.push({
                id: payment.id,
                quantity: payment.quantity,
                product: product,
                images: product.images,
            });
        }

        // Chuyển Map thành array để trả về
        const data = Array.from(paymentGroups.values());

        new OK({
            message: 'Get payments successfully',
            metadata: data,
        }).send(res);
    }

    async cancelOrder(req, res) {
        const { id } = req.user;
        const { orderId } = req.body;

        // Lấy thông tin payments trước khi cập nhật
        const payments = await modelPayments.findAll({ where: { userId: id, idPayment: orderId } });

        if (!payments.length) {
            throw new BadRequestError('Không tìm thấy đơn hàng');
        }

        // Kiểm tra xem đơn hàng có thể hủy không
        const firstPayment = payments[0];
        if (firstPayment.status !== 'pending') {
            throw new BadRequestError('Chỉ có thể hủy đơn hàng đang chờ xử lý');
        }

        // Không cho phép hủy đơn hàng đã thanh toán online
        if (firstPayment.typePayment === 'MOMO' || firstPayment.typePayment === 'VNPAY') {
            throw new BadRequestError('Không thể hủy đơn hàng đã thanh toán online');
        }

        // Hoàn lại stock cho từng sản phẩm (chỉ COD mới hoàn lại vì đã trừ stock khi đặt hàng)
        if (firstPayment.typePayment === 'COD') {
            const stockUpdatePromises = payments.map(async (payment) => {
                const product = await modelProducts.findOne({ where: { id: payment.productId } });

                if (product) {
                    const newStock = product.stock + payment.quantity;
                    await modelProducts.update({ stock: newStock }, { where: { id: payment.productId } });
                    console.log(
                        `✅ Restored ${payment.quantity} units to product ${product.name}. New stock: ${newStock}`,
                    );
                }
            });
            await Promise.all(stockUpdatePromises);
        }

        // Cập nhật trạng thái đơn hàng
        const statusUpdatePromises = payments.map(async (payment) => {
            payment.status = 'cancelled';
            await payment.save();
        });

        await Promise.all(statusUpdatePromises);

        // Get updated order information
        const orderDetails = await this.getOrderDetails(orderId, id);

        // Sync updated order to Typesense
        // await this.syncOrderToTypesense(orderDetails, 'upsert');

        new OK({
            message: 'Hủy đơn hàng thành công',
            metadata: {
                order: orderDetails
            }
        }).send(res);
    }

    async getProductByIdPayment(req, res) {
        const { id } = req.user;
        const { idPayment } = req.query;
        console.log(idPayment);

        // Lấy thông tin payment bao gồm cả thông tin giao hàng
        const payments = await modelPayments.findAll({
            where: { userId: id, idPayment },
        });

        if (!payments.length) {
            throw new BadRequestError('Không tìm thấy đơn hàng');
        }

        // Lấy thông tin chung của đơn hàng từ payment đầu tiên
        const orderInfo = {
            fullName: payments[0].fullName,
            phone: payments[0].phone,
            address: payments[0].address,
            typePayment: payments[0].typePayment,
            totalPrice: payments[0].totalPrice,
            status: payments[0].status,
            createdAt: payments[0].createdAt,
            products: [],
        };

        // Lấy thông tin chi tiết từng sản phẩm
        const productDetails = await Promise.all(
            payments.map(async (payment) => {
                const product = await modelProducts.findOne({
                    where: { id: payment.productId },
                });
                return {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: payment.quantity,
                    images: product.images,
                };
            }),
        );

        orderInfo.products = productDetails;

        new OK({
            message: 'Get order details successfully',
            metadata: orderInfo,
        }).send(res);
    }

    async getOrderAdmin(req, res) {
        try {
            // Lấy tất cả đơn hàng
            const orders = await modelPayments.findAll({
                order: [['createdAt', 'DESC']],
            });

            // Gom nhóm đơn hàng theo idPayment
            const groupedOrders = {};

            // Xử lý và gom nhóm đơn hàng
            for (const order of orders) {
                const orderData = order.get({ plain: true });
                const product = await modelProducts.findOne({
                    where: { id: orderData.productId },
                });

                if (!groupedOrders[orderData.idPayment]) {
                    const user = await modelUsers.findOne({
                        where: { id: orderData.userId },
                    });

                    groupedOrders[orderData.idPayment] = {
                        id: orderData.id,
                        idPayment: orderData.idPayment,
                        userId: orderData.userId,
                        fullName: orderData.fullName || user?.fullName,
                        phone: orderData.phone || user?.phone,
                        address: orderData.address || user?.address,
                        totalPrice: orderData.totalPrice,
                        status: orderData.status,
                        typePayment: orderData.typePayment,
                        createdAt: orderData.createdAt,
                        products: [],
                    };
                }

                if (product) {
                    groupedOrders[orderData.idPayment].products.push({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.images,
                        color: product.color,
                        size: product.size,
                        quantity: orderData.quantity,
                    });
                }
            }

            // Chuyển đổi object thành array để trả về
            const formattedOrders = Object.values(groupedOrders);

            new OK({
                message: 'Lấy danh sách đơn hàng thành công',
                metadata: formattedOrders,
            }).send(res);
        } catch (error) {
            console.error('Error in getOrderAdmin:', error);
            throw new BadRequestError('Lỗi khi lấy danh sách đơn hàng');
        }
    }

    async updateOrderStatus(req, res) {
        try {
            const { orderId, status } = req.body;

            // Kiểm tra trạng thái hợp lệ
            const validStatuses = ['pending', 'completed', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                throw new BadRequestError('Trạng thái không hợp lệ');
            }

            // Cập nhật tất cả đơn hàng có cùng idPayment
            const order = await modelPayments.findOne({
                where: { id: orderId },
            });

            if (!order) {
                throw new BadRequestError('Không tìm thấy đơn hàng');
            }

            // Cập nhật trạng thái cho tất cả đơn hàng có cùng idPayment
            await modelPayments.update({ status }, { where: { idPayment: order.idPayment } });

            // Get updated order information
            const orderDetails = await this.getOrderDetails(order.idPayment);

            // Sync updated order to Typesense
            // await this.syncOrderToTypesense(orderDetails, 'upsert');

            // Send order status update email
            const user = await modelUsers.findOne({ where: { id: orderDetails.userId } });
            if (user && user.email) {
                await emailService.sendOrderStatusUpdate(user.email, orderDetails);
            }

            new OK({
                message: 'Cập nhật trạng thái đơn hàng thành công',
                metadata: {
                    order: orderDetails
                }
            }).send(res);
        } catch (error) {
            console.error('Error in updateOrderStatus:', error);
            throw new BadRequestError('Lỗi khi cập nhật trạng thái đơn hàng');
        }
    }
}

module.exports = new PaymentsController();
