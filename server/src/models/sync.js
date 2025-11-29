const Category = require('../models/category.model');
const Product = require('../models/products.model');
const User = require('../models/users.model');
const apiKey = require('../models/apiKey.model');
const cart = require('./cart.model');
const payments = require('./payments.model');
const modelBuildPcCart = require('./buildPcCart.model');
const userWatchProduct = require('./userWatchProduct.model');
const productPreview = require('./productPreview');
const otp = require('./otp.model');
const blogs = require('./blogs.model');
const contact = require('./contact.model');
const chatbot = require('./chatbot.model');
const chatbotConversation = require('./chatbotConversation.model');

// Thiết lập các mối quan hệ giữa các model
// User - ApiKey: Đã được định nghĩa trong apiKey.model.js
User.hasOne(apiKey, { foreignKey: 'userId' });
apiKey.belongsTo(User, { foreignKey: 'userId' });

// Category - Products: One-to-Many (Một category có nhiều products)
Category.hasMany(Product, { foreignKey: 'categoryId' });
Product.belongsTo(Category, { foreignKey: 'categoryId' });

// User - Cart: One-to-Many (Một user có nhiều items trong cart)
User.hasMany(cart, { foreignKey: 'userId' });
cart.belongsTo(User, { foreignKey: 'userId' });

// Product - Cart: One-to-Many (Một product có thể có nhiều lần trong nhiều cart)
Product.hasMany(cart, { foreignKey: 'productId' });
cart.belongsTo(Product, { foreignKey: 'productId' });

// User - Payment: One-to-Many (Một user có nhiều payments)
User.hasMany(payments, { foreignKey: 'userId' });
payments.belongsTo(User, { foreignKey: 'userId' });

// Product - Payment: One-to-Many (Một product có thể được mua nhiều lần)
Product.hasMany(payments, { foreignKey: 'productId' });
payments.belongsTo(Product, { foreignKey: 'productId' });

// User - BuildPcCart: One-to-Many (Một user có thể tạo nhiều PC build)
User.hasMany(modelBuildPcCart, { foreignKey: 'userId' });
modelBuildPcCart.belongsTo(User, { foreignKey: 'userId' });

// Product - BuildPcCart: One-to-Many (Một product có thể được sử dụng trong nhiều PC build)
Product.hasMany(modelBuildPcCart, { foreignKey: 'productId' });
modelBuildPcCart.belongsTo(Product, { foreignKey: 'productId' });

// User - UserWatchProduct: One-to-Many (Một user có thể theo dõi nhiều product)
User.hasMany(userWatchProduct, { foreignKey: 'userId' });
userWatchProduct.belongsTo(User, { foreignKey: 'userId' });

// Product - UserWatchProduct: One-to-Many (Một product có thể được theo dõi bởi nhiều user)
Product.hasMany(userWatchProduct, { foreignKey: 'productId' });
userWatchProduct.belongsTo(Product, { foreignKey: 'productId' });

// User - ProductPreview: One-to-Many (Một user có thể đánh giá nhiều product)
User.hasMany(productPreview, { foreignKey: 'userId' });
productPreview.belongsTo(User, { foreignKey: 'userId' });

// Product - ProductPreview: One-to-Many (Một product có thể có nhiều đánh giá)
Product.hasMany(productPreview, { foreignKey: 'productId' });
productPreview.belongsTo(Product, { foreignKey: 'productId' });

// User - ChatbotConversation: One-to-Many (Một user có nhiều conversations)
User.hasMany(chatbotConversation, { foreignKey: 'userId' });
chatbotConversation.belongsTo(User, { foreignKey: 'userId' });

// ChatbotConversation - Chatbot: One-to-Many (Một conversation có nhiều messages)
chatbotConversation.hasMany(chatbot, { foreignKey: 'conversationId' });
chatbot.belongsTo(chatbotConversation, { foreignKey: 'conversationId' });

const syncDatabase = async () => {
    try {
        await User.sync({ alter: false }); // Tạo bảng users trước
        await apiKey.sync({ alter: false }); // Sau đó tạo bảng apiKey
        await Category.sync({ alter: false }); // Tạo bảng category trước
        await Product.sync({ alter: false }); // Sau đó tạo bảng products
        await cart.sync({ alter: false });
        await payments.sync({ alter: false });
        await modelBuildPcCart.sync({ alter: false });
        await userWatchProduct.sync({ alter: false });
        await productPreview.sync({ alter: false });
        await otp.sync({ alter: false });
        await blogs.sync({ alter: false });
        await contact.sync({ alter: false });
        await chatbot.sync({ alter: true });
        await chatbotConversation.sync({ alter: true });
        console.log('✅ Database synchronized successfully!');
    } catch (error) {
        console.error('❌ Sync error:', error);
    }
};

module.exports = syncDatabase;
