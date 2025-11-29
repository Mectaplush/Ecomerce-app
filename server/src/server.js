require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;

// Configure server for handling large payloads
app.use(express.json({
    limit: '50mb',
    parameterLimit: 50000,
    type: ['application/json', 'text/plain']
}));

app.use(express.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));

const { connectDB } = require('./config/index');
const routes = require('./routes/index');
const syncDatabase = require('./models/sync');
const { askQuestion } = require('./utils/Chatbot');

const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser());

// Request logging middleware for debugging large payloads
app.use((req, res, next) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
        const sizeInMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
        if (sizeInMB > 10) {
            console.log(`Large request detected: ${req.method} ${req.url} - Size: ${sizeInMB}MB`);
        }
    }

    req.setTimeout(300000, () => {
        const err = new Error('Request timeout - processing took too long');
        err.statusCode = 408;
        next(err);
    });

    next();
});

connectDB();
syncDatabase();

app.post('/api/chat', async (req, res) => {
    const { question, images } = req.body;
    const data = await askQuestion(question, images);
    return res.status(200).json(data);
});

routes(app);

app.use(express.static(path.join(__dirname, '../src')));

app.use((err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Lỗi server';

    // Handle specific error types
    if (err.type === 'entity.too.large' || err.message.includes('request entity too large')) {
        statusCode = 413;
        message = 'Dữ liệu gửi lên quá lớn. Vui lòng giảm kích thước hình ảnh hoặc số lượng hình ảnh.';
        console.error('Payload too large error - Request size exceeded 50MB limit');
    } else if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 413;
        message = 'File tải lên quá lớn. Kích thước tối đa cho phép là 50MB.';
    }

    // Log the error
    console.error('Error occurred:', err.message);
    console.error('Stack trace:', err.stack);
    console.error('Request:', req.method, req.url);
    console.error('Content-Length:', req.headers['content-length']);

    res.status(statusCode).json({
        success: false,
        message: message,
        errorCode: err.code || 'INTERNAL_ERROR'
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
