const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const Category = connect.define(
    'category',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        image: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },

    {
        freezeTableName: true,
    },
);

module.exports = Category;
