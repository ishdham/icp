import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeWrapper } from './components/common/ThemeWrapper';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/Layout';
import Login from './pages/Login';
import Solutions from './pages/Solutions';
import Partners from './pages/Partners';
import Tickets from './pages/Tickets';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import About from './pages/About';

// Placeholder pages
// const Home = () => <div className="text-center mt-10"><h1 className="text-2xl font-bold">Welcome to ICP</h1><p>Impact Collaboration Platform</p></div>;

function App() {
  console.log('App component rendering');
  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeWrapper>
          <ErrorBoundary>
            <Router>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="solutions" element={<Solutions />} />
                  <Route path="solutions/:id" element={<Solutions />} />
                  <Route path="partners" element={<Partners />} />
                  <Route path="partners/:id" element={<Partners />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="tickets/:id" element={<Tickets />} />
                  <Route path="users" element={<Users />} />
                  <Route path="users/:id" element={<Users />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="about" element={<About />} />
                  <Route path="login" element={<Login />} />
                </Route>
              </Routes>
            </Router>
          </ErrorBoundary>
        </ThemeWrapper>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
