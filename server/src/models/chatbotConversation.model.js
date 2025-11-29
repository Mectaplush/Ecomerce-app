const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const ChatbotConversation = connect.define(
    'chatbotConversation',
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
        status: {
            type: DataTypes.ENUM('spam', 'interested', 'pending'),
            defaultValue: 'pending',
            allowNull: false,
        },
        lastMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        messageCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
    },
    {
        freezeTableName: true,
        timestamps: true,
    },
);

module.exports = ChatbotConversation;
