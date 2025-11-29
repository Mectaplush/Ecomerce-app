import App from '../App';
import Admin from '../Pages/Admin/Index';
import BuildPc from '../Pages/BuildPc/BuildPc';
import Cart from '../Pages/Cart/Cart';
import DetailProduct from '../Pages/DetailProduct/DetailProduct';
import ForgotPassword from '../Pages/ForgotPassword/ForgotPassword';
import Index from '../Pages/InfoUser';
import LoginUser from '../Pages/LoginUser/LoginUser';
import RegisterUser from '../Pages/Register/RegisterUser';
import Checkout from '../Pages/Checkout/PaymentSuccess';
import Category from '../Pages/Category/Category';
import Quotation from '../Pages/Quotation/Quotation';
import DetailBlogs from '../Pages/DetailBlogs/DetailBlogs';
import Contact from '../Pages/Contact/Contact';
import Blogs from '../Pages/Blogs/Blogs';
import SearchProduct from '../Pages/SearchProduct/SearchProduct';
export const publicRoutes = [
    { path: '/', component: <App /> },
    { path: '/admin', component: <Admin /> },
    { path: '/login', component: <LoginUser /> },
    { path: '/register', component: <RegisterUser /> },
    { path: '/forgot-password', component: <ForgotPassword /> },
    { path: '/products/:id', component: <DetailProduct /> },
    { path: '/buildpc', component: <BuildPc /> },
    { path: '/cart', component: <Cart /> },
    { path: '/payment/:id', component: <Checkout /> },
    { path: '/profile', component: <Index /> },
    { path: '/category/:id', component: <Category /> },
    { path: '/quotation', component: <Quotation /> },
    { path: '/orders', component: <Index /> },
    { path: '/blog/:id', component: <DetailBlogs /> },
    { path: '/contact', component: <Contact /> },
    { path: '/category', component: <Category /> },
    { path: '/blogs', component: <Blogs /> },
    { path: '/search/:category/:nameProduct', component: <SearchProduct /> },
];
