const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const Contact = connect.define(
    'contact',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        phone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        option1: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        option2: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        option3: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        option4: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
    },

    {
        freezeTableName: true,
    },
);

module.exports = Contact;
