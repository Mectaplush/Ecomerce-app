const modelCart = require('../models/cart.model');

const modelProduct = require('../models/products.model');
const modelProductComponent = require('../models/products.model');
const buildPcCart = require('../models/buildPcCart.model');
const { BadRequestError } = require('../core/error.response');
const { Created, OK } = require('../core/success.response');

class controllerCart {
    async addToCart(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        if (!id || !productId) {
            throw new BadRequestError('Missing required fields');
        }

        // Kiểm tra sản phẩm đã tồn tại trong giỏ hàng chưa
        const existingCartItem = await modelCart.findOne({
            where: { userId: id, productId },
        });

        let product = await modelProduct.findOne({ where: { id: productId } });
        let isComponent = false;

        if (!product) {
            product = await modelProductComponent.findOne({ where: { id: productId } });
            isComponent = true;
        }

        if (!product) {
            throw new BadRequestError('Không tìm thấy sản phẩm');
        }

        if (product?.stock < quantity) {
            throw new BadRequestError('Số lượng trong kho không đủ');
        }

        // Tính toán số lượng mới
        const newQuantity = existingCartItem ? existingCartItem.quantity + quantity : quantity;

        // Kiểm tra số lượng có đủ hay không (so với stock hiện tại)
        if (newQuantity > product.stock) {
            throw new BadRequestError(
                `Số lượng yêu cầu (${newQuantity}) vượt quá số lượng có trong kho (${product.stock})`,
            );
        }

        let totalPrice = 0;
        if (!isComponent) {
            if (product?.discount > 0) {
                totalPrice = product.price * (1 - product?.discount / 100) * newQuantity;
            } else {
                totalPrice = product.price * newQuantity;
            }
        } else {
            totalPrice = product.price * newQuantity;
        }

        let cart;
        if (existingCartItem) {
            // Cập nhật số lượng và tổng giá nếu sản phẩm đã tồn tại
            cart = await existingCartItem.update({
                quantity: newQuantity,
                totalPrice,
            });
        } else {
            // Tạo mới nếu sản phẩm chưa có trong giỏ hàng
            cart = await modelCart.create({ userId: id, productId, quantity: newQuantity, totalPrice });
        }

        // ✅ KHÔNG TRỪ STOCK KHI THÊM VÀO GIỎ HÀNG
        // Stock sẽ được trừ khi thanh toán thành công

        new Created({ message: 'Add to cart successfully', metadata: cart }).send(res);
    }

    async getCart(req, res) {
        const { id } = req.user;
        const cart = await modelCart.findAll({
            where: { userId: id },
        });

        const data = await Promise.all(
            cart.map(async (item) => {
                let product = await modelProduct.findOne({
                    where: { id: item.productId },
                });

                let isComponent = false;
                if (!product) {
                    product = await modelProductComponent.findOne({
                        where: { id: item.productId },
                    });
                    isComponent = true;
                }

                if (!product) {
                    throw new BadRequestError('Không tìm thấy sản phẩm');
                }

                const finalPrice =
                    !isComponent && product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;

                // Kiểm tra trạng thái stock
                const isOutOfStock = product.stock <= 0;
                const isInsufficientStock = item.quantity > product.stock;

                return {
                    id: item.id,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                    isOutOfStock, // Sản phẩm hết hàng
                    isInsufficientStock, // Số lượng trong giỏ > stock hiện tại
                    availableStock: product.stock, // Số lượng còn lại trong kho
                    product: {
                        ...product.dataValues,
                        price: finalPrice,
                        isComponent,
                    },
                };
            }),
        );

        new OK({ message: 'Lấy giỏ hàng thành công', metadata: data }).send(res);
    }

    async deleteCart(req, res) {
        const { id } = req.user;
        const { cartId } = req.body;

        if (!id || !cartId) {
            throw new BadRequestError('Missing required fields');
        }

        // Find the cart item before deleting to get the product and quantity
        const cartItem = await modelCart.findOne({ where: { id: cartId } });

        if (!cartItem) {
            throw new BadRequestError('Không tìm thấy sản phẩm trong giỏ hàng');
        }

        // Get the product to update stock
        let product = await modelProduct.findOne({ where: { id: cartItem.productId } });
        let isComponent = false;

        if (!product) {
            product = await modelProductComponent.findOne({ where: { id: cartItem.productId } });
            isComponent = true;
        }

        // ✅ KHÔNG CỘNG LẠI STOCK KHI XÓA KHỎI GIỎ HÀNG
        // Vì stock không bị trừ khi thêm vào giỏ hàng

        // Delete the cart item
        await modelCart.destroy({ where: { id: cartId } });

        new OK({ message: 'Xoá sản phẩm thành công' }).send(res);
    }

    async updateInfoCart(req, res) {
        const { id } = req.user;
        const { fullName, address, phone } = req.body;

        if (!id || !fullName || !address || !phone) {
            throw new BadRequestError('Missing required fields');
        }

        const cart = await modelCart.findAll({ where: { userId: id } });

        if (cart.length === 0) {
            // Không có sản phẩm trong giỏ hàng nhưng vẫn coi là thành công
            new OK({ message: 'Cập nhật thông tin giỏ hàng thành công' }).send(res);
            return;
        }

        // Sử dụng Promise.all để đảm bảo tất cả updates hoàn thành
        await Promise.all(
            cart.map(async (item) => {
                await item.update({ fullName, address, phone });
            }),
        );

        new OK({ message: 'Cập nhật thông tin giỏ hàng thành công' }).send(res);
    }

    async addToCartBuildPC(req, res) {
        const { id } = req.user;
        const dataCart1 = await buildPcCart.findAll({ where: { userId: id } });

        dataCart1.map(async (item) => {
            const findCart = await modelCart.findOne({ where: { userId: id, productId: item.productId } });

            if (findCart) {
                findCart.quantity += item.quantity;
                findCart.totalPrice += item.totalPrice;
                await findCart.save();
            } else {
                modelCart.create({
                    userId: id,
                    productId: item.productId,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                });
            }
        });
        await buildPcCart.destroy({ where: { userId: id } });
        new OK({ message: 'The product has been added to the cart' }).send(res);
    }

    async deleteAllCartBuildPC(req, res) {
        const { id } = req.user;
        await buildPcCart.destroy({ where: { userId: id } });
        new OK({ message: 'Xoá giỏ hàng thành công' }).send(res);
    }

    async updateQuantity(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        // Lấy thông tin sản phẩm
        const product = await modelProduct.findOne({ where: { id: productId } });

        if (!product) {
            throw new BadRequestError('Không tìm thấy sản phẩm');
        }

        // Tính giá sau khi áp dụng discount (nếu có)
        const finalPrice = product.discount > 0 ? product.price * (1 - product.discount / 100) : product.price;

        // Tính tổng tiền
        const totalPrice = finalPrice * quantity;

        // Cập nhật giỏ hàng
        await modelCart.update({ quantity, totalPrice }, { where: { userId: id, productId } });
        new OK({ message: 'Cập nhật số lượng thành công' }).send(res);
    }

    async getCartBuildPc(req, res) {
        const { id } = req.user;
        const dataCart1 = await buildPcCart.findAll({ where: { userId: id } });
        const data = await Promise.all(
            dataCart1.map(async (item) => {
                const product = await modelProduct.findOne({ where: { id: item.productId } });
                return { ...item.dataValues, product };
            }),
        );
        new OK({ message: 'Lấy giỏ hàng thành công', metadata: data }).send(res);
    }

    async updateQuantityBuildPc(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        console.log('Update request:', { productId, quantity });

        if (!productId || !quantity || quantity <= 0) {
            throw new BadRequestError('Thông tin không hợp lệ');
        }

        // Giới hạn số lượng hợp lý
        if (quantity > 9999) {
            throw new BadRequestError('Số lượng không thể vượt quá 9999');
        }

        // Tìm sản phẩm trong build PC cart
        const cartItem = await buildPcCart.findOne({
            where: { userId: id, productId },
        });

        if (!cartItem) {
            throw new BadRequestError('Không tìm thấy sản phẩm trong giỏ hàng');
        }

        // Lấy thông tin sản phẩm để kiểm tra stock và tính giá
        const product = await modelProduct.findOne({ where: { id: productId } });

        if (!product) {
            throw new BadRequestError('Không tìm thấy sản phẩm');
        }

        // Kiểm tra stock - chỉ so sánh với stock thực tế
        if (quantity > product.stock) {
            throw new BadRequestError(`Số lượng không đủ. Chỉ còn ${product.stock} sản phẩm trong kho`);
        }

        // Tính toán totalPrice an toàn
        const price = parseFloat(product.price) || 0;
        const totalPrice = price * quantity;

        console.log('Price calculation:', {
            price,
            quantity,
            totalPrice,
            formattedPrice: totalPrice.toLocaleString('vi-VN') + ' VNĐ',
        });

        // Kiểm tra giá trị totalPrice có vượt quá giới hạn database không
        // DECIMAL(10,2) có thể chứa tối đa 99,999,999.99
        if (totalPrice > 99999999.99) {
            const maxQuantity = Math.floor(99999999.99 / price);
            throw new BadRequestError(
                `Tổng giá trị ${totalPrice.toLocaleString('vi-VN')} VNĐ vượt quá giới hạn cho phép (99,999,999 VNĐ). ` +
                    `Số lượng tối đa có thể đặt: ${maxQuantity}`,
            );
        }

        // Làm tròn totalPrice về 2 chữ số thập phân
        const finalTotalPrice = Math.round(totalPrice * 100) / 100;

        try {
            // Cập nhật build PC cart
            await cartItem.update({
                quantity,
                totalPrice: finalTotalPrice,
            });

            console.log('Update successful:', { quantity, totalPrice: finalTotalPrice });

            new OK({
                message: 'Cập nhật số lượng thành công',
                metadata: { quantity, totalPrice: finalTotalPrice },
            }).send(res);
        } catch (error) {
            console.error('Database update error:', error);
            throw new BadRequestError('Không thể cập nhật số lượng. Lỗi cơ sở dữ liệu!');
        }
    }
}

module.exports = new controllerCart();
