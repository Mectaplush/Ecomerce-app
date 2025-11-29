import { Table, Button, Space, Modal, Form, Input, InputNumber, Upload, Select, message } from 'antd';

import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

import { Editor } from '@tinymce/tinymce-react';

import styles from './ManagerProduct.module.scss';
import classNames from 'classnames/bind';
import {
    requestCreateProduct,
    requestGetCategory,
    requestGetProducts,
    requestUploadImages,
    requestUpdateProduct,
    requestDeleteProduct,
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
        form.validateFields()
            .then(async (values) => {
                let imageUrls = [];

                // Handle image uploads only if there are new images
                const newImages = fileList.filter((file) => file.originFileObj);
                if (newImages.length > 0) {
                    const formData = new FormData();
                    newImages.forEach((file) => {
                        formData.append('images', file.originFileObj);
                    });
                    const resImages = await requestUploadImages(formData);

                    // Combine new uploaded images with existing images
                    const existingImages = fileList.filter((file) => !file.originFileObj).map((file) => file.url);
                    imageUrls = [...existingImages, ...resImages.images];
                } else {
                    // Keep existing images if no new uploads
                    imageUrls = fileList.map((file) => file.url);
                }

                const data = {
                    ...values,
                    description: editorContent,
                    images: imageUrls.join(','),
                    componentType: productType,
                };

                if (editingProduct) {
                    const data2 = {
                        ...values,
                        description: editorContent,
                        images: imageUrls.join(','),
                        componentType: productType,
                        category: categories.find((item) => item.name === values.category)?.id,
                        id: editingProduct.id,
                    };

                    data.id = editingProduct.id;
                    await requestUpdateProduct(data2);
                } else {
                    await requestCreateProduct(data);
                }

                await fetchProducts();
                form.resetFields();
                setFileList([]);
                setEditorContent('');
                message.success(`${editingProduct ? 'Cập nhật' : 'Thêm'} sản phẩm thành công`);
                setIsModalOpen(false);
            })
            .catch((info) => {
                console.log('Validate Failed:', info);
                message.error(info?.response?.data.message);
            });
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
            return false; // Prevent auto upload
        },
        onChange: (info) => {
            setFileList(info.fileList);
        },
        fileList,
        multiple: true,
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2>Quản lý sản phẩm</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm sản phẩm
                </Button>
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
                onCancel={() => setIsModalOpen(false)}
                width={800}
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
                            onEditorChange={(content, editor) => {
                                setEditorContent(content);
                                form.setFieldsValue({ description: content });
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="images"
                        label="Hình ảnh"
                        rules={[
                            {
                                required: !editingProduct,
                                message: 'Vui lòng tải lên ít nhất 1 hình ảnh!',
                            },
                        ]}
                    >
                        <Upload {...uploadProps} listType="picture-card">
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Tải ảnh</div>
                            </div>
                        </Upload>
                    </Form.Item>

                    {productType === 'pc' && (
                        <>
                            <div className={cx('form-row')}>
                                <Form.Item name="cpu" label="CPU" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="main" label="Mainboard" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="ram" label="RAM" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="storage" label="Ổ cứng" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="gpu" label="Card đồ họa" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="power" label="Nguồn" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </div>

                            <div className={cx('form-row')}>
                                <Form.Item name="caseComputer" label="Case" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item name="coolers" label="Tản nhiệt" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                            </div>
                        </>
                    )}
                </Form>
            </Modal>
        </div>
    );
}

export default ManagerProduct;
