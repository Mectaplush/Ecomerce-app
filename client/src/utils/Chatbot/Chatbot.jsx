import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './Chatbot.module.scss';
import { requestChatbot, requestGetChatbot } from '../../config/request';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faTimes, faPaperclip, faImage, faTrash } from '@fortawesome/free-solid-svg-icons';

// Memoized ReactMarkdown components outside component to prevent recreation
const markdownComponents = {
    p: ({ children }) => <p className={styles.markdownParagraph}>{children}</p>,
    ul: ({ children }) => <ul className={styles.markdownList}>{children}</ul>,
    ol: ({ children }) => <ol className={styles.markdownOrderedList}>{children}</ol>,
    li: ({ children }) => <li className={styles.markdownListItem}>{children}</li>,
    strong: ({ children }) => <strong className={styles.markdownBold}>{children}</strong>,
    em: ({ children }) => <em className={styles.markdownItalic}>{children}</em>,
    code: ({ children, inline }) => 
        inline ? 
            <code className={styles.markdownInlineCode}>{children}</code> : 
            <code className={styles.markdownCodeBlock}>{children}</code>,
    h1: ({ children }) => <h1 className={styles.markdownH1}>{children}</h1>,
    h2: ({ children }) => <h2 className={styles.markdownH2}>{children}</h2>,
    h3: ({ children }) => <h3 className={styles.markdownH3}>{children}</h3>,
};

// Memoized Message component outside main component for better performance
const Message = memo(({ message, index }) => (
    <div
        className={`${styles.message} ${
            message.sender === 'user' ? styles.userMessage : styles.botMessage
        } ${message.sender === 'bot' && message.isMultimodal ? styles.multimodalMessage : ''} ${
            message.sender === 'user' && message.images ? styles.hasImages : ''
        }`}
    >
        <div className={styles.messageContent}>
            {message.sender === 'bot' ? (
                <div className={styles.markdownContent}>
                    <ReactMarkdown components={markdownComponents}>
                        {message.content}
                    </ReactMarkdown>
                </div>
            ) : (
                message.content
            )}
            {message.images && (
                <div className={styles.messageImages}>
                    {message.images.map((image, imgIndex) => (
                        <img
                            key={imgIndex}
                            src={image}
                            alt={`Uploaded ${imgIndex + 1}`}
                            className={styles.messageImage}
                        />
                    ))}
                </div>
            )}
        </div>
    </div>
));

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { content: 'Xin chào! Tôi là trợ lý bán hàng. Tôi có thể giúp gì cho bạn?', sender: 'bot' },
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImages, setSelectedImages] = useState([]);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Debounced scroll effect to reduce performance impact
    useEffect(() => {
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
    }, [messages]);

    useEffect(() => {
        const loadChatbotData = async () => {
            try {
                const response = await requestGetChatbot();
                setMessages(response.metadata || []);
            } catch (error) {
                console.error('Failed to load chatbot data:', error);
            }
        };

        loadChatbotData();
    }, []);

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
            const newImages = imageFiles.map(file => ({
                file,
                preview: URL.createObjectURL(file),
                id: Date.now() + Math.random()
            }));
            setSelectedImages(prev => [...prev, ...newImages]);
        }
    };

    const removeImage = (imageId) => {
        setSelectedImages(prev => {
            const imageToRemove = prev.find(img => img.id === imageId);
            if (imageToRemove) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            return prev.filter(img => img.id !== imageId);
        });
    };

    const convertImageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if ((inputMessage.trim() || selectedImages.length > 0) && !isLoading) {
            const userMessage = inputMessage.trim();
            const hasImages = selectedImages.length > 0;
            
            // Add user message with images to chat
            const messageContent = userMessage || (hasImages ? 
                `Đã gửi ${selectedImages.length} hình ảnh để tìm sản phẩm tương tự` : 
                'Tin nhắn trống');
            
            setMessages((prev) => [...prev, { 
                content: messageContent, 
                sender: 'user',
                images: hasImages ? selectedImages.map(img => img.preview) : null,
                imageCount: selectedImages.length
            }]);
            
            setInputMessage('');
            setIsLoading(true);

            try {
                // Convert images to base64 if any
                let imageData = null;
                if (hasImages) {
                    imageData = await Promise.all(
                        selectedImages.map(img => convertImageToBase64(img.file))
                    );
                }

                const response = await requestChatbot({ 
                    question: userMessage,
                    images: imageData
                });
                
                // Enhanced bot message with multimodal info
                const botMessage = {
                    content: response.metadata,
                    sender: 'bot',
                    isMultimodal: hasImages,
                    hasClipSearch: hasImages && imageData.length > 0
                };
                
                setMessages((prev) => [...prev, botMessage]);
                
                // Clear selected images after sending
                selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
                setSelectedImages([]);
            } catch (error) {
                setMessages((prev) => [
                    ...prev,
                    {
                        content: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại sau.',
                        sender: 'bot',
                    },
                ]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            <button className={styles.chatButton} onClick={() => setIsOpen(true)} aria-label="Mở chat">
                <FontAwesomeIcon icon={faComments} />
            </button>

            {isOpen && (
                <div className={styles.chatbotContainer}>
                    <div className={styles.chatHeader}>
                        <h2>Hỗ trợ người dùng</h2>
                        <button className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Đóng chat">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>
                    <div className={styles.messageList}>
                        {messages.map((message, index) => (
                            <Message key={index} message={message} index={index} />
                        ))}
                        {isLoading && (
                            <div className={`${styles.message} ${styles.botMessage}`}>
                                <div className={styles.messageContent}>
                                    <span className={styles.typingIndicator}>Đang nhập...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className={styles.inputForm}>
                        {selectedImages.length > 0 && (
                            <div className={styles.imagePreview}>
                                <div className={styles.previewContainer}>
                                    {selectedImages.map((image) => (
                                        <div key={image.id} className={styles.previewItem}>
                                            <img src={image.preview} alt="Preview" className={styles.previewImage} />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(image.id)}
                                                className={styles.removeImageButton}
                                                title="Xóa hình ảnh"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {selectedImages.length > 3 && (
                                    <div className={styles.imageCount}>
                                        +{selectedImages.length - 3} ảnh khác
                                    </div>
                                )}
                            </div>
                        )}
                        <div className={styles.inputRow}>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Nhập tin nhắn của bạn..."
                                className={styles.input}
                                disabled={isLoading}
                            />
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                multiple
                                className={styles.hiddenFileInput}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className={styles.attachButton}
                                disabled={isLoading}
                                title="Đính kèm hình ảnh"
                            >
                                <FontAwesomeIcon icon={faImage} />
                            </button>
                            <button 
                                type="submit" 
                                className={styles.sendButton} 
                                disabled={isLoading || (inputMessage.trim() === '' && selectedImages.length === 0)}
                            >
                                Gửi
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default Chatbot;
