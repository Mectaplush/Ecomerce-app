import './App.css';
import Footer from './Components/Footer/Footer';
import Header from './Components/Header/Header';
import HomePage from './Components/HomePage/HomePage';

function App() {
    return (
        <div>
            <header>
                <Header />
            </header>

            <main className="main">
                <HomePage />
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default App;
