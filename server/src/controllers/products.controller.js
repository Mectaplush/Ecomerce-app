const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');
const { Op } = require('sequelize');

const modelProducts = require('../models/products.model');
const modelCategory = require('../models/category.model');
const modelBuildPcCart = require('../models/buildPcCart.model');
const modelUserWatchProduct = require('../models/userWatchProduct.model');
const modelProductPreview = require('../models/productPreview');
const modelUser = require('../models/users.model');
const embeddingService = require('../services/embeddingService');

/**
     * Helper function to create embeddings for a product
     */
async function createProductEmbeddings(product) {
    try {
        // Create text content for embedding
        const textContent = `${product.name} ${product.description} ${product.componentType}`;

        // Embed text content
        await embeddingService.embedText(product.id, textContent, {
            productId: product.id,
            name: product.name,
            price: product.price,
            componentType: product.componentType,
            categoryId: product.categoryId
        });

        // Embed images if they exist
        if (product.images) {
            const imageUrls = product.images.split(',').map((url) => url.trim());
            for (let i = 0; i < imageUrls.length; i++) {
                const imageId = `${product.id}_image${i}`;
                const imageDescription = `Product image for ${product.name}`;

                await embeddingService.embedImage(
                    imageId,
                    imageUrls[i],
                    undefined,
                    {
                        productId: product.id,
                        imageIndex: i,
                        name: product.name,
                        componentType: product.componentType
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error creating embeddings for product:', product.id, error);
        // Don't throw error to prevent product creation failure
    }
}

async function updateProductEmbeddings(product, oldImages = null) {
    try {
        // Update text embedding
        const textContent = `${product.name} ${product.description} ${product.componentType}`;
        await embeddingService.embedText(product.id, textContent, {
            productId: product.id,
            name: product.name,
            price: product.price,
            componentType: product.componentType,
            categoryId: product.categoryId
        });

        // Handle image updates
        if (product.images) {
            // If images changed, delete old image embeddings first
            if (oldImages && oldImages !== product.images) {
                embeddingService.index.deleteMany({
                    productId: { $eq: `${product.id}}` },
                });
            }

            // Create new image embeddings
            const imageUrls = product.images.split(',').map((url) => url.trim());
            for (let i = 0; i < imageUrls.length; i++) {
                const imageId = `${product.id}_image${i}`;
                const imageDescription = `Product image for ${product.name}`;

                await embeddingService.embedImage(
                    imageId,
                    imageUrls[i],
                    null,
                    {
                        productId: product.id,
                        imageIndex: i,
                        name: product.name,
                        componentType: product.componentType
                    }
                );
            }
        }
    } catch (error) {
        console.error('Error updating embeddings for product:', product.id, error);
    }
}

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

        let product;

        if (componentType === 'pc') {
            product = await modelProducts.create({
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
        } else {
            product = await modelProducts.create({
                name,
                price,
                description,
                images,
                categoryId: category,
                stock,
                componentType,
                discount: discount || 0,
            });
        }

        // Create embeddings for the new product
        await createProductEmbeddings(product);

        new Created({
            message: 'Create product successfully',
            metadata: product,
        }).send(res);
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

        // Store old images for comparison
        const oldImages = product.images;

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

        // Update embeddings with new data
        await updateProductEmbeddings(product, oldImages);

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

        embeddingService.index.deleteMany({
            productId: { $eq: `${id}}` }
        })

        new OK({
            message: 'Delete product successfully',
            metadata: product,
        }).send(res);
    }

    // ...existing getter methods remain unchanged...

    async insertProductsByCsv(req, res) {
        try {
            const { csvData } = req.body;

            if (!csvData || !csvData.trim()) {
                throw new BadRequestError('Dữ liệu CSV là bắt buộc');
            }

            // Parse CSV data
            const lines = csvData.trim().split('\n');
            if (lines.length < 2) {
                throw new BadRequestError('CSV phải chứa tiêu đề và ít nhất một dòng dữ liệu');
            }

            // Extract header and validate required columns
            const headers = lines[0].split(',').map(h => h.trim());
            const requiredFields = ['name', 'price', 'description', 'images', 'categoryId', 'stock', 'componentType'];

            // Check if all required fields exist in headers
            const missingFields = requiredFields.filter(field => !headers.includes(field));
            if (missingFields.length > 0) {
                throw new BadRequestError(`Thiếu các cột bắt buộc: ${missingFields.join(', ')}`);
            }

            const products = [];
            const errors = [];

            // Process each data row
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());

                if (values.length !== headers.length) {
                    errors.push(`Dòng ${i + 1}: Số lượng cột không khớp`);
                    continue;
                }

                // Create product object from CSV row
                const productData = {};
                headers.forEach((header, index) => {
                    productData[header] = values[index] || null;
                });

                // Validate required fields for this row
                const rowErrors = [];
                if (!productData.name) rowErrors.push('tên sản phẩm là bắt buộc');
                if (!productData.price || isNaN(parseFloat(productData.price))) rowErrors.push('giá hợp lệ là bắt buộc');
                if (!productData.description) rowErrors.push('mô tả là bắt buộc');
                if (!productData.images) rowErrors.push('hình ảnh là bắt buộc');
                if (!productData.categoryId) rowErrors.push('mã danh mục là bắt buộc');
                if (!productData.stock || isNaN(parseInt(productData.stock))) rowErrors.push('số lượng tồn kho hợp lệ là bắt buộc');
                if (!productData.componentType) rowErrors.push('loại linh kiện là bắt buộc');

                // Validate componentType enum
                const validComponentTypes = ['cpu', 'mainboard', 'ram', 'hdd', 'ssd', 'vga', 'power', 'cooler', 'case', 'monitor', 'keyboard', 'mouse', 'headset', 'pc'];
                if (productData.componentType && !validComponentTypes.includes(productData.componentType)) {
                    rowErrors.push(`loại linh kiện phải là một trong: ${validComponentTypes.join(', ')}`);
                }

                if (rowErrors.length > 0) {
                    errors.push(`Dòng ${i + 1}: ${rowErrors.join(', ')}`);
                    continue;
                }

                // Convert data types
                productData.price = parseFloat(productData.price);
                productData.stock = parseInt(productData.stock);
                productData.discount = productData.discount ? parseInt(productData.discount) : 0;

                products.push(productData);
            }

            // If there are validation errors, return them
            if (errors.length > 0) {
                throw new BadRequestError(`Lỗi xác thực: ${errors.join('; ')}`);
            }

            // Insert products into database
            const insertedProducts = await modelProducts.bulkCreate(products, {
                validate: true,
                returning: true
            });

            // Create embeddings for all inserted products
            for (const product of insertedProducts) {
                await createProductEmbeddings(product);
            }

            new Created({
                message: `Thành công thêm ${insertedProducts.length} sản phẩm từ CSV`,
                metadata: {
                    insertedCount: insertedProducts.length,
                    products: insertedProducts
                }
            }).send(res);

        } catch (error) {
            // Handle Sequelize validation errors
            if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeBulkRecordError') {
                throw new BadRequestError(`Lỗi xác thực cơ sở dữ liệu: ${error.message}`);
            }
            console.log(error);
            throw error;
        }
    }

    async reEmbedAllProducts(req, res) {
        try {
            try {
                // Delete all existing embeddings
                await embeddingService.index.deleteAll();
            } catch { }

            // Get all products from database
            const products = await modelProducts.findAll();

            if (products.length === 0) {
                return new OK({
                    message: 'No products found to re-embed',
                    metadata: { processedCount: 0 }
                }).send(res);
            }

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Re-embed each product
            for (const product of products) {
                try {
                    await createProductEmbeddings(product);
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push({
                        productId: product.id,
                        productName: product.name,
                        error: error.message
                    });
                    console.error(`Failed to re-embed product ${product.id}:`, error);
                }
            }

            new OK({
                message: `Re-embedding completed. Success: ${successCount}, Errors: ${errorCount}`,
                metadata: {
                    totalProducts: products.length,
                    successCount,
                    errorCount,
                    errors: errors.length > 0 ? errors : undefined
                }
            }).send(res);

        } catch (error) {
            console.error('Error in reEmbedAllProducts:', error);
            throw new BadRequestError(`Failed to re-embed products: ${error.message}`);
        }
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
                    id: item.id,
                    productId: item.productId,
                    userId: item.userId,
                    rating: item.rating,
                    content: item.content,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    user: {
                        id: user.id,
                        name: user.fullName,
                        avatar: user.avatar,
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

    async generateProductDataFromImages(req, res) {

    }
}

module.exports = new controllerProducts();
