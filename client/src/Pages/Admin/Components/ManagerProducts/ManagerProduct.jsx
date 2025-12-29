import { Table, Button, Space, Modal, Form, Input, InputNumber, Upload, Select, message } from 'antd';

import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { Editor } from '@tinymce/tinymce-react';

import styles from './ManagerProduct.module.scss';
import classNames from 'classnames/bind';
import {
    requestCreateProduct,
    requestGetCategory,
    requestGetProducts,
    requestUpdateProduct,
    requestDeleteProduct,
    insertProductsByCsv,
    reEmbedAllProducts,
    generateProductDataFromImages,
} from '../../../../config/request';

const cx = classNames.bind(styles);
const { Search } = Input;

function ManagerProduct() {
    const [form] = Form.useForm();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [editorContent, setEditorContent] = useState('');
    const [productType, setProductType] = useState('pc');
    const [searchKeyword, setSearchKeyword] = useState('');

    const [categories, setCategories] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => {
            const categories = await requestGetCategory();
            setCategories(categories);
        };
        fetchCategories();
    }, []);

    // Fake data for demonstration
    const [products, setProducts] = useState([]);
    const fetchProducts = async () => {
        const products = await requestGetProducts();
        setProducts(products.metadata);
    };
    useEffect(() => {
        fetchProducts();
    }, []);

    // Filter products based on search keyword
    const filteredProducts = products.filter(
        (product) =>
            product.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchKeyword.toLowerCase())),
    );

    const [csvModalOpen, setCsvModalOpen] = useState(false);
    const [csvFiles, setCsvFiles] = useState([]);
    const [csvUploading, setCsvUploading] = useState(false);
    const [csvErrors, setCsvErrors] = useState([]); // Add state for errors
    const [csvSuccess, setCsvSuccess] = useState(''); // Add state for success message
    const [reEmbedLoading, setReEmbedLoading] = useState(false);
    const [reEmbedModalOpen, setReEmbedModalOpen] = useState(false);
    const [reEmbedError, setReEmbedError] = useState('');
    const [reEmbedSuccess, setReEmbedSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Image generation states
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [generateLoading, setGenerateLoading] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [generateSuccess, setGenerateSuccess] = useState('');
    const [selectedFields, setSelectedFields] = useState({
        name: true,
        description: true,
        category: false,
        componentType: false,
        cpu: false,
        mainboard: false,
        ram: false,
        storage: false,
        gpu: false,
        powerSupply: false,
        case: false,
        cooler: false
    });

    const handleSearch = (value) => {
        setSearchKeyword(value);
    };

    const handleAdd = () => {
        setEditingProduct(null);
        form.resetFields();
        setFileList([]);
        setIsModalOpen(true);
    };

    console.log(categories);

    const handleEdit = (record) => {
        setEditingProduct(record);
        setProductType(record.componentType || 'pc');

        // Ensure all form fields are set correctly
        form.setFieldsValue({
            name: record.name,
            price: record.price,
            discount: record.discount || 0,
            stock: record.stock,
            category: categories.find((item) => item.id === record.categoryId).name,
            description: record.description,
            cpu: record.cpu,
            main: record.main,
            ram: record.ram,
            storage: record.storage,
            gpu: record.gpu,
            power: record.power,
            caseComputer: record.caseComputer,
            coolers: record.coolers,
            componentType: record.componentType,
            id: record.id,
        });

        // Set images
        if (record.images) {
            const imageList = Array.isArray(record.images) ? record.images : record.images.split(',');

            setFileList(
                imageList.map((img, index) => ({
                    uid: `-${index}`,
                    name: `image-${index}`,
                    status: 'done',
                    url: img,
                })),
            );
        }

        setEditorContent(record.description || '');
        setIsModalOpen(true); // Make sure this is being called
    };

    const handleDelete = (record) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa sản phẩm "${record.name}"?`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                await requestDeleteProduct(record.id);
                await fetchProducts();
                message.success('Đã xóa sản phẩm');
            },
        });
    };

    const handleModalOk = async () => {
        if (isSubmitting) return; // Prevent double submission

        try {
            setIsSubmitting(true);
            const values = await form.validateFields();

            // Prepare image data for API
            const imageData = await prepareImageData();

            const productData = {
                ...values,
                description: editorContent,
                componentType: productType,
                imageFiles: imageData.newFiles, // New image files to upload
                existingImages: imageData.existingUrls, // URLs of existing images to keep
            };

            if (editingProduct) {
                // Update existing product
                const updateData = {
                    ...productData,
                    category: categories.find((item) => item.name === values.category)?.id,
                    id: editingProduct.id,
                };
                
                await requestUpdateProduct(updateData);
                message.success('Cập nhật sản phẩm thành công');
            } else {
                // Create new product
                await requestCreateProduct(productData);
                message.success('Thêm sản phẩm thành công');
            }

            // Reset form and close modal
            await fetchProducts();
            resetForm();
            setIsModalOpen(false);
        } catch (error) {
            // Handle API errors
            const errorMessage = error?.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm';
            form.setFields([
                {
                    name: 'name',
                    errors: [errorMessage],
                },
            ]);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Prepare image data for API submission
     * Separates new files from existing image URLs
     */
    const prepareImageData = async () => {
        const newFiles = [];
        const existingUrls = [];

        for (const file of fileList) {
            if (file.originFileObj) {
                // New file - convert to base64 or prepare for FormData
                const fileData = await fileToBase64(file.originFileObj);
                newFiles.push({
                    name: file.name,
                    data: fileData,
                    type: file.originFileObj.type,
                });
            } else if (file.url) {
                // Existing image URL
                existingUrls.push(file.url);
            }
        }

        return {
            newFiles,
            existingUrls,
        };
    };

    /**
     * Convert file to base64 for API transmission
     */
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    /**
     * Reset form state
     */
    const resetForm = () => {
        form.resetFields();
        setFileList([]);
        setEditorContent('');
        setEditingProduct(null);
        setProductType('pc');
    };

    /**
     * Handle modal cancel with confirmation if there are unsaved changes
     */
    const handleModalCancel = () => {
        if (fileList.length > 0 || form.getFieldsValue().name) {
            Modal.confirm({
                title: 'Xác nhận hủy',
                content: 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy?',
                okText: 'Hủy bỏ thay đổi',
                cancelText: 'Tiếp tục chỉnh sửa',
                onOk: () => {
                    resetForm();
                    setIsModalOpen(false);
                },
            });
        } else {
            resetForm();
            setIsModalOpen(false);
        }
    };

    // Add this useEffect to debug modal state
    useEffect(() => {
        console.log('Modal state:', isModalOpen);
    }, [isModalOpen]);

    const columns = [
        {
            title: 'Ảnh sản phẩm',
            dataIndex: 'images',
            key: 'images',
            render: (images) => (
                <img
                    src={images.split(',')[0]}
                    alt="123"
                    style={{ width: '100px', height: '100px', borderRadius: '10px' }}
                />
            ),
        },
        {
            title: 'Tên sản phẩm',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `${price.toLocaleString('vi-VN')} VNĐ`,
        },

        {
            title: 'Kho',
            dataIndex: 'stock',
            key: 'stock',
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button type="primary" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                        Sửa
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ];

    const uploadProps = {
        onRemove: (file) => {
            const index = fileList.indexOf(file);
            const newFileList = fileList.slice();
            newFileList.splice(index, 1);
            setFileList(newFileList);
        },
        beforeUpload: (file) => {
            // Validate file type and size
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Chỉ được tải lên file ảnh!');
                return false;
            }

            const isLt10M = file.size / 1024 / 1024 < 10;
            if (!isLt10M) {
                message.error('Ảnh phải nhỏ hơn 10MB!');
                return false;
            }

            return false; // Prevent auto upload
        },
        onChange: (info) => {
            // Filter out invalid files
            const validFileList = info.fileList.filter(file => {
                if (file.originFileObj) {
                    const isImage = file.originFileObj.type.startsWith('image/');
                    const isLt10M = file.originFileObj.size / 1024 / 1024 < 10;
                    return isImage && isLt10M;
                }
                return true; // Keep existing URLs
            });
            
            setFileList(validFileList);
        },
        fileList,
        multiple: true,
        accept: 'image/*',
        listType: 'picture-card',
    };

    const handleCsvImport = () => {
        setCsvFiles([]);
        setCsvErrors([]); // Clear previous errors
        setCsvSuccess(''); // Clear previous success
        setCsvModalOpen(true);
    };

    const handleCsvUpload = async () => {
        if (csvFiles.length === 0) {
            setCsvErrors(['Vui lòng chọn ít nhất một file CSV để tải lên!']);
            return;
        }

        setCsvUploading(true);
        setCsvErrors([]); // Clear previous errors
        setCsvSuccess(''); // Clear previous success

        let successCount = 0;
        let errorCount = 0;
        /**
         * @type {string[]}
         */
        const errors = [];
        /**
         * @type {string[]}
         */
        const successes = [];

        try {
            for (let i = 0; i < csvFiles.length; i++) {
                const file = csvFiles[i];

                try {
                    const csvData = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = () => reject(new Error(`Không thể đọc file ${file.name}`));
                        reader.readAsText(file);
                    });

                    await insertProductsByCsv({ csvData });
                    successCount++;
                    successes.push(file.name);
                } catch (error) {
                    errorCount++;
                    errors.push(`${file.name}: ${error.response?.data?.message || error.message}`);
                }
            }

            const successMessage =
                `Nhập thành công ${successCount} file CSV: ` + successes.reduce((a, b) => a + ', ' + b);

            if (successCount > 0) {
                setCsvSuccess(successMessage);
                await fetchProducts();
            }

            if (errorCount > 0) {
                setCsvErrors(errors);
            }

            if (errorCount === 0) {
                message.success(successMessage);
                setCsvModalOpen(false);
            }

            // Remove successful files to avoid duplication
            // Remove failed files because they must be fixed
            setCsvFiles([]);
        } catch (error) {
            console.error('File processing error:', error);
            setCsvErrors(['Có lỗi xảy ra khi xử lý files!']);
        } finally {
            setCsvUploading(false);
        }
    };

    const csvUploadProps = {
        beforeUpload: (file) => {
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            if (!isCSV) {
                setCsvErrors([`${file.name} không phải là file CSV!`]);
                return false;
            }
            setCsvErrors([]); // Clear errors when valid file selected
            return false;
        },
        onChange: (info) => {
            const validFiles = info.fileList
                .filter((file) => {
                    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
                    return isCSV;
                })
                .map((file) => file.originFileObj || file);

            setCsvFiles(validFiles);
            if (validFiles.length > 0) {
                setCsvErrors([]); // Clear errors when files selected
            }
        },
        onRemove: (file) => {
            setCsvFiles((prev) => prev.filter((f) => f.uid !== file.uid));
        },
        fileList: csvFiles.map((file, index) => ({
            uid: file.uid || `csv-${index}`,
            name: file.name,
            status: 'done',
            originFileObj: file,
        })),
        multiple: true,
        maxCount: 10,
    };

    const handleReEmbedAll = () => {
        setReEmbedError('');
        setReEmbedSuccess('');
        setReEmbedModalOpen(true);
    };

    const handleReEmbedConfirm = async () => {
        setReEmbedLoading(true);
        setReEmbedError('');
        setReEmbedSuccess('');

        try {
            const result = await reEmbedAllProducts();
            setReEmbedSuccess(result.message || 'Đã re-embed tất cả sản phẩm thành công!');
        } catch (error) {
            setReEmbedError(error.response?.data?.message || 'Có lỗi xảy ra khi re-embed sản phẩm');
        } finally {
            setReEmbedLoading(false);
        }
    };

    const handleGenerateInfo = () => {
        if (fileList.length === 0) {
            message.error('Vui lòng chọn ít nhất một hình ảnh để sinh thông tin!');
            return;
        }
        setGenerateError('');
        setGenerateSuccess('');
        setGenerateModalOpen(true);
    };

    const handleFieldSelectionChange = (field, checked) => {
        setSelectedFields(prev => ({
            ...prev,
            [field]: checked
        }));
    };

    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleGenerateConfirm = async () => {
        const selectedFieldNames = Object.keys(selectedFields).filter(field => selectedFields[field]);
        if (selectedFieldNames.length === 0) {
            setGenerateError('Vui lòng chọn ít nhất một trường để sinh thông tin!');
            return;
        }

        setGenerateLoading(true);
        setGenerateError('');
        setGenerateSuccess('');
        
        try {
            // Convert images to base64
            const imagesData = [];
            for (const file of fileList) {
                if (file.originFileObj) {
                    const base64 = await convertImageToBase64(file.originFileObj);
                    imagesData.push(base64);
                } else if (file.url) {
                    // For existing images, we need to fetch and convert them
                    try {
                        const response = await fetch(file.url);
                        const blob = await response.blob();
                        const base64 = await convertImageToBase64(blob);
                        imagesData.push(base64);
                    } catch (error) {
                        console.warn('Failed to convert existing image:', file.url);
                    }
                }
            }

            if (imagesData.length === 0) {
                throw new Error('Không thể xử lý hình ảnh được chọn');
            }

            const result = await generateProductDataFromImages(imagesData);
            const generatedData = result.metadata;

            // Update form fields based on selected fields
            const formValues = {};
            selectedFieldNames.forEach(field => {
                if (generatedData[field]) {
                    switch (field) {
                        case 'category':
                            // Find category ID from name
                            const category = categories.find(cat => 
                                cat.name.toLowerCase() === generatedData.category.toLowerCase()
                            );
                            if (category) {
                                formValues.category = category.id;
                            }
                            break;
                        case 'componentType':
                            formValues.componentType = generatedData.componentType;
                            setProductType(generatedData.componentType);
                            break;
                        case 'description':
                            formValues.description = generatedData.description;
                            setEditorContent(generatedData.description);
                            break;
                        case 'mainboard':
                            formValues.main = generatedData.mainboard;
                            break;
                        case 'powerSupply':
                            formValues.power = generatedData.powerSupply;
                            break;
                        case 'case':
                            formValues.caseComputer = generatedData.case;
                            break;
                        case 'cooler':
                            formValues.coolers = generatedData.cooler;
                            break;
                        default:
                            formValues[field] = generatedData[field];
                    }
                }
            });

            // Update the form with generated values
            form.setFieldsValue(formValues);
            
            setGenerateSuccess(`Đã sinh thông tin thành công cho ${selectedFieldNames.length} trường!`);
            
            // Close modal after a delay
            setTimeout(() => {
                setGenerateModalOpen(false);
            }, 2000);

        } catch (error) {
            setGenerateError(error.response?.data?.message || error.message || 'Có lỗi xảy ra khi sinh thông tin');
        } finally {
            setGenerateLoading(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2>Quản lý sản phẩm</h2>
                <Space>
                    <Button
                        type="default"
                        danger
                        loading={reEmbedLoading}
                        onClick={handleReEmbedAll}
                        style={{ marginRight: '8px' }}
                    >
                        Re-embed tất cả
                    </Button>
                    <Button
                        type="default"
                        icon={<UploadOutlined />}
                        onClick={handleCsvImport}
                        style={{ marginRight: '8px' }}
                    >
                        Nhập CSV
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                        Thêm sản phẩm
                    </Button>
                </Space>
            </div>

            <div className={cx('search-container')} style={{ marginBottom: '20px' }}>
                <Search
                    placeholder="Tìm kiếm sản phẩm..."
                    allowClear
                    enterButton
                    size="large"
                    onSearch={handleSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ maxWidth: '500px' }}
                />
            </div>

            <Table columns={columns} dataSource={filteredProducts} rowKey="id" />

            <Modal
                title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                open={isModalOpen}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                width={800}
                confirmLoading={isSubmitting}
                okText={isSubmitting ? 'Đang lưu...' : (editingProduct ? 'Cập nhật' : 'Thêm')}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" className={cx('form')}>
                    <Form.Item
                        name="componentType"
                        label="Loại sản phẩm"
                        rules={[{ required: true, message: 'Vui lòng chọn loại sản phẩm!' }]}
                        initialValue="pc"
                    >
                        <Select onChange={(value) => setProductType(value)}>
                            <Select.Option value="pc">PC</Select.Option>
                            <Select.Option value="cpu">CPU</Select.Option>
                            <Select.Option value="mainboard">Main</Select.Option>
                            <Select.Option value="ram">RAM</Select.Option>
                            <Select.Option value="hdd">Ổ cứng</Select.Option>
                            <Select.Option value="power">Nguồn</Select.Option>
                            <Select.Option value="case">Case</Select.Option>
                            <Select.Option value="cooler">Cooler</Select.Option>
                            <Select.Option value="monitor">Màn hình</Select.Option>
                            <Select.Option value="keyboard">Bàn phím</Select.Option>
                            <Select.Option value="mouse">Chuột</Select.Option>
                            <Select.Option value="vga">VGA</Select.Option>
                            <Select.Option value="ssd">SSD</Select.Option>
                            <Select.Option value="headset">Tai nghe</Select.Option>
                        </Select>
                    </Form.Item>

                    <div className={cx('form-row')}>
                        <Form.Item
                            name="name"
                            label="Tên sản phẩm"
                            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item name="price" label="Giá" rules={[{ required: true, message: 'Vui lòng nhập giá!' }]}>
                            <InputNumber
                                style={{ width: '100%' }}
                                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>

                        <Form.Item
                            name="discount"
                            label="Giảm giá (%)"
                            rules={[{ required: true, message: 'Vui lòng nhập % giảm giá!' }]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                max={100}
                                formatter={(value) => `${value}%`}
                                parser={(value) => value.replace('%', '')}
                            />
                        </Form.Item>
                    </div>

                    <div className={cx('form-row')}>
                        <Form.Item
                            name="category"
                            label="Danh mục"
                            rules={[{ required: true, message: 'Vui lòng chọn danh mục!' }]}
                        >
                            <Select>
                                {categories.map((item) => (
                                    <Select.Option value={item.id}>{item.name}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="stock"
                            label="Số lượng trong kho"
                            rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
                        >
                            <InputNumber style={{ width: '100%' }} min={0} />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="description"
                        label="Mô tả"
                        rules={[{ required: true, message: 'Vui lòng nhập mô tả!' }]}
                    >
                        <Editor
                            apiKey="hfm046cu8943idr5fja0r5l2vzk9l8vkj5cp3hx2ka26l84x"
                            init={{
                                plugins:
                                    'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
                                toolbar:
                                    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
                            }}
                            initialValue="Welcome to TinyMCE!"
                            onEditorChange={(content) => {
                                setEditorContent(content);
                                form.setFieldsValue({ description: content });
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="images"
                        label={`Hình ảnh ${fileList.length > 0 ? `(${fileList.length} ảnh)` : ''}`}
                        rules={[
                            {
                                required: !editingProduct,
                                message: 'Vui lòng tải lên ít nhất 1 hình ảnh!',
                            },
                        ]}
                        extra={
                            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>
                                Ảnh sẽ được tải lên khi lưu sản phẩm. Tối đa 10MB mỗi ảnh.
                                {fileList.some(f => f.originFileObj) && (
                                    <div style={{ color: '#1890ff', marginTop: '2px' }}>
                                        {fileList.filter(f => f.originFileObj).length} ảnh mới sẽ được tải lên
                                    </div>
                                )}
                            </div>
                        }
                    >
                        <Upload {...uploadProps}>
                            {fileList.length >= 8 ? null : (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Thêm ảnh</div>
                                </div>
                            )}
                        </Upload>
                        {fileList.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <Button 
                                    type="dashed" 
                                    onClick={handleGenerateInfo}
                                    style={{ width: '100%' }}
                                >
                                    🤖 Sinh thông tin từ hình ảnh
                                </Button>
                                <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                    Sinh thông tin bằng những hình ảnh được chọn cho những trường đã chọn
                                </div>
                            </div>
                        )}
                    </Form.Item>

                    {productType === 'pc' && (
                        <>
                            <div className={cx('form-row')}>
                                <Form.Item name="cpu" label="CPU">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="main" label="Mainboard">
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="ram" label="RAM">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="storage" label="Ổ cứng">
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="gpu" label="Card đồ họa">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="power" label="Nguồn">
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="caseComputer" label="Case">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="coolers" label="Tản nhiệt">
                                    <Input />
                                </Form.Item>
                            </div>
                        </>
                    )}
                </Form>
            </Modal>

            <Modal
                title="Nhập sản phẩm từ CSV"
                open={csvModalOpen}
                onOk={handleCsvUpload}
                onCancel={() => {
                    setCsvModalOpen(false);
                    setCsvFiles([]);
                    setCsvErrors([]);
                    setCsvSuccess('');
                }}
                confirmLoading={csvUploading}
                okText="Nhập"
                cancelText="Hủy"
                width={600}
            >
                <div style={{ marginBottom: '16px' }}>
                    <p>
                        <strong>Hướng dẫn định dạng CSV:</strong>
                    </p>
                    <ul>
                        <li>Có thể chọn nhiều file CSV cùng lúc</li>
                        <li>
                            File phải có header với các cột bắt buộc: name, price, description, images, categoryId,
                            stock, componentType
                        </li>
                        <li>Các cột tùy chọn: discount, cpu, main, ram, storage, gpu, power, caseComputer, coolers</li>
                        <li>
                            componentType phải là một trong: cpu, mainboard, ram, hdd, ssd, vga, power, cooler, case,
                            monitor, keyboard, mouse, headset, pc
                        </li>
                        <li>Sử dụng dấu phẩy (,) để phân tách các cột</li>
                    </ul>

                    <p>
                        <strong>Ví dụ header:</strong>
                    </p>
                    <code
                        style={{
                            display: 'block',
                            padding: '8px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '12px',
                            overflow: 'auto',
                        }}
                    >
                        name,price,description,images,categoryId,stock,componentType,discount
                    </code>
                </div>

                <Upload {...csvUploadProps} accept=".csv">
                    <Button icon={<UploadOutlined />}>Chọn file CSV (nhiều file)</Button>
                </Upload>

                {csvFiles.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                        <strong>Đã chọn {csvFiles.length} file.</strong>
                        {/* <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                            {csvFiles.map((file, index) => (
                                <li key={index}>{file.name}</li>
                            ))}
                        </ul> */}
                    </div>
                )}

                {/* Success Message */}
                {csvSuccess && (
                    <div
                        style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '6px',
                            color: '#52c41a',
                        }}
                    >
                        <strong>✓ {csvSuccess}</strong>
                    </div>
                )}

                {/* Error Messages */}
                {csvErrors.length > 0 && (
                    <div
                        style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#fff2f0',
                            border: '1px solid #ffccc7',
                            borderRadius: '6px',
                            color: '#ff4d4f',
                        }}
                    >
                        <strong>⚠ Lỗi khi nhập CSV:</strong>
                        <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px' }}>
                            {csvErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </Modal>

            <Modal
                title="Re-embed tất cả sản phẩm"
                open={reEmbedModalOpen}
                onOk={handleReEmbedConfirm}
                onCancel={() => {
                    setReEmbedModalOpen(false);
                    setReEmbedError('');
                    setReEmbedSuccess('');
                }}
                confirmLoading={reEmbedLoading}
                okText="Xác nhận"
                cancelText="Hủy"
                okType="danger"
                width={600}
            >
                <div style={{ marginBottom: '16px' }}>
                    <p>
                        <strong>⚠️ Cảnh báo:</strong>
                    </p>
                    <p>
                        Bạn có muốn xóa và re-embed tất cả sản phẩm không? Quá trình này có thể rất tốn kém thời gian và
                        chi phí.
                    </p>

                    <ul style={{ marginTop: '12px', color: '#666' }}>
                        <li>Tất cả embeddings hiện tại sẽ bị xóa</li>
                        <li>Toàn bộ sản phẩm sẽ được re-embed lại</li>
                        <li>Quá trình có thể mất vài phút đến vài giờ tùy thuộc vào số lượng sản phẩm</li>
                        <li>Chi phí API OpenAI sẽ được tính cho mỗi sản phẩm</li>
                    </ul>
                </div>

                {/* Success Message */}
                {reEmbedSuccess && (
                    <div
                        style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#f6ffed',
                            border: '1px solid #b7eb8f',
                            borderRadius: '6px',
                            color: '#52c41a',
                        }}
                    >
                        <strong>✓ {reEmbedSuccess}</strong>
                    </div>
                )}

                {/* Error Messages */}
                {reEmbedError && (
                    <div
                        style={{
                            marginTop: '12px',
                            padding: '8px 12px',
                            backgroundColor: '#fff2f0',
                            border: '1px solid #ffccc7',
                            borderRadius: '6px',
                            color: '#ff4d4f',
                        }}
                    >
                        <strong>⚠ Lỗi khi re-embed:</strong>
                        <p style={{ marginTop: '8px', marginBottom: '0' }}>{reEmbedError}</p>
                    </div>
                )}
            </Modal>
            <Modal
                title="Sinh thông tin từ hình ảnh"
                open={generateModalOpen}
                onOk={handleGenerateConfirm}
                onCancel={() => {
                    setGenerateModalOpen(false);
                    setGenerateError('');
                    setGenerateSuccess('');
                }}
                confirmLoading={generateLoading}
                okText="Sinh thông tin"
                cancelText="Hủy"
                width={600}
            >
                <div style={{ marginBottom: '16px' }}>
                    <p><strong>🤖 Sinh thông tin sản phẩm từ hình ảnh</strong></p>
                    <p>Chọn các trường thông tin bạn muốn AI tự động sinh ra từ {fileList.length} hình ảnh đã chọn:</p>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={selectedFields.name}
                                onChange={(e) => handleFieldSelectionChange('name', e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Tên sản phẩm
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={selectedFields.description}
                                onChange={(e) => handleFieldSelectionChange('description', e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Mô tả
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={selectedFields.category}
                                onChange={(e) => handleFieldSelectionChange('category', e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Danh mục
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                checked={selectedFields.componentType}
                                onChange={(e) => handleFieldSelectionChange('componentType', e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Loại sản phẩm
                        </label>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                        <strong>Thông tin linh kiện (chỉ áp dụng cho PC hoặc linh kiện cụ thể):</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.cpu}
                                    onChange={(e) => handleFieldSelectionChange('cpu', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                CPU
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.mainboard}
                                    onChange={(e) => handleFieldSelectionChange('mainboard', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Mainboard
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.ram}
                                    onChange={(e) => handleFieldSelectionChange('ram', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                RAM
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.storage}
                                    onChange={(e) => handleFieldSelectionChange('storage', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Ổ cứng
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.gpu}
                                    onChange={(e) => handleFieldSelectionChange('gpu', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Card đồ họa
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.powerSupply}
                                    onChange={(e) => handleFieldSelectionChange('powerSupply', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Nguồn
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.case}
                                    onChange={(e) => handleFieldSelectionChange('case', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Case
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedFields.cooler}
                                    onChange={(e) => handleFieldSelectionChange('cooler', e.target.checked)}
                                    style={{ marginRight: '8px' }}
                                />
                                Tản nhiệt
                            </label>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f0f8ff', borderRadius: '6px', fontSize: '12px' }}>
                    <strong>💡 Lưu ý:</strong>
                    <ul style={{ marginBottom: 0, paddingLeft: '16px' }}>
                        <li>AI sẽ phân tích {fileList.length} hình ảnh để sinh thông tin</li>
                        <li>Kết quả có thể không chính xác 100%, vui lòng kiểm tra và chỉnh sửa</li>
                        <li>Chỉ các trường được chọn sẽ được cập nhật</li>
                        <li>Thông tin linh kiện chỉ có ích cho sản phẩm PC hoặc linh kiện cụ thể</li>
                    </ul>
                </div>

                {/* Success Message */}
                {generateSuccess && (
                    <div style={{ 
                        marginTop: '12px', 
                        padding: '8px 12px', 
                        backgroundColor: '#f6ffed', 
                        border: '1px solid #b7eb8f',
                        borderRadius: '6px',
                        color: '#52c41a'
                    }}>
                        <strong>✓ {generateSuccess}</strong>
                    </div>
                )}

                {/* Error Messages */}
                {generateError && (
                    <div style={{ 
                        marginTop: '12px', 
                        padding: '8px 12px', 
                        backgroundColor: '#fff2f0', 
                        border: '1px solid #ffccc7',
                        borderRadius: '6px',
                        color: '#ff4d4f'
                    }}>
                        <strong>⚠ Lỗi khi sinh thông tin:</strong>
                        <p style={{ marginTop: '8px', marginBottom: '0' }}>{generateError}</p>
                    </div>
                )}
            </Modal>        </div>
    );
}

export default ManagerProduct;
