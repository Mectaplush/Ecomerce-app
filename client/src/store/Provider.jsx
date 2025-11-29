import Context from './Context';
import CryptoJS from 'crypto-js';

import cookies from 'js-cookie';

import { useEffect, useState } from 'react';
import { requestGetCategory, requestAuth, requestGetCart } from '../config/request';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});

    const [dataCart, setDataCart] = useState([]);

    const fetchAuth = async () => {
        try {
            const res = await requestAuth();
            const bytes = CryptoJS.AES.decrypt(res.metadata, import.meta.env.VITE_SECRET_CRYPTO);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);
            if (!originalText) {
                console.error('Failed to decrypt data');
                return;
            }
            const user = JSON.parse(originalText);
            setDataUser(user);
        } catch (error) {
            console.error('Auth error:', error);
        }
    };

    const [category, setCategory] = useState([]);

    const fetchCategory = async () => {
        const res = await requestGetCategory();
        setCategory(res);
    };

    const fetchCart = async () => {
        const res = await requestGetCart();
        setDataCart(res.metadata);
    };

    useEffect(() => {
        const token = cookies.get('logged');

        if (!token) {
            return;
        }
        fetchAuth();
        fetchCart();
    }, []);

    useEffect(() => {
        fetchCategory();
    }, []);

    return (
        <Context.Provider
            value={{
                category,
                dataUser,
                fetchAuth,
                dataCart,
                fetchCart,
            }}
        >
            {children}
        </Context.Provider>
    );
}
