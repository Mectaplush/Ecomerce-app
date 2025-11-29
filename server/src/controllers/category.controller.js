const { BadRequestError } = require('../core/error.response');
const { OK, Created, InternalServerError } = require('../core/success.response');
const modelCategory = require('../models/category.model');
const modelProduct = require('../models/products.model');
const { Op } = require('sequelize');

class controllerCategory {
    async createCategory(req, res) {
        const { name, image } = req.body;
        if (!name || !image) {
            throw new BadRequestError('Tên và ảnh là bắt buộc');
        }
        const category = await modelCategory.create({ name, image });
        new Created({
            message: 'Create category successfully',
            metadata: category,
        }).send(res);
    }

    async getAllCategory(req, res) {
        const categories = await modelCategory.findAll({});
        new OK({
            message: 'Get all category successfully',
            metadata: categories,
        }).send(res);
    }

    async deleteCategory(req, res) {
        const { id } = req.query;
        const category = await modelCategory.findByPk(id);
        if (!category) {
            throw new BadRequestError('Category not found');
        }
        const result = await category.destroy();
        new OK({
            message: 'Delete category successfully',
            metadata: result,
        }).send(res);
    }

    async updateCategory(req, res) {
        const { name, image, id } = req.body;

        const category = await modelCategory.findByPk(id);
        if (!category) {
            throw new BadRequestError('Category not found');
        }
        const result = await category.update({ name, image });
        new OK({ message: 'Thành công', metadata: result }).send(res);
    }

    async getCategoryByComponentTypes(req, res) {
        const { categoryId } = req.query;

        // Lấy sản phẩm theo danh mục nếu có
        let whereClause = {};
        if (categoryId) {
            whereClause.categoryId = categoryId;
        }

        // Lấy tất cả các sản phẩm theo điều kiện
        const products = await modelProduct.findAll({
            where: whereClause,
            attributes: [
                'id',
                'name',
                'componentType',
                'cpu',
                'ram',
                'gpu',
                'storage',
                'coolers',
                'power',
                'caseComputer',
            ],
        });

        // Map để lưu tên linh kiện và tất cả các sản phẩm có linh kiện đó
        const componentGroups = {
            cpu: {},
            ram: {},
            vga: {},
            mainboard: {},
            ssd: {},
            hdd: {},
            power: {},
            cooler: {},
            case: {},
            monitor: {},
            keyboard: {},
            mouse: {},
            headset: {},
        };

        // Phân tích từng sản phẩm để trích xuất thông tin linh kiện
        products.forEach((product) => {
            if (product.cpu) {
                if (!componentGroups.cpu[product.cpu]) {
                    componentGroups.cpu[product.cpu] = [];
                }
                componentGroups.cpu[product.cpu].push({ id: product.id, name: product.cpu });
            }
            if (product.ram) {
                if (!componentGroups.ram[product.ram]) {
                    componentGroups.ram[product.ram] = [];
                }
                componentGroups.ram[product.ram].push({ id: product.id, name: product.ram });
            }
            if (product.gpu) {
                if (!componentGroups.vga[product.gpu]) {
                    componentGroups.vga[product.gpu] = [];
                }
                componentGroups.vga[product.gpu].push({ id: product.id, name: product.gpu });
            }

            if (product.storage) {
                if (product.storage.toLowerCase().includes('ssd')) {
                    if (!componentGroups.ssd[product.storage]) {
                        componentGroups.ssd[product.storage] = [];
                    }
                    componentGroups.ssd[product.storage].push({ id: product.id, name: product.storage });
                } else if (product.storage.toLowerCase().includes('hdd')) {
                    if (!componentGroups.hdd[product.storage]) {
                        componentGroups.hdd[product.storage] = [];
                    }
                    componentGroups.hdd[product.storage].push({ id: product.id, name: product.storage });
                }
            }

            if (product.coolers) {
                if (!componentGroups.cooler[product.coolers]) {
                    componentGroups.cooler[product.coolers] = [];
                }
                componentGroups.cooler[product.coolers].push({ id: product.id, name: product.coolers });
            }
            if (product.power) {
                if (!componentGroups.power[product.power]) {
                    componentGroups.power[product.power] = [];
                }
                componentGroups.power[product.power].push({ id: product.id, name: product.power });
            }
            if (product.caseComputer) {
                if (!componentGroups.case[product.caseComputer]) {
                    componentGroups.case[product.caseComputer] = [];
                }
                componentGroups.case[product.caseComputer].push({ id: product.id, name: product.caseComputer });
            }

            // Nếu sản phẩm là một loại linh kiện cụ thể, thêm vào loại tương ứng
            if (product.componentType && product.componentType !== 'pc') {
                if (!componentGroups[product.componentType]) {
                    componentGroups[product.componentType] = {};
                }
                if (!componentGroups[product.componentType][product.name]) {
                    componentGroups[product.componentType][product.name] = [];
                }
                componentGroups[product.componentType][product.name].push({ id: product.id, name: product.name });
            }
        });

        // Chuyển đổi thành mảng kết quả
        const result = [];
        Object.entries(componentGroups).forEach(([type, components]) => {
            const typeComponents = [];
            Object.entries(components).forEach(([name, products]) => {
                products.forEach((product) => {
                    typeComponents.push({
                        id: `${type}-${product.id}`,
                        name: name,
                        type,
                        productId: product.id,
                    });
                });
            });

            // Chỉ thêm loại linh kiện nếu có ít nhất 1 linh kiện
            if (typeComponents.length > 0) {
                result.push({
                    type,
                    label: type,
                    components: typeComponents,
                });
            }
        });

        new OK({
            message: 'Get component parts successfully',
            metadata: result,
        }).send(res);
    }

    async getAllProductsWithFilters(req, res) {
        try {
            const { categoryId, componentType, cpu, ram, gpu, storage, coolers, power, caseComputer } = req.query;

            // Lấy tất cả sản phẩm (không áp dụng điều kiện lọc)
            const allProducts = await modelProduct.findAll({
                attributes: [
                    'id',
                    'name',
                    'price',
                    'images',
                    'componentType',
                    'cpu',
                    'ram',
                    'gpu',
                    'storage',
                    'coolers',
                    'power',
                    'caseComputer',
                    'createdAt',
                ],
                order: [['createdAt', 'DESC']],
            });

            // Map để lưu tên linh kiện để đảm bảo không trùng lặp
            const uniqueComponents = {
                cpu: new Map(),
                ram: new Map(),
                vga: new Map(),
                mainboard: new Map(),
                ssd: new Map(),
                hdd: new Map(),
                power: new Map(),
                cooler: new Map(),
                case: new Map(),
                monitor: new Map(),
                keyboard: new Map(),
                mouse: new Map(),
                headset: new Map(),
            };

            // Phân tích tất cả sản phẩm để trích xuất các bộ lọc có sẵn
            allProducts.forEach((product) => {
                if (product.cpu) uniqueComponents.cpu.set(product.cpu, { name: product.cpu, productId: product.id });
                if (product.ram) uniqueComponents.ram.set(product.ram, { name: product.ram, productId: product.id });
                if (product.gpu) uniqueComponents.vga.set(product.gpu, { name: product.gpu, productId: product.id });

                if (product.storage) {
                    if (product.storage.toLowerCase().includes('ssd')) {
                        uniqueComponents.ssd.set(product.storage, { name: product.storage, productId: product.id });
                    } else if (product.storage.toLowerCase().includes('hdd')) {
                        uniqueComponents.hdd.set(product.storage, { name: product.storage, productId: product.id });
                    }
                }

                if (product.coolers)
                    uniqueComponents.cooler.set(product.coolers, { name: product.coolers, productId: product.id });
                if (product.power)
                    uniqueComponents.power.set(product.power, { name: product.power, productId: product.id });
                if (product.caseComputer)
                    uniqueComponents.case.set(product.caseComputer, {
                        name: product.caseComputer,
                        productId: product.id,
                    });

                // Nếu sản phẩm là một loại linh kiện cụ thể, thêm vào loại tương ứng
                if (product.componentType && product.componentType !== 'pc') {
                    if (uniqueComponents[product.componentType]) {
                        uniqueComponents[product.componentType].set(product.name, {
                            name: product.name,
                            productId: product.id,
                            price: product.price,
                        });
                    } else {
                        uniqueComponents[product.componentType] = new Map();
                        uniqueComponents[product.componentType].set(product.name, {
                            name: product.name,
                            productId: product.id,
                            price: product.price,
                        });
                    }
                }
            });

            // Chuyển đổi từ Map thành mảng kết quả
            const filters = [];
            Object.entries(uniqueComponents).forEach(([type, components]) => {
                if (components && components.size > 0) {
                    const typeComponents = [];
                    components.forEach((component, key) => {
                        typeComponents.push({
                            id: `${type}-${component.productId}`,
                            name: key,
                            type,
                            productId: component.productId,
                        });
                    });

                    // Chỉ thêm loại linh kiện nếu có ít nhất 1 linh kiện
                    if (typeComponents.length > 0) {
                        filters.push({
                            type,
                            label: type,
                            components: typeComponents,
                        });
                    }
                }
            });

            new OK({
                message: 'Get products successfully',
                metadata: {
                    products: allProducts,
                    filters,
                },
            }).send(res);
        } catch (error) {
            console.error('Error fetching products:', error);
            new InternalServerError({
                message: 'Error fetching products',
                error: error.message,
            }).send(res);
        }
    }
}

module.exports = new controllerCategory();
