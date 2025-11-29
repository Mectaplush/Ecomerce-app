const modelPayments = require('../models/payments.model');
const modelCart = require('../models/cart.model');

const modelUsers = require('../models/users.model');
const modelProducts = require('../models/products.model');

const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');

const axios = require('axios');
const crypto = require('crypto');

const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const { log } = require('util');

function generatePayID() {
    // Tạo ID thanh toán bao gồm cả giây để tránh trùng lặp
    const now = new Date();
    const timestamp = now.getTime();
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    return `PAY${timestamp}${seconds}${milliseconds}`;
}

class PaymentsController {
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
                    idPayment: paymentId, // Sử dụng paymentId thay vì singlePaymentId
                });
            });

            await Promise.all(paymentPromises);

            // Clear the cart after successful payment creation
            await modelCart.destroy({ where: { userId: id } });

            new OK({ message: 'Thanh toán thanh cong', metadata: paymentId }).send(res);
        }

        if (typePayment === 'MOMO') {
            var partnerCode = 'MOMO';
            var accessKey = 'F8BBA842ECF85';
            var secretkey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
            var requestId = partnerCode + new Date().getTime();
            var orderId = requestId;
            var orderInfo = `thanh toan ${findCart[0]?.userId}`; // nội dung giao dịch thanh toán
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
            new OK({ message: 'Thanh toán thông báo', metadata: response.data }).send(res);
        }

        if (typePayment === 'VNPAY') {
            const vnpay = new VNPay({
                tmnCode: 'DH2F13SW',
                secureSecret: 'NXZM3DWFR0LC4R5VBK85OJZS1UE9KI6F',
                vnpayHost: 'https://sandbox.vnpayment.vn',
                testMode: true, // tùy chọn
                hashAlgorithm: 'SHA512', // tùy chọn
                loggerFn: ignoreLogger, // tùy chọn
            });
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const vnpayResponse = await vnpay.buildPaymentUrl({
                vnp_Amount: totalPrice, //
                vnp_IpAddr: '127.0.0.1', //
                vnp_TxnRef: `${findCart[0]?.userId} + ${paymentId}`, // Sử dụng paymentId thay vì singlePaymentId
                vnp_OrderInfo: `${findCart[0]?.userId} `,
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: `http://localhost:3000/api/check-payment-vnpay`, //
                vnp_Locale: VnpLocale.VN, // 'vn' hoặc 'en'
                vnp_CreateDate: dateFormat(new Date()), // tùy chọn, mặc định là hiện tại
                vnp_ExpireDate: dateFormat(tomorrow), // tùy chọn
            });
            new OK({ message: 'Thanh toán thông báo', metadata: vnpayResponse }).send(res);
        }

        throw new BadRequestError('Phương thức thanh toán không hợp lệ');
    }

    async checkPaymentMomo(req, res, next) {
        const { orderInfo, resultCode } = req.query;

        if (resultCode === '0') {
            const result = orderInfo.split(' ')[2];
            const findCart = await modelCart.findAll({ userId: result });
            // Tạo mã thanh toán mới cho mỗi thanh toán Momo
            const paymentId = generatePayID();

            findCart.map(async (item) => {
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
                    idPayment: paymentId, // Sử dụng paymentId mới
                });
            });

            await modelCart.destroy({ where: { userId: result } });
            return res.redirect(`http://localhost:5173/payment/${paymentId}`);
        }
    }

    async checkPaymentVnpay(req, res) {
        const { vnp_ResponseCode, vnp_OrderInfo } = req.query;
        if (vnp_ResponseCode === '00') {
            const idCart = vnp_OrderInfo.split(' ')[0];
            const paymentId = generatePayID();
            const findCart = await modelCart.findAll({ userId: idCart });
            findCart.map(async (item) => {
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

            await modelCart.destroy({ where: { userId: idCart } });
            return res.redirect(`http://localhost:5173/payment/${paymentId}`);
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
        const payment = await modelPayments.findAll({ where: { userId: id, idPayment: orderId } });
        payment.map(async (item) => {
            item.status = 'cancelled';
            await item.save();
        });
        new OK({ message: 'Hủy đơn hàng thành công' }).send(res);
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

            new OK({
                message: 'Cập nhật trạng thái đơn hàng thành công',
            }).send(res);
        } catch (error) {
            console.error('Error in updateOrderStatus:', error);
            throw new BadRequestError('Lỗi khi cập nhật trạng thái đơn hàng');
        }
    }
}

module.exports = new PaymentsController();
