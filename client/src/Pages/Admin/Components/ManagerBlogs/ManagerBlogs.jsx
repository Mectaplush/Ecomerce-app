import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Upload, Space, Popconfirm, message } from 'antd';
import { UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { requestGetBlogs, requestCreateBlog, requestDeleteBlog, requestUploadImage } from '../../../../config/request';
import { Editor } from '@tinymce/tinymce-react';

function ManagerBlogs() {
    const [blogs, setBlogs] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [imageUrl, setImageUrl] = useState('');
    const [messageApi, contextHolder] = message.useMessage();
    const [editorContent, setEditorContent] = useState('');
    const [editorRef, setEditorRef] = useState(null);

    const fetchBlogs = async () => {
        try {
            const response = await requestGetBlogs();
            setBlogs(response.metadata || []);
        } catch (error) {
            messageApi.error('Failed to fetch blogs');
            console.error('Error fetching blogs:', error);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    const handleAddBlog = () => {
        form.resetFields();
        setImageUrl('');
        setEditorContent('');
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    const handleImageUpload = async (options) => {
        const { file, onSuccess, onError } = options;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await requestUploadImage(formData);
            setImageUrl(response.image);
            onSuccess();
            messageApi.success('Image uploaded successfully');
        } catch (error) {
            onError();
            messageApi.error('Failed to upload image');
            console.error('Error uploading image:', error);
        }
    };

    const handleSubmit = async (values) => {
        if (!imageUrl) {
            messageApi.error('Please upload an image');
            return;
        }

        try {
            // Get the current content directly from the editor
            let content = '';
            if (editorRef) {
                content = editorRef.getContent();
            }

            // Create a simple object with primitive values only
            const blogData = {
                title: values.title,
                image: imageUrl,
                content: content,
                description: values.description || '',
            };

            // Use fetch directly to avoid axios serialization issues
            const response = await fetch('http://localhost:3000/api/create-blog', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(blogData),
                credentials: 'include',
            });

            const data = await response.json();

            if (response.ok) {
                messageApi.success('Blog created successfully');
                setModalVisible(false);
                fetchBlogs();
                form.resetFields();
                setImageUrl('');
                setEditorContent('');
            } else {
                messageApi.error(data.message || 'Failed to create blog');
            }
        } catch (error) {
            messageApi.error('Failed to create blog');
            console.error('Error creating blog:', error);
        }
    };

    const handleDeleteBlog = async (id) => {
        try {
            await requestDeleteBlog(id);
            messageApi.success('Blog deleted successfully');
            fetchBlogs();
        } catch (error) {
            messageApi.error('Failed to delete blog');
            console.error('Error deleting blog:', error);
        }
    };

    const columns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Ảnh bìa',
            dataIndex: 'image',
            key: 'image',
            render: (image) => (
                <img src={image} alt="Blog" style={{ width: '100px', height: '60px', objectFit: 'cover' }} />
            ),
        },

        {
            title: 'Hành động',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa bài viết này không?"
                        onConfirm={() => handleDeleteBlog(record.id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button danger icon={<DeleteOutlined />}>
                            Xóa
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '20px' }}>
            {contextHolder}
            <div
                style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <h2>Quản lý bài viết</h2>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddBlog}>
                    Thêm bài viết
                </Button>
            </div>

            <Table columns={columns} dataSource={blogs} rowKey="id" pagination={{ pageSize: 10 }} />

            <Modal title="Thêm bài viết" open={modalVisible} onCancel={handleCancel} footer={null} width={800}>
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="Nhập tiêu đề" />
                    </Form.Item>

                    <Form.Item label="Ảnh bìa" required>
                        <Upload customRequest={handleImageUpload} listType="picture-card" showUploadList={false}>
                            {imageUrl ? (
                                <img
                                    src={imageUrl}
                                    alt="Cover"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : (
                                <div>
                                    <UploadOutlined />
                                    <div style={{ marginTop: 8 }}>Tải lên</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    <Form.Item label="Mô tả" required>
                        <Editor
                            apiKey="hfm046cu8943idr5fja0r5l2vzk9l8vkj5cp3hx2ka26l84x"
                            onInit={(evt, editor) => setEditorRef(editor)}
                            init={{
                                plugins:
                                    'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
                                toolbar:
                                    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
                                height: 300,
                            }}
                            initialValue="Welcome to TinyMCE!"
                            value={editorContent}
                            onChange={(e) => setEditorContent(e.target.getContent())}
                        />
                    </Form.Item>

                    <Form.Item>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <Button onClick={handleCancel}>Cancel</Button>
                            <Button type="primary" htmlType="submit">
                                Thêm
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}

export default ManagerBlogs;
