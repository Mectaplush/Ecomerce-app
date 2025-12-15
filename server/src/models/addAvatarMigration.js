const { connect } = require('../config/index');
const User = require('./users.model');

const addAvatarColumn = async () => {
    try {
        console.log('🔄 Adding avatar column to users table...');

        // Sync với alter: true để thêm cột mới
        await User.sync({ alter: true });

        console.log('✅ Avatar column added successfully!');
        console.log('You can now restart the server normally.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding avatar column:', error);
        process.exit(1);
    }
};

// Chạy migration
addAvatarColumn();
