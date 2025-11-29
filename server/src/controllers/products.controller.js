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

class controllerProducts {
    /**
     * Helper function to create embeddings for a product
     */
    async createProductEmbeddings(product) {
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
                const imageUrls = product.images.split(',').map(url => url.trim());
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

    /**
     * Helper function to update embeddings for a product
     */
    async updateProductEmbeddings(product, oldImages = null) {
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
                        productId: { $eq: `${product.id}}` }
                    })
                }

                // Create new image embeddings
                const imageUrls = product.images.split(',').map(url => url.trim());
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
        await this.createProductEmbeddings(product);

        new Created({
            message: 'Create product successfully',
            metadata: product,
        }).send(res);
    }

    // ...existing getter methods remain unchanged...

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
        await this.updateProductEmbeddings(product, oldImages);

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
                await this.createProductEmbeddings(product);
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

    // ...rest of existing methods remain unchanged...
}

module.exports = new controllerProducts();
