const { Sequelize } = require('sequelize');
require('dotenv').config();

const connect = new Sequelize('computer', 'root', 'khoa123', {
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
