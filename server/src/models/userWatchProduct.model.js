const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const userWatchProduct = connect.define(
    'userWatchProduct',
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
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
    },
    {
        freezeTableName: true,
    },
);

module.exports = userWatchProduct;
