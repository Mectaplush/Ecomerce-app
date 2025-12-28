import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Chatbot from '../../utils/Chatbot/Chatbot';

function Layout() {
    const location = useLocation();
    const isAdminPage = location.pathname.startsWith('/admin');

    return (
        <>
            <Outlet />
            {!isAdminPage && <Chatbot />}
        </>
    );
}

export default Layout;
