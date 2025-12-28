const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const payments = connect.define(
    'payments',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        idPayment: {
            type: DataTypes.STRING,
            allowNull: false,
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
        status: {
            type: DataTypes.ENUM('pending', 'completed', 'delivered', 'cancelled'),
            allowNull: false,
        },
        typePayment: {
            type: DataTypes.STRING,
            allowNull: false,
        },
    },
    {
        freezeTableName: true,
    },
);
module.exports = payments;
