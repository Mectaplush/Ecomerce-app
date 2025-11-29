const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const buildPcCart = connect.define(
    'buildPcCart',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        componentType: {
            type: DataTypes.ENUM(
                'cpu',
                'mainboard',
                'ram',
                'hdd',
                'ssd',
                'vga',
                'power',
                'cooler',
                'case',
                'monitor',
                'keyboard',
                'mouse',
                'headset',
            ),
            allowNull: false,
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        totalPrice: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
    },
    {
        freezeTableName: true,
    },
);

module.exports = buildPcCart;
