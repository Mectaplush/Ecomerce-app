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

        // Trừ số lượng sản phẩm trong kho
        const newStock = product.stock - quantity;
        if (!isComponent) {
            await modelProduct.update({ stock: newStock }, { where: { id: productId } });
        } else {
            await modelProductComponent.update({ stock: newStock }, { where: { id: productId } });
        }

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

                return {
                    id: item.id,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
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

        if (product) {
            // Add the quantity back to stock
            const newStock = product.stock + cartItem.quantity;

            if (!isComponent) {
                await modelProduct.update({ stock: newStock }, { where: { id: cartItem.productId } });
            } else {
                await modelProductComponent.update({ stock: newStock }, { where: { id: cartItem.productId } });
            }
        }

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

        if (!cart) {
            throw new BadRequestError('Không tìm thấy giỏ hàng');
        }

        cart.map(async (item) => {
            await item.update({ fullName, address, phone });
        });

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
}

module.exports = new controllerCart();
