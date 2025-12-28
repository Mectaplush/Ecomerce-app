const postmark = require('postmark');

class EmailService {
    constructor() {
        // Initialize Postmark client
        this.client = new postmark.ServerClient(process.env.POSTMARK_SERVER_TOKEN);
        this.fromEmail = process.env.POSTMARK_FROM_EMAIL || 'noreply@yourstore.com';
        this.frontendUrl = process.env.CLIENT_BASE_URL || 'http://localhost:5173';
    }

    /**
     * Format currency to VND
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
        }).format(amount);
    }

    /**
     * Generate HTML email for order confirmation
     */
    generateOrderConfirmationHTML(orderDetails) {
        const productsHTML = orderDetails.products
            .map(
                (product) => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">
                    ${product.name}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
                    ${product.quantity}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${this.formatCurrency(product.price)}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
                    ${this.formatCurrency(product.price * product.quantity)}
                </td>
            </tr>
        `,
            )
            .join('');

        const paymentMethodText = {
            COD: 'Thanh toán khi nhận hàng (COD)',
            MOMO: 'Ví điện tử MoMo',
            VNPAY: 'VNPay',
        };

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Xác nhận đơn hàng</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <h1 style="color: #28a745; margin: 0;">Cảm ơn bạn đã đặt hàng!</h1>
                </div>
                
                <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Thông tin đơn hàng</h2>
                    <p><strong>Mã đơn hàng:</strong> ${orderDetails.orderId}</p>
                    <p><strong>Ngày đặt hàng:</strong> ${new Date(orderDetails.createdAt).toLocaleString('vi-VN')}</p>
                    <p><strong>Phương thức thanh toán:</strong> ${paymentMethodText[orderDetails.typePayment] || orderDetails.typePayment}</p>
                    <p><strong>Trạng thái:</strong> <span style="color: #ffc107;">Đang chờ xử lý</span></p>
                </div>

                <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Thông tin giao hàng</h2>
                    <p><strong>Người nhận:</strong> ${orderDetails.fullName}</p>
                    <p><strong>Số điện thoại:</strong> ${orderDetails.phone}</p>
                    <p><strong>Địa chỉ:</strong> ${orderDetails.address}</p>
                </div>

                <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 20px;">
                    <h2 style="color: #333; border-bottom: 2px solid #28a745; padding-bottom: 10px;">Chi tiết sản phẩm</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f8f9fa;">
                                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Sản phẩm</th>
                                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Số lượng</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Đơn giá</th>
                                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productsHTML}
                        </tbody>
                        <tfoot>
                            <tr style="background-color: #f8f9fa; font-weight: bold;">
                                <td colspan="3" style="padding: 15px; text-align: right; border-top: 2px solid #28a745;">
                                    Tổng cộng:
                                </td>
                                <td style="padding: 15px; text-align: right; color: #28a745; font-size: 18px; border-top: 2px solid #28a745;">
                                    ${this.formatCurrency(orderDetails.totalPrice)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                        <strong>Lưu ý:</strong> Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ với bạn sớm nhất để xác nhận và giao hàng.
                    </p>
                </div>

                <div style="text-align: center; margin-bottom: 20px;">
                    <a href="${this.frontendUrl}/user/order/${orderDetails.orderId}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Xem đơn hàng</a>
                    <a href="${this.frontendUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Tiếp tục mua sắm</a>
                </div>

                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                    <p>Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi!</p>
                    <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Send order confirmation email
     * @param {string} customerEmail - Customer's email address
     * @param {Object} orderDetails - Order details object
     */
    async sendOrderConfirmation(customerEmail, orderDetails) {
        try {
            const htmlBody = this.generateOrderConfirmationHTML(orderDetails);

            const result = await this.client.sendEmail({
                From: this.fromEmail,
                To: customerEmail,
                Subject: `Xác nhận đơn hàng #${orderDetails.orderId}`,
                HtmlBody: htmlBody,
                TextBody: `Cảm ơn bạn đã đặt hàng! Mã đơn hàng: ${orderDetails.orderId}. Tổng tiền: ${this.formatCurrency(orderDetails.totalPrice)}`,
                MessageStream: 'outbound',
            });

            console.log(`✅ Order confirmation email sent to ${customerEmail} for order ${orderDetails.orderId}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send order confirmation email:', error);
            // Don't throw error to prevent breaking the order flow
            // Just log it for monitoring
            return null;
        }
    }

    /**
     * Send order status update email
     * @param {string} customerEmail - Customer's email address
     * @param {Object} orderDetails - Order details object
     */
    async sendOrderStatusUpdate(customerEmail, orderDetails) {
        try {
            const statusText = {
                pending: 'Đang chờ xử lý',
                completed: 'Đã hoàn thành',
                delivered: 'Đã giao hàng',
                cancelled: 'Đã hủy',
            };

            const statusColor = {
                pending: '#ffc107',
                completed: '#28a745',
                delivered: '#17a2b8',
                cancelled: '#dc3545',
            };

            const htmlBody = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Cập nhật trạng thái đơn hàng</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                        <h1 style="color: ${statusColor[orderDetails.status]}; margin: 0;">Cập nhật đơn hàng</h1>
                    </div>
                    
                    <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                        <p>Xin chào <strong>${orderDetails.fullName}</strong>,</p>
                        <p>Trạng thái đơn hàng <strong>#${orderDetails.orderId}</strong> của bạn đã được cập nhật:</p>
                        <p style="font-size: 20px; color: ${statusColor[orderDetails.status]}; font-weight: bold; text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                            ${statusText[orderDetails.status] || orderDetails.status}
                        </p>
                        <p>Tổng giá trị đơn hàng: <strong>${this.formatCurrency(orderDetails.totalPrice)}</strong></p>
                    </div>

                    <div style="text-align: center; margin: 20px 0;">
                        <a href="${this.frontendUrl}/user/order/${orderDetails.orderId}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Xem chi tiết đơn hàng</a>
                        <a href="${this.frontendUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ghé thăm cửa hàng</a>
                    </div>

                    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #ddd; margin-top: 20px; color: #666; font-size: 12px;">
                        <p>Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi!</p>
                    </div>
                </body>
                </html>
            `;

            const result = await this.client.sendEmail({
                From: this.fromEmail,
                To: customerEmail,
                Subject: `Cập nhật đơn hàng #${orderDetails.orderId} - ${statusText[orderDetails.status]}`,
                HtmlBody: htmlBody,
                TextBody: `Đơn hàng #${orderDetails.orderId} của bạn đã được cập nhật: ${statusText[orderDetails.status]}`,
                MessageStream: 'outbound',
            });

            console.log(`✅ Order status update email sent to ${customerEmail} for order ${orderDetails.orderId}`);
            return result;
        } catch (error) {
            console.error('❌ Failed to send order status update email:', error);
            return null;
        }
    }
}

module.exports = new EmailService();
