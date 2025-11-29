const { DataTypes } = require('sequelize');
const { connect } = require('../config/index');

const products = connect.define(
    'products',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 500],
            },
        },
        price: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: {
                min: 0,
            },
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        discount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
                max: 100,
            },
        },
        images: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },
        categoryId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0,
            },
        },
        cpu: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        main: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ram: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        storage: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        gpu: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        power: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        caseComputer: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        coolers: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        componentType: {
            type: DataTypes.ENUM(
                'cpu',
                'mainboard',
                'ram',
                'hdd',
                'gpu',
                'power',
                'cooler',
                'case',
                'monitor',
                'keyboard',
                'mouse',
                'headset',
                'pc',
                'ssd',
                'vga',
            ),
            allowNull: false,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt
    },
);
module.exports = products;
