const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const chatbot = connect.define(
    'chatbot',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        conversationId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        sender: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },

    {
        freezeTableName: true,
    },
);

module.exports = chatbot;
