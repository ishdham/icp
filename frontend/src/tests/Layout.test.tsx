import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../context/AuthContext', async () => {
    const actual = await vi.importActual('../context/AuthContext');
    return {
        ...actual,
        useAuth: () => ({
            user: { email: 'test@example.com' },
            logout: vi.fn(),
        }),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    };
});

// Wrapper component to provide necessary contexts
const renderWithContext = (component: React.ReactNode) => {
    return render(
        <AuthProvider>
            <LanguageProvider>
                <BrowserRouter>
                    {component}
                </BrowserRouter>
            </LanguageProvider>
        </AuthProvider>
    );
};

describe('Layout Component', () => {
    it('renders the hamburger menu icon', () => {
        renderWithContext(<Layout />);
        const menuIcon = screen.getByLabelText('navigation menu');
        expect(menuIcon).toBeInTheDocument();
    });

    it('opens navigation menu when hamburger icon is clicked', () => {
        renderWithContext(<Layout />);
        const menuIcon = screen.getByLabelText('navigation menu');

        fireEvent.click(menuIcon);

        // Check if menu items are displayed
        const dashboardItems = screen.getAllByText('Dashboard');
        expect(dashboardItems.length).toBeGreaterThan(0);
        expect(dashboardItems[0]).toBeInTheDocument();
    });
});
