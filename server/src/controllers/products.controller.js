const { BadRequestError } = require('../core/error.response');
const { OK, Created } = require('../core/success.response');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs').promises;
const { cloudinary } = require('../config/cloudinary');

/**
 * Parse CSV row handling quoted fields and escaped quotes
 * @param {string} row - CSV row to parse
 * @returns {Array} - Array of field values
 */
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < row.length) {
        const char = row[i];

        if (char === '"') {
            if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
                // Escaped quote inside quoted field
                current += '"';
                i += 2;
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // Field delimiter outside quotes
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }

    // Add the last field
    result.push(current.trim());
    return result;
}

const modelProducts = require('../models/products.model');
const modelCategory = require('../models/category.model');
const modelBuildPcCart = require('../models/buildPcCart.model');
const modelUserWatchProduct = require('../models/userWatchProduct.model');
const modelProductPreview = require('../models/productPreview');
const modelUser = require('../models/users.model');
// Use Typesense for embeddings and search
const embeddingService = require('../services/typesenseEmbeddingService');

/**
     * Helper function to create embeddings for a product
     */
async function createProductEmbeddings(product) {
    try {
        // Create traditional OpenAI text embedding (for backward compatibility)
        // const textContent = `${product.name} ${product.description} ${product.componentType}`;
        // await embeddingService.embedText(product.id, textContent, {
        //     productId: product.id,
        //     name: product.name,
        //     price: product.price,
        //     componentType: product.componentType,
        //     categoryId: product.categoryId
        // });

        // Create CLIP multimodal embedding (new approach)
        try {
            await embeddingService.embedProductWithCLIP(product);
        } catch (clipError) {
            console.warn(`Failed to create CLIP embedding for product ${product.id}:`, clipError);
        }

        // Embed individual images for fallback (legacy approach)
        // if (product.images) {
        //     const imageUrls = product.images.split(',').map(url => url.trim());
        //     for (let i = 0; i < imageUrls.length; i++) {
        //         const imageId = `${product.id}_image${i}`;
        //         const imageDescription = `Product image for ${product.name}`;

        //         try {
        //             await embeddingService.embedImage(
        //                 imageId,
        //                 imageUrls[i],
        //                 undefined,
        //                 {
        //                     productId: product.id,
        //                     imageIndex: i,
        //                     name: product.name,
        //                     componentType: product.componentType
        //                 }
        //             );
        //         } catch (error) {
        //             console.warn(`Failed to embed image ${i} for product ${product.id}:`, error);
        //         }
        //     }
        // }
    } catch (error) {
        console.error('Error creating embeddings for product:', product.id, error);
        // Don't throw error to prevent product creation failure
    }
}

async function updateProductEmbeddings(product, oldImages = null) {
    try {
        // Update traditional OpenAI text embedding
        // const textContent = `${product.name} ${product.description} ${product.componentType}`;
        // await embeddingService.embedText(product.id, textContent, {
        //     productId: product.id,
        //     name: product.name,
        //     price: product.price,
        //     componentType: product.componentType,
        //     categoryId: product.categoryId
        // });

        // Update CLIP multimodal embedding
        try {
            // Delete all old CLIP embeddings first (text, images, combined)
            await embeddingService.deleteProductEmbeddings(product.id);

            // Create new CLIP embedding
            await embeddingService.embedProductWithCLIP(product);
        } catch (clipError) {
            console.warn(`Failed to update CLIP embedding for product ${product.id}:`, clipError);
        }

        // Handle image updates for legacy approach
        // if (product.images) {
        //     // If images changed, clean up old image embeddings
        //     if (oldImages && oldImages !== product.images) {
        //         embeddingService.index.deleteMany({
        //             productId: { $eq: `${product.id}}` }
        //         })
        //     }

        //     // Create new image embeddings
        //     const imageUrls = product.images.split(',').map(url => url.trim());
        //     for (let i = 0; i < imageUrls.length; i++) {
        //         const imageId = `${product.id}_image${i}`;
        //         const imageDescription = `Product image for ${product.name}`;

        //         try {
        //             await embeddingService.embedImage(
        //                 imageId,
        //                 imageUrls[i],
        //                 null,
        //                 {
        //                     productId: product.id,
        //                     imageIndex: i,
        //                     name: product.name,
        //                     componentType: product.componentType
        //                 }
        //             );
        //         } catch (error) {
        //             console.warn(`Failed to embed image ${i} for product ${product.id}:`, error);
        //         }
        //     }
        // }
    } catch (error) {
        console.error('Error updating embeddings for product:', product.id, error);
    }
}

/**
     * Process base64 image uploads to Cloudinary
     * @param {Array} imageFiles - Array of {name, data, type} objects
     * @returns {Promise<Array>} Array of uploaded image URLs from Cloudinary
     */
async function processImageUploads(imageFiles) {
    const uploadedUrls = [];

    for (const imageFile of imageFiles) {
        try {
            // Validate base64 data format
            if (!imageFile.data || !imageFile.data.startsWith('data:image/')) {
                console.warn('Invalid base64 image data:', imageFile.name);
                continue;
            }

            // Generate unique public_id for Cloudinary
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const publicId = `product_${timestamp}_${randomString}`;

            // Upload to Cloudinary
            const result = await cloudinary.uploader.upload(imageFile.data, {
                folder: 'shop-pc/products',
                public_id: publicId,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto:good' },
                    { fetch_format: 'auto' }
                ]
            });

            // Store the secure URL
            uploadedUrls.push(result.secure_url);

        } catch (error) {
            console.error('Failed to upload image to Cloudinary:', imageFile.name, error);
            // Continue with other images instead of failing completely
        }
    }

    return uploadedUrls;
}

/**
     * Generate embeddings for product (async)
     * @param {Object} product - Product instance
     */
async function generateProductEmbeddings(product) {
    try {
        await embeddingService.deleteProductEmbeddings(product.id);
        await embeddingService.embedProductWithCLIP(product);
        console.log('Generated embeddings for product:', product.id);
    } catch (error) {
        console.error('Embedding generation failed for product:', product.id, error);
    }
}

class controllerProducts {
    async createProduct(req, res) {
        try {
            const {
                name,
                price,
                description,
                stock,
                category,
                componentType,
                discount = 0,
                imageFiles = [], // Base64 image data
                existingImages = [], // URLs of existing images (for consistency)
                // PC-specific fields
                cpu,
                main,
                ram,
                storage,
                gpu,
                power,
                caseComputer,
                coolers
            } = req.body;

            // Validate required fields
            if (!name || !price || !description || !stock || !category || !componentType) {
                throw new BadRequestError('Bạn đang thiếu thông tin');
            }

            // Handle image uploads
            let uploadedImageUrls = [];
            if (imageFiles && imageFiles.length > 0) {
                uploadedImageUrls = await processImageUploads(imageFiles);
            }

            // Combine with existing images
            const allImageUrls = [...existingImages, ...uploadedImageUrls];

            if (allImageUrls.length === 0) {
                throw new BadRequestError('Cần ít nhất một hình ảnh');
            }

            // Create product in database
            const productData = {
                name,
                price: parseFloat(price),
                description,
                stock: parseInt(stock),
                categoryId: category,
                componentType,
                discount: parseFloat(discount),
                images: allImageUrls.join(','),
                // PC-specific fields
                ...(componentType === 'pc' && {
                    cpu,
                    main,
                    ram,
                    storage,
                    gpu,
                    power,
                    caseComputer,
                    coolers
                })
            };

            const product = await modelProducts.create(productData);

            // Generate embeddings asynchronously
            generateProductEmbeddings(product).catch(error => {
                console.error('Failed to generate embeddings for product:', product.id, error);
            });

            new Created({
                message: 'Create product successfully',
                metadata: {
                    product,
                    uploadedImages: uploadedImageUrls.length,
                    totalImages: allImageUrls.length
                }
            }).send(res);

        } catch (error) {
            console.error('Create product error:', error);

            if (error instanceof BadRequestError) {
                throw error;
            }

            throw new BadRequestError(`Failed to create product: ${error.message}`);
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
        try {
            const {
                id,
                name,
                price,
                description,
                stock,
                category,
                componentType,
                discount = 0,
                imageFiles = [], // Base64 image data for new images
                existingImages = [], // URLs of existing images to keep
                // PC-specific fields
                cpu,
                main,
                ram,
                storage,
                gpu,
                power,
                caseComputer,
                coolers
            } = req.body;

            // Check if product exists
            const existingProduct = await modelProducts.findByPk(id);
            if (!existingProduct) {
                throw new BadRequestError('Product not found');
            }

            // Handle new image uploads
            let uploadedImageUrls = [];
            if (imageFiles && imageFiles.length > 0) {
                uploadedImageUrls = await processImageUploads(imageFiles);
            }

            // Determine images to remove (existing images not in existingImages array)
            const currentImages = existingProduct.images ? existingProduct.images.split(',') : [];
            const imagesToRemove = currentImages.filter(url => !existingImages.includes(url));

            // Remove unused images asynchronously
            if (imagesToRemove.length > 0) {
                this.removeUnusedImages(imagesToRemove).catch(error => {
                    console.warn('Failed to remove unused images:', error);
                });
            }

            // Combine existing and new images
            const allImageUrls = [...existingImages, ...uploadedImageUrls];

            if (allImageUrls.length === 0) {
                throw new BadRequestError('Cần ít nhất một hình ảnh');
            }

            // Update product data
            const updateData = {
                name,
                price: parseFloat(price),
                description,
                stock: parseInt(stock),
                categoryId: category,
                componentType,
                discount: parseFloat(discount),
                images: allImageUrls.join(','),
                // PC-specific fields
                ...(componentType === 'pc' && {
                    cpu,
                    main,
                    ram,
                    storage,
                    gpu,
                    power,
                    caseComputer,
                    coolers
                })
            };

            await existingProduct.update(updateData);

            // Regenerate embeddings asynchronously
            generateProductEmbeddings(existingProduct).catch(error => {
                console.error('Failed to regenerate embeddings for product:', id, error);
            });

            new OK({
                message: 'Update product successfully',
                metadata: {
                    product: existingProduct,
                    uploadedImages: uploadedImageUrls.length,
                    removedImages: imagesToRemove.length,
                    totalImages: allImageUrls.length
                }
            }).send(res);

        } catch (error) {
            console.error('Update product error:', error);

            if (error instanceof BadRequestError) {
                throw error;
            }

            throw new BadRequestError(`Failed to update product: ${error.message}`);
        }
    }

    async deleteProduct(req, res) {
        const { id } = req.query;
        const product = await modelProducts.findByPk(id);
        if (!product) {
            throw new BadRequestError('Product not found');
        }

        await product.destroy();

        // Clean up embeddings from Pinecone
        try {
            // Delete CLIP embedding
            await embeddingService.index.deleteOne(`${id}_clip`);

            // Delete traditional text embedding
            //await embeddingService.index.deleteOne(id);

            // Delete image embeddings (if any)
            // Note: This is a simplified approach. In production, you might want to
            // query for all embeddings with this productId and delete them
            // for (let i = 0; i < 10; i++) { // Assuming max 10 images per product
            //     try {
            //         await embeddingService.index.deleteOne(`${id}_image_${i}`);
            //     } catch (deleteError) {
            //         // Ignore errors for non-existent embeddings
            //     }
            // }
        } catch (embeddingDeleteError) {
            console.warn(`Failed to delete embeddings for product ${id}:`, embeddingDeleteError);
        }

        new OK({
            message: 'Delete product successfully',
            metadata: product,
        }).send(res);
    }

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
            const headers = parseCSVRow(lines[0]);
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
                const values = parseCSVRow(lines[i]);

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

        try {
            let results = [];

            // If search query exists, use Typesense multimodal search
            if (search && search.trim() !== '') {
                console.log('Using Typesense search for query:', search);
                results = await embeddingService.searchMultimodal(search.trim(), [], {
                    topK: 100 // Get more results for filtering
                });

                // Convert Typesense results to product objects
                if (results.length > 0) {
                    const productIds = results.map(r => r.productId);
                    const products = await modelProducts.findAll({
                        where: {
                            id: { [Op.in]: productIds }
                        }
                    });

                    // Maintain Typesense ranking order
                    const productMap = new Map(products.map(p => [p.id, p]));
                    results = results.map(r => productMap.get(r.productId)).filter(Boolean);
                } else {
                    results = [];
                }
            } else {
                // No search query, get all products with traditional method
                let whereClause = {};
                let order = [];

                // Handle sorting
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

                results = await modelProducts.findAll({
                    where: whereClause,
                    order,
                });
            }

            // Apply price filtering
            if (minPrice || maxPrice) {
                results = results.filter(product => {
                    const price = product.price;
                    if (minPrice && price < minPrice) return false;
                    if (maxPrice && price > maxPrice) return false;
                    return true;
                });
            }

            // Apply product ID filtering if specified
            if (productIds) {
                const ids = productIds.split(',');
                results = results.filter(product => ids.includes(product.id));
            }

            // Apply sorting for non-search queries or re-sort if needed
            if (sort && (!search || search.trim() === '')) {
                switch (sort) {
                    case 'price-asc':
                        results.sort((a, b) => {
                            const priceA = a.price * (1 - (a.discount || 0) / 100);
                            const priceB = b.price * (1 - (b.discount || 0) / 100);
                            return priceA - priceB;
                        });
                        break;
                    case 'price-desc':
                        results.sort((a, b) => {
                            const priceA = a.price * (1 - (a.discount || 0) / 100);
                            const priceB = b.price * (1 - (b.discount || 0) / 100);
                            return priceB - priceA;
                        });
                        break;
                    case 'discount':
                        results.sort((a, b) => (b.discount || 0) - (a.discount || 0));
                        break;
                }
            }

            console.log(`Product search completed: ${results.length} results`);

            new OK({
                message: 'Get product search successfully',
                metadata: results,
            }).send(res);

        } catch (error) {
            console.error('Product search error:', error);

            // Fallback to traditional search if Typesense fails
            let whereClause = {};
            let order = [['createdAt', 'DESC']];

            if (search && search.trim() !== '') {
                whereClause.name = {
                    [Op.like]: `%${search}%`,
                };
            }

            if (minPrice || maxPrice) {
                whereClause.price = {};
                if (minPrice) whereClause.price[Op.gte] = minPrice;
                if (maxPrice) whereClause.price[Op.lte] = maxPrice;
            }

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

            new OK({
                message: 'Get product search successfully (fallback)',
                metadata: products,
            }).send(res);
        }
    }

    async getProductSearchByCategory(req, res) {
        const { category, search, minPrice, maxPrice, sort, productIds, componentType } = req.query;

        try {
            let results = [];

            // If search query exists, use Typesense multimodal search
            if (search && search.trim() !== '') {
                console.log('Using Typesense search for category query:', search, 'category:', category);

                // Use Typesense search with category filtering
                const searchOptions = {
                    topK: 100,
                    filters: {}
                };

                // Add category filter if specified
                if (category && category !== 'all') {
                    searchOptions.filters.categoryId = category;
                }

                // Add componentType filter if specified
                if (componentType) {
                    searchOptions.filters.componentType = componentType;
                }

                results = await embeddingService.searchMultimodal(search.trim(), [], searchOptions);

                // Convert Typesense results to product objects
                if (results.length > 0) {
                    const productIds = results.map(r => r.productId);
                    const products = await modelProducts.findAll({
                        where: {
                            id: { [Op.in]: productIds }
                        }
                    });

                    // Maintain Typesense ranking order and apply filters
                    const productMap = new Map(products.map(p => [p.id, p]));
                    results = results.map(r => productMap.get(r.productId)).filter(product => {
                        if (!product) return false;
                        if (category && category !== 'all' && product.categoryId !== category) return false;
                        if (componentType && product.componentType !== componentType) return false;
                        return true;
                    });
                } else {
                    results = [];
                }
            } else {
                // No search query, get products by category with traditional method
                let whereClause = {};
                let order = [];

                // Handle sorting
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

                // Add category condition
                if (category && category !== 'all') {
                    whereClause.categoryId = category;
                }

                // Add componentType condition
                if (componentType) {
                    whereClause.componentType = componentType;
                }

                results = await modelProducts.findAll({
                    where: whereClause,
                    order,
                });
            }

            // Apply price filtering
            if (minPrice || maxPrice) {
                results = results.filter(product => {
                    const price = product.price;
                    if (minPrice && price < minPrice) return false;
                    if (maxPrice && price > maxPrice) return false;
                    return true;
                });
            }

            // Apply product ID filtering if specified
            if (productIds) {
                const ids = productIds.split(',');
                results = results.filter(product => ids.includes(product.id));
            }

            // Apply sorting for non-search queries or re-sort if needed
            if (sort && (!search || search.trim() === '')) {
                switch (sort) {
                    case 'price-asc':
                        results.sort((a, b) => {
                            const priceA = a.price * (1 - (a.discount || 0) / 100);
                            const priceB = b.price * (1 - (b.discount || 0) / 100);
                            return priceA - priceB;
                        });
                        break;
                    case 'price-desc':
                        results.sort((a, b) => {
                            const priceA = a.price * (1 - (a.discount || 0) / 100);
                            const priceB = b.price * (1 - (b.discount || 0) / 100);
                            return priceB - priceA;
                        });
                        break;
                    case 'discount':
                        results.sort((a, b) => (b.discount || 0) - (a.discount || 0));
                        break;
                }
            }

            console.log(`Category search completed: ${results.length} results`);

            new OK({
                message: 'Get product search by category successfully',
                metadata: results,
            }).send(res);

        } catch (error) {
            console.error('Product category search error:', error);

            // Fallback to traditional search if Typesense fails
            let whereClause = {};
            let order = [['createdAt', 'DESC']];

            if (category && category !== 'all') {
                whereClause.categoryId = category;
            }

            if (componentType) {
                whereClause.componentType = componentType;
            }

            if (search && search.trim() !== '') {
                whereClause.name = {
                    [Op.like]: `%${search}%`,
                };
            }

            if (minPrice || maxPrice) {
                whereClause.price = {};
                if (minPrice) whereClause.price[Op.gte] = minPrice;
                if (maxPrice) whereClause.price[Op.lte] = maxPrice;
            }

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

            // Sorting for fallback
            if (sort === 'price-asc' || sort === 'price-desc') {
                products.sort((a, b) => {
                    const priceA = a.price * (1 - (a.discount || 0) / 100);
                    const priceB = b.price * (1 - (b.discount || 0) / 100);
                    return sort === 'price-asc' ? priceA - priceB : priceB - priceA;
                });
            }

            new OK({
                message: 'Get product search by category successfully (fallback)',
                metadata: products,
            }).send(res);
        }
    }

    async generateProductDataFromImages(req, res) {
        try {
            const { imagesData } = req.body;

            // Validate input
            if (!imagesData || !Array.isArray(imagesData) || imagesData.length === 0) {
                throw new BadRequestError('Images data array is required and must not be empty');
            }

            // Validate that all items are base64 data URLs
            const invalidImages = imagesData.filter(img =>
                typeof img !== 'string' || !img.startsWith('data:image/')
            );
            if (invalidImages.length > 0) {
                throw new BadRequestError('All images must be valid base64 data URLs');
            }

            // Get available categories from database
            const categories = await modelCategory.findAll({
                attributes: ['id', 'name']
            });
            const categoryNames = categories.map(cat => cat.name);

            // Define available product types based on componentType enum
            const productTypes = [
                'cpu', 'mainboard', 'ram', 'hdd', 'ssd', 'vga',
                'power', 'cooler', 'case', 'monitor', 'keyboard',
                'mouse', 'headset', 'pc'
            ];

            // Generate product data using embedding service
            const productData = await embeddingService.generateProductDataFromImages(
                imagesData,
                productTypes,
                categoryNames
            );

            // Find matching category ID for the generated category name
            const matchingCategory = categories.find(cat =>
                cat.name.toLowerCase() === productData.category.toLowerCase()
            );

            // Enhance response with category ID if found
            const enhancedProductData = {
                ...productData,
                categoryId: matchingCategory ? matchingCategory.id : null,
                availableCategories: categories,
                availableProductTypes: productTypes
            };

            new OK({
                message: 'Product data generated successfully from images using AI vision',
                metadata: enhancedProductData
            }).send(res);

        } catch (error) {
            console.error('Error generating product data from images:', error);

            if (error instanceof BadRequestError) {
                throw error;
            }

            throw new BadRequestError(`Failed to generate product data: ${error.message}`);
        }
    }

    async getSimilarProducts(req, res) {
        try {
            const { productId } = req.params;
            const { topK = 5 } = req.query;

            // Validate input
            if (!productId) {
                throw new BadRequestError('Product ID is required');
            }

            // Get the source product
            const sourceProduct = await modelProducts.findByPk(productId, {
                include: [{
                    model: modelCategory,
                    as: 'category',
                    attributes: ['id', 'name']
                }]
            });

            if (!sourceProduct) {
                throw new BadRequestError('Product not found');
            }

            const searchResults = await embeddingService.similaritySearchById(productId, {
                topK: parseInt(topK),
                includeMetadata: true,
                threshold: 0.3 // Lower threshold to get more results
            });

            const similarProductIds = searchResults.map(result => result.productId);

            // Fetch full product details for similar products
            const similarProducts = await modelProducts.findAll({
                where: {
                    id: similarProductIds
                },
                include: [{
                    model: modelCategory,
                    as: 'category',
                    attributes: ['id', 'name']
                }],
                order: [['createdAt', 'DESC']]
            });

            // Sort products based on similarity scores
            // const sortedProducts = similarProductIds.map(id => {
            //     const product = similarProducts.find(p => p.id === id);
            //     const searchResult = searchResults.find(r => r.productId === id);
            //     return {
            //         ...product.toJSON(),
            //         similarityScore: searchResult ? searchResult.score : 0
            //     };
            // }).filter(product => product.id); // Remove any undefined products

            new OK({
                message: 'Similar products retrieved successfully',
                metadata: {
                    sourceProduct: {
                        id: sourceProduct.id,
                        name: sourceProduct.name,
                        componentType: sourceProduct.componentType
                    },
                    similarProducts: similarProducts,
                    totalFound: similarProducts.length
                }
            }).send(res);

        } catch (error) {
            console.error('Error getting similar products:', error);

            if (error instanceof BadRequestError) {
                throw error;
            }

            throw new BadRequestError(`Failed to get similar products: ${error.message}`);
        }
    }

    /**
     * Remove unused images from Cloudinary
     * @param {Array} imageUrls - URLs of images to remove
     */
    async removeUnusedImages(imageUrls) {
        for (const url of imageUrls) {
            try {
                // Extract public_id from Cloudinary URL
                // Example URL: https://res.cloudinary.com/xxx/image/upload/v123/shop-pc/products/product_123.jpg
                const matches = url.match(/\/shop-pc\/products\/([^\/]+)\.[a-z]+$/i);
                
                if (matches && matches[1]) {
                    const publicId = `shop-pc/products/${matches[1]}`;
                    
                    // Delete from Cloudinary
                    await cloudinary.uploader.destroy(publicId);
                    console.log('Removed unused image from Cloudinary:', publicId);
                } else {
                    console.warn('Could not extract public_id from URL:', url);
                }
            } catch (error) {
                // Image might not exist on Cloudinary - this is not critical
                console.warn('Could not remove image from Cloudinary:', url, error.message);
            }
        }
    }
}

module.exports = new controllerProducts();
