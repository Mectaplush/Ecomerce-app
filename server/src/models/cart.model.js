const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const cart = connect.define(
    'cart',
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
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING(500),
            allowNull: true,
            validate: {
                len: {
                    args: [10, 500],
                    msg: 'Địa chỉ phải có từ 10 đến 500 ký tự'
                },
                isValidAddress(value) {
                    if (value && !/^[\p{L}\p{N}\s,.\-/()]+$/u.test(value)) {
                        throw new Error('Địa chỉ chứa ký tự không hợp lệ');
                    }
                }
            }
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

module.exports = cart;
