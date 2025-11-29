const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');
const { Op } = require('sequelize');

const modelProducts = require('../models/products.model');
const modelCategory = require('../models/category.model');
const modelBuildPcCart = require('../models/buildPcCart.model');
const modelUserWatchProduct = require('../models/userWatchProduct.model');
const modelProductPreview = require('../models/productPreview');
const modelUser = require('../models/users.model');

class controllerProducts {
    async createProduct(req, res) {
        const {
            name,
            price,
            description,
            images,
            category,
            stock,
            cpu,
            main,
            ram,
            storage,
            gpu,
            power,
            caseComputer,
            coolers,
            componentType,
            discount,
        } = req.body;

        if (!name || !price || !description || !images || !category || !stock || !componentType) {
            throw new BadRequestError('Bạn đang thiếu thông tin');
        }
        if (componentType === 'pc') {
            const product = await modelProducts.create({
                name,
                price,
                description,
                discount,
                images,
                categoryId: category,
                stock,
                cpu,
                main,
                ram,
                storage,
                gpu,
                power,
                caseComputer,
                coolers,
                componentType,
            });

            new Created({
                message: 'Create product successfully',
                metadata: product,
            }).send(res);
        }
        if (componentType !== 'pc') {
            const product = await modelProducts.create({
                name,
                price,
                description,
                images,
                categoryId: category,
                stock,
                componentType,
                discount: discount || 0,
            });

            new Created({
                message: 'Create product successfully',
                metadata: product,
            }).send(res);
        }
    }

    async getProducts(req, res) {
        const products = await modelProducts.findAll({ order: [['createdAt', 'DESC']] });
        new OK({
            message: 'Get products successfully',
            metadata: products,
        }).send(res);
    }

    async updateProduct(req, res) {
        const {
            name,
            price,
            description,
            discount,
            images,
            category,
            stock,
            cpu,
            main,
            ram,
            storage,
            gpu,
            power,
            caseComputer,
            componentType,
            coolers,
            id,
        } = req.body;
        const product = await modelProducts.findOne({ where: { id } });

        if (!product) {
            throw new BadRequestError('Product not found');
        }

        const updatedData = {
            name,
            price,
            description,
            discount,
            images: images ?? product.images,
            categoryId: category,
            stock,
            cpu,
            main,
            ram,
            storage,
            gpu,
            power,
            caseComputer,
            coolers,
            componentType,
        };
        await product.update(updatedData);
        new OK({
            message: 'Update product successfully',
            metadata: product,
        }).send(res);
    }

    async deleteProduct(req, res) {
        const { id } = req.query;
        const product = await modelProducts.findByPk(id);
        if (!product) {
            throw new BadRequestError('Product not found');
        }
        await product.destroy();
        new OK({
            message: 'Delete product successfully',
            metadata: product,
        }).send(res);
    }

    async getProductsByCategories(req, res) {
        // Lấy tất cả categories
        const categories = await modelCategory.findAll();

        // Tạo một object để lưu kết quả
        const result = await Promise.all(
            categories.map(async (category) => {
                const products = await modelProducts.findAll({
                    where: {
                        categoryId: category.id,
                    },
                });

                return {
                    category: {
                        id: category.id,
                        name: category.name,
                    },
                    products: products,
                };
            }),
        );

        new OK({
            message: 'Get all products grouped by categories successfully',
            metadata: result,
        }).send(res);
    }

    async getProductById(req, res) {
        const { id } = req.query;
        const product = await modelProducts.findOne({ where: { id } });
        if (!product) {
            throw new BadRequestError('Product not found');
        }
        const dataPreview = await modelProductPreview.findAll({ where: { productId: id } });
        const data = await Promise.all(
            dataPreview.map(async (item) => {
                const user = await modelUser.findOne({ where: { id: item.userId } });
                return {
                    ...item,
                    user: {
                        id: user.id,
                        name: user.fullName,
                    },
                };
            }),
        );
        new OK({
            message: 'Get product by id successfully',
            metadata: { product, dataPreview: data },
        }).send(res);
    }

    async getProductByComponentType(req, res) {
        const { componentType } = req.query;
        const product = await modelProducts.findAll({ where: { componentType } });

        if (!product) {
            throw new BadRequestError('Product not found');
        }
        new OK({
            message: 'Get product by component type successfully',
            metadata: product,
        }).send(res);
    }

    async buildPcCart(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;

        if (!id || !productId) {
            throw new BadRequestError('Missing required fields');
        }
        const product = await modelProducts.findOne({ where: { id: productId } });
        if (!product) {
            throw new BadRequestError('Không tìm thấy sản phẩm');
        }

        const existingCartItem = await modelBuildPcCart.findOne({
            where: { userId: id, productId },
        });

        // Tính toán số lượng mới
        const newQuantity = existingCartItem ? existingCartItem.quantity + quantity : quantity;

        if (product.stock < newQuantity) {
            throw new BadRequestError('Số lượng trong kho không đủ');
        }
        const totalAmount = product.price * quantity;
        if (existingCartItem) {
            // Tính toán tổng giá
            const totalAmount = existingCartItem.price * newQuantity;
            await existingCartItem.update({ quantity: newQuantity, totalPrice: totalAmount });
        } else {
            await modelBuildPcCart.create({
                userId: id,
                productId,
                quantity,
                totalPrice: totalAmount,
                componentType: product.componentType,
            });
        }

        new OK({ message: 'The product has been added to the cart' }).send(res);
    }

    async getBuildPcCart(req, res) {
        const { id } = req.user;
        const buildPcCart = await modelBuildPcCart.findAll({ where: { userId: id } });
        const data = await Promise.all(
            buildPcCart.map(async (item) => {
                const product = await modelProducts.findOne({ where: { id: item.productId } });
                return {
                    id: item.id,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice,
                    product: product,
                    componentType: item.componentType,
                    images: product.images,
                };
            }),
        );
        new OK({
            message: 'Get build pc cart successfully',
            metadata: data,
        }).send(res);
    }

    async updateQuantityCartBuildPc(req, res) {
        const { id } = req.user;
        const { productId, quantity } = req.body;
        const totalPrice = quantity * (await modelProducts.findOne({ where: { id: productId } })).price;
        await modelBuildPcCart.update({ quantity, totalPrice }, { where: { userId: id, productId } });
        new OK({ message: 'Cập nhật số lượng thành công' }).send(res);
    }

    async deleteCartBuildPc(req, res) {
        const { id } = req.user;
        const { productId } = req.body;
        await modelBuildPcCart.destroy({ where: { userId: id, productId } });
        new OK({ message: 'Xóa sản phẩm trong gio hàng' }).send(res);
    }

    async createProductWatch(req, res) {
        const { id } = req.user;
        const { productId } = req.body;

        const findProduct = await modelUserWatchProduct.findOne({ where: { userId: id, productId } });
        if (findProduct) {
            throw new BadRequestError('Product already exists in watch list');
        }

        const data = await modelUserWatchProduct.create({ userId: id, productId });

        new OK({
            message: 'Create product watch successfully',
            metadata: data,
        }).send(res);
    }

    async getProductWatch(req, res) {
        const { id } = req.user;
        const products = await modelUserWatchProduct.findAll({ where: { userId: id } });
        const data = await Promise.all(
            products.map(async (item) => {
                const product = await modelProducts.findOne({ where: { id: item.productId } });
                return product;
            }),
        );
        new OK({
            message: 'Get product watch successfully',
            metadata: data,
        }).send(res);
    }

    async getProductByIdCategory(req, res) {
        const { id, search, minPrice, maxPrice, sort, productIds } = req.query;

        let whereClause = { categoryId: id };
        let order = [];

        // Xử lý sắp xếp
        switch (sort) {
            case 'price-asc':
                order.push(['price', 'ASC']);
                break;
            case 'price-desc':
                order.push(['price', 'DESC']);
                break;
            case 'discount':
                order.push(['discount', 'DESC']);
                break;
            default: // newest
                order.push(['createdAt', 'DESC']);
        }

        // Thêm điều kiện tìm kiếm theo tên
        if (search) {
            whereClause.name = {
                [Op.like]: `%${search}%`,
            };
        }

        // Thêm điều kiện lọc theo giá
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = minPrice;
            if (maxPrice) whereClause.price[Op.lte] = maxPrice;
        }

        // // Lọc theo ID sản phẩm cụ thể nếu có
        if (productIds) {
            const ids = productIds.split(',');
            whereClause.id = {
                [Op.in]: ids,
            };
        }

        // Lấy danh sách sản phẩm
        const products = await modelProducts.findAll({
            where: whereClause,
            order,
        });

        // Sắp xếp lại theo giá sau giảm giá nếu cần
        if (sort === 'price-asc' || sort === 'price-desc') {
            products.sort((a, b) => {
                const priceA = a.price * (1 - a.discount / 100);
                const priceB = b.price * (1 - b.discount / 100);
                return sort === 'price-asc' ? priceA - priceB : priceB - priceA;
            });
        }

        new OK({
            message: 'Get product by id category successfully',
            metadata: products,
        }).send(res);
    }

    async getProductHotSale(req, res) {
        const products = await modelProducts.findAll({ where: { discount: { [Op.gt]: 20 } } });
        new OK({
            message: 'Get product hot sale successfully',
            metadata: products,
        }).send(res);
    }

    async getProductSearch(req, res) {
        const { search, minPrice, maxPrice, sort, productIds } = req.query;

        let whereClause = {};
        let order = [];

        // Xử lý sắp xếp
        switch (sort) {
            case 'price-asc':
                order.push(['price', 'ASC']);
                break;
            case 'price-desc':
                order.push(['price', 'DESC']);
                break;
            case 'discount':
                order.push(['discount', 'DESC']);
                break;
            default: // newest
                order.push(['createdAt', 'DESC']);
        }

        // Thêm điều kiện tìm kiếm theo tên
        // Nếu không có search, trả về tất cả sản phẩm
        if (search && search.trim() !== '') {
            whereClause.name = {
                [Op.like]: `%${search}%`,
            };
        }

        // Thêm điều kiện lọc theo giá
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = minPrice;
            if (maxPrice) whereClause.price[Op.lte] = maxPrice;
        }

        // Lọc theo ID sản phẩm cụ thể nếu có
        if (productIds) {
            const ids = productIds.split(',');
            whereClause.id = {
                [Op.in]: ids,
            };
        }

        const products = await modelProducts.findAll({
            where: whereClause,
            order,
        });

        // Sắp xếp lại theo giá sau giảm giá nếu cần
        if (sort === 'price-asc' || sort === 'price-desc') {
            products.sort((a, b) => {
                const priceA = a.price * (1 - a.discount / 100);
                const priceB = b.price * (1 - b.discount / 100);
                return sort === 'price-asc' ? priceA - priceB : priceB - priceA;
            });
        }

        new OK({
            message: 'Get product search successfully',
            metadata: products,
        }).send(res);
    }

    async getProductSearchByCategory(req, res) {
        const { category, search, minPrice, maxPrice, sort, productIds, componentType } = req.query;

        let whereClause = {};
        let order = [];

        // Chỉ thêm điều kiện categoryId nếu category không phải là 'all'
        if (category !== 'all') {
            whereClause.categoryId = category;
        }

        // Thêm điều kiện componentType nếu có
        if (componentType) {
            whereClause.componentType = componentType;
        }

        // Xử lý sắp xếp
        switch (sort) {
            case 'price-asc':
                order.push(['price', 'ASC']);
                break;
            case 'price-desc':
                order.push(['price', 'DESC']);
                break;
            case 'discount':
                order.push(['discount', 'DESC']);
                break;
            default: // newest
                order.push(['createdAt', 'DESC']);
        }

        // Thêm điều kiện tìm kiếm theo tên
        // Nếu không có search, trả về tất cả sản phẩm trong category
        if (search && search.trim() !== '') {
            whereClause.name = {
                [Op.like]: `%${search}%`,
            };
        }

        // Thêm điều kiện lọc theo giá
        if (minPrice || maxPrice) {
            whereClause.price = {};
            if (minPrice) whereClause.price[Op.gte] = minPrice;
            if (maxPrice) whereClause.price[Op.lte] = maxPrice;
        }

        // Lọc theo ID sản phẩm cụ thể nếu có
        if (productIds) {
            const ids = productIds.split(',');
            whereClause.id = {
                [Op.in]: ids,
            };
        }

        const products = await modelProducts.findAll({
            where: whereClause,
            order,
        });

        // Sắp xếp lại theo giá sau giảm giá nếu cần
        if (sort === 'price-asc' || sort === 'price-desc') {
            products.sort((a, b) => {
                const priceA = a.price * (1 - a.discount / 100);
                const priceB = b.price * (1 - b.discount / 100);
                return sort === 'price-asc' ? priceA - priceB : priceB - priceA;
            });
        }

        new OK({
            message: 'Get product search by category successfully',
            metadata: products,
        }).send(res);
    }
}

module.exports = new controllerProducts();
