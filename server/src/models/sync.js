const category = require('../models/category.model');
const product = require('../models/products.model');
const user = require('../models/users.model');
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
user.hasOne(apiKey, { foreignKey: 'userId' });
apiKey.belongsTo(user, { foreignKey: 'userId' });

// Category - Products: One-to-Many (Một category có nhiều products)
category.hasMany(product, { foreignKey: 'categoryId' });
product.belongsTo(category, { foreignKey: 'categoryId' });

// User - Cart: One-to-Many (Một user có nhiều items trong cart)
user.hasMany(cart, { foreignKey: 'userId' });
cart.belongsTo(user, { foreignKey: 'userId' });

// Product - Cart: One-to-Many (Một product có thể có nhiều lần trong nhiều cart)
product.hasMany(cart, { foreignKey: 'productId' });
cart.belongsTo(product, { foreignKey: 'productId' });

// User - Payment: One-to-Many (Một user có nhiều payments)
user.hasMany(payments, { foreignKey: 'userId' });
payments.belongsTo(user, { foreignKey: 'userId' });

// Product - Payment: One-to-Many (Một product có thể được mua nhiều lần)
product.hasMany(payments, { foreignKey: 'productId' });
payments.belongsTo(product, { foreignKey: 'productId' });

// User - BuildPcCart: One-to-Many (Một user có thể tạo nhiều PC build)
user.hasMany(modelBuildPcCart, { foreignKey: 'userId' });
modelBuildPcCart.belongsTo(user, { foreignKey: 'userId' });

// Product - BuildPcCart: One-to-Many (Một product có thể được sử dụng trong nhiều PC build)
product.hasMany(modelBuildPcCart, { foreignKey: 'productId' });
modelBuildPcCart.belongsTo(product, { foreignKey: 'productId' });

// User - UserWatchProduct: One-to-Many (Một user có thể theo dõi nhiều product)
user.hasMany(userWatchProduct, { foreignKey: 'userId' });
userWatchProduct.belongsTo(user, { foreignKey: 'userId' });

// Product - UserWatchProduct: One-to-Many (Một product có thể được theo dõi bởi nhiều user)
product.hasMany(userWatchProduct, { foreignKey: 'productId' });
userWatchProduct.belongsTo(product, { foreignKey: 'productId' });

// User - ProductPreview: One-to-Many (Một user có thể đánh giá nhiều product)
user.hasMany(productPreview, { foreignKey: 'userId' });
productPreview.belongsTo(user, { foreignKey: 'userId' });

// Product - ProductPreview: One-to-Many (Một product có thể có nhiều đánh giá)
product.hasMany(productPreview, { foreignKey: 'productId' });
productPreview.belongsTo(product, { foreignKey: 'productId' });

// User - ChatbotConversation: One-to-Many (Một user có nhiều conversations)
user.hasMany(chatbotConversation, { foreignKey: 'userId' });
chatbotConversation.belongsTo(user, { foreignKey: 'userId' });

// ChatbotConversation - Chatbot: One-to-Many (Một conversation có nhiều messages)
chatbotConversation.hasMany(chatbot, { foreignKey: 'conversationId' });
chatbot.belongsTo(chatbotConversation, { foreignKey: 'conversationId' });

const syncDatabase = async () => {
    try {
        await user.sync({ alter: false }); // Tạo bảng users trước
        await apiKey.sync({ alter: false }); // Sau đó tạo bảng apiKey
        await category.sync({ alter: false }); // Tạo bảng category trước
        await product.sync({ alter: false }); // Sau đó tạo bảng products
        await cart.sync({ alter: false });
        await payments.sync({ alter: false });
        await modelBuildPcCart.sync({ alter: false });
        await userWatchProduct.sync({ alter: false });
        await productPreview.sync({ alter: false });
        await otp.sync({ alter: false });
        await blogs.sync({ alter: false });
        await contact.sync({ alter: false });
        await chatbotConversation.sync({ alter: false });
        await chatbot.sync({ alter: false });
        console.log('✅ Database synchronized successfully!');
    } catch (error) {
        console.error('❌ Sync error:', error);
    }
};

module.exports = syncDatabase;
