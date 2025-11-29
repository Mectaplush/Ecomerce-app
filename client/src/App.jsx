import './App.css';
import Footer from './Components/Footer/Footer';
import Header from './Components/Header/Header';
import HomePage from './Components/HomePage/HomePage';
import Chatbot from './utils/Chatbot/Chatbot';

function App() {
    return (
        <div>
            <header>
                <Header />
            </header>

            <main className="main">
                <HomePage />
            </main>

            <Chatbot />
            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default App;
