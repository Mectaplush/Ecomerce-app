const express = require('express');
const app = express();
const port = 3000;

const { connectDB } = require('./config/index');
const routes = require('./routes/index');
const syncDatabase = require('./models/sync');
const { askQuestion } = require('./utils/Chatbot');

const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

connectDB();
syncDatabase();

app.post('/api/chat', async (req, res) => {
    const { question } = req.body;
    const data = await askQuestion(question);
    return res.status(200).json(data);
});

routes(app);

app.use(express.static(path.join(__dirname, '../src')));

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Lỗi server',
    });
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
