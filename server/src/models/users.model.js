const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const User = connect.define(
    'users',
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
        email: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isAdmin: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: '0',
        },
        typeLogin: {
            type: DataTypes.ENUM('google', 'email'),
            allowNull: false,
        },
        avatar: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null,
        },
    },
    {
        freezeTableName: true, // Giữ nguyên tên bảng là 'users'
        timestamps: true,
    },
);

module.exports = User;
