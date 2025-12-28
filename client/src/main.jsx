import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import { publicRoutes } from './routes/index.jsx';
import Layout from './Components/Layout/Layout.jsx';

import { Provider } from './store/Provider.jsx';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Provider>
            <Router>
                <Routes>
                    <Route element={<Layout />}>
                        {publicRoutes.map((route, index) => {
                            const Page = route.component;
                            return <Route key={index} path={route.path} element={route.component} />;
                        })}
                    </Route>
                </Routes>
            </Router>
        </Provider>
    </StrictMode>,
);
