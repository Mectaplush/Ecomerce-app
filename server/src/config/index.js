const { Sequelize } = require('sequelize');
require('dotenv').config();

const connect = new Sequelize(process.env.DATABASE_NAME, 
    process.env.DATABASE_USERNAME, 
    process.env.DATABASE_PASSWORD, {
    host: 'localhost',
    dialect: 'mysql',
    port: process.env.MYSQL_PORT,
});

const connectDB = async () => {
    try {
        await connect.authenticate();
        console.log('Connect Database Success!');
    } catch (error) {
        console.error('error connect database:', error);
    }
};

module.exports = { connectDB, connect };
