const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const modelApiKey = require('../models/apiKey.model');
const { BadUserRequestError } = require('../core/error.response');
const { jwtDecode } = require('jwt-decode');

require('dotenv').config();

const createApiKey = async (userId) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

    const privateKeyString = privateKey.export({ type: 'pkcs8', format: 'pem' });
    const publicKeyString = publicKey.export({ type: 'spki', format: 'pem' });

    const newApiKey = new modelApiKey({ userId, publicKey: publicKeyString, privateKey: privateKeyString });
    return await newApiKey.save();
};

const createToken = async (payload) => {
    const findApiKey = await modelApiKey.findOne({ where: { userId: payload.id } });

    if (!findApiKey?.privateKey) {
        throw new Error('Private key not found for user');
    }

    return jwt.sign(payload, findApiKey.privateKey, {
        algorithm: 'RS256', // Quan trọng: Phải chỉ định thuật toán khi dùng RSA
        expiresIn: '15m',
    });
};

const createRefreshToken = async (payload) => {
    const findApiKey = await modelApiKey.findOne({ where: { userId: payload.id } });

    if (!findApiKey?.privateKey) {
        throw new Error('Private key not found for user');
    }

    return jwt.sign(payload, findApiKey.privateKey, {
        algorithm: 'RS256',
        expiresIn: '7d',
    });
};

const verifyToken = async (token) => {
    try {
        const { id } = jwtDecode(token);
        const findApiKey = await modelApiKey.findOne({ where: { userId: id } });

        if (!findApiKey) {
            throw new BadUserRequestError('Vui lòng đăng nhập lại');
        }

        return jwt.verify(token, findApiKey.publicKey, {
            algorithms: ['RS256'],
        });
    } catch (error) {
        throw new BadUserRequestError('Vui lòng đăng nhập lại');
    }
};

module.exports = {
    createApiKey,
    createToken,
    createRefreshToken,
    verifyToken,
};
