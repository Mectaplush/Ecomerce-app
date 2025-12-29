const userRoutes = require('./users.routes');
const productRoutes = require('./products.routes');
const categoryRoutes = require('./category.routes');
const cartRoutes = require('./cart.routes');
const paymentsRoutes = require('./payments.routes');
const productPreviewRoutes = require('./productPreview.routes');
const blogsRoutes = require('./blogs.routes');
const contactRoutes = require('./contact.routes');
const typesenseSearchRoutes = require('./typesenseSearch.routes');
const addressRoutes = require('./address.routes');
const multer = require('multer');
const path = require('path');
const chatbotRoutes = require('./chatbot.routes');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'src/uploads/images');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

var upload = multer({ storage: storage });

function routes(app) {
    app.post('/api/register', userRoutes);
    app.post('/api/login', userRoutes);
    app.get('/api/auth', userRoutes);
    app.get('/api/refresh-token', userRoutes);
    app.get('/api/logout', userRoutes);
    app.post('/api/update-info-user', userRoutes);
    app.get('/api/dashboard', userRoutes);
    app.get('/api/get-users', userRoutes);
    app.post('/api/login-google', userRoutes);
    app.get('/api/admin', userRoutes);
    app.get('/api/get-order-stats', userRoutes);
    app.post('/api/forgot-password', userRoutes);
    app.post('/api/reset-password', userRoutes);
    app.post('/api/update-role-user', userRoutes);
    app.get('/api/users/pie-chart', userRoutes);
    app.post('/api/upload-avatar', userRoutes);
    app.delete('/api/delete-avatar', userRoutes);

    ///// product
    app.post('/api/create-product', productRoutes);
    app.get('/api/get-products', productRoutes);
    app.post('/api/update-product', productRoutes);
    app.delete('/api/delete-product', productRoutes);
    app.get('/api/get-products-by-categories', productRoutes);
    app.get('/api/get-product-by-id', productRoutes);
    app.get('/api/get-product-by-component-type', productRoutes);
    app.post('/api/build-pc-cart', productRoutes);
    app.get('/api/get-cart-build-pc', productRoutes);
    app.post('/api/update-quantity-cart-build-pc', productRoutes);
    app.post('/api/delete-cart-build-pc', productRoutes);
    app.post('/api/create-product-watch', productRoutes);
    app.get('/api/get-product-watch', productRoutes);
    app.get('/api/get-product-by-id-category', productRoutes);
    app.get('/api/get-product-hot-sale', productRoutes);
    app.get('/api/get-product-search', productRoutes);
    app.get('/api/get-product-search-by-category', productRoutes);
    app.post('/api/insert-products-by-csv', productRoutes);
    app.post('/api/re-embed-all-products', productRoutes);
    app.get('/api/similar-products/:productId', productRoutes);
    app.post('/api/generate-product-data-from-images', productRoutes);

    //// category
    app.post('/api/create-category', categoryRoutes);
    app.get('/api/get-all-category', categoryRoutes);
    app.delete('/api/delete-category', categoryRoutes);
    app.post('/api/update-category', categoryRoutes);
    app.get('/api/get-category-by-component-types', categoryRoutes);
    app.get('/api/get-all-products', categoryRoutes);

    //// cart
    app.post('/api/add-to-cart', cartRoutes);
    app.get('/api/get-cart', cartRoutes);
    app.post('/api/delete-cart', cartRoutes);
    app.post('/api/update-info-cart', cartRoutes);
    app.post('/api/add-to-cart-build-pc', cartRoutes);
    app.post('/api/update-quantity', cartRoutes);
    app.get('/api/get-cart-build-pc', cartRoutes);
    app.post('/api/delete-all-cart-build-pc', cartRoutes);

    ///// payments
    app.post('/api/payments', paymentsRoutes);
    app.get('/api/check-payment-momo', paymentsRoutes);
    app.get('/api/check-payment-vnpay', paymentsRoutes);
    app.post('/api/cancel-order', paymentsRoutes);
    app.get('/api/get-payment', paymentsRoutes);
    app.get('/api/get-payments', paymentsRoutes);
    app.get('/api/get-order-admin', paymentsRoutes);
    app.post('/api/update-order-status', paymentsRoutes);

    //// product preview
    app.post('/api/create-product-preview', productPreviewRoutes);
    app.get('/api/get-product-preview-user', productPreviewRoutes);
    app.put('/api/update-product-preview', productPreviewRoutes);
    app.delete('/api/delete-product-preview', productPreviewRoutes);

    //// blogs
    app.post('/api/create-blog', blogsRoutes);
    app.get('/api/get-blogs', blogsRoutes);
    app.delete('/api/delete-blog', blogsRoutes);
    app.get('/api/get-blog-by-id', blogsRoutes);

    //// contact
    app.post('/api/create-contact', contactRoutes);
    app.get('/api/get-contacts', contactRoutes);

    //// address
    app.use('/api', addressRoutes);

    app.post('/api/upload', upload.single('image'), (req, res) => {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.json({
            message: 'Uploaded successfully',
            image: `http://localhost:3000/uploads/images/${file.filename}`,
        });
    });

    /// chatbot
    app.use('/api', chatbotRoutes);

    //// typesense search
    app.use('/api/typesense', typesenseSearchRoutes);

    app.post('/api/uploads', upload.array('images'), (req, res) => {
        const file = req.files;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const images = file.map((file) => {
            return `http://localhost:3000/uploads/images/${file.filename}`;
        });
        res.json({
            message: 'Uploaded successfully',
            images,
        });
    });
}

module.exports = routes;
