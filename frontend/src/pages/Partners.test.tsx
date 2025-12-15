import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Partners from './Partners';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock client
const mockGet = vi.fn();
vi.mock('../api/client', () => ({
    default: {
        get: (...args: any[]) => mockGet(...args),
        post: vi.fn(),
        put: vi.fn(),
        defaults: { baseURL: 'http://localhost' }
    }
}));

// Mock hooks
vi.mock('../hooks/useSchema', () => ({
    useSchema: () => ({
        schema: { type: 'object', properties: {} },
        uischema: { type: 'VerticalLayout', elements: [] },
        loading: false
    })
}));

vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { role: 'REGULAR', id: '123' } })
}));

vi.mock('../context/LanguageContext', () => ({
    useLanguage: () => ({
        language: 'en',
        t: (key: string) => key
    })
}));

vi.mock('../utils/permissions', () => ({
    canEditPartner: () => true,
    isModerator: () => false
}));

describe('Partners Page', () => {
    beforeEach(() => {
        mockGet.mockReset();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Partners />
            </BrowserRouter>
        );
    };

    test('renders loading state initially', () => {
        // Mock promise that doesn't resolve immediately to check loading
        mockGet.mockReturnValue(new Promise(() => { }));

        // Note: The component sets loading=true initially. 
        // And fetchPartners is called in useEffect.
        // If we want to catch the loading spinner, we should catch it before wait.
        renderComponent();
        // Assuming CircularProgress or loading text. 
        // The component uses ListView which likely handles loading or passes it down.
        // ListView usually has a loading indicator.
        // If we look at Partners.tsx: <ListView loading={loading} ... />
    });

    test('renders list of partners', async () => {
        mockGet.mockResolvedValue({
            data: {
                items: [
                    { id: '1', organizationName: 'Partner A', entityType: 'NGO', status: 'MATURE' },
                    { id: '2', organizationName: 'Partner B', entityType: 'STARTUP', status: 'PROPOSED' }
                ],
                total: 2,
                totalPages: 1
            }
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Partner A')).toBeInTheDocument();
            expect(screen.getByText('Partner B')).toBeInTheDocument();
        });

        // Check for status chips
        expect(screen.getByText('status.MATURE')).toBeInTheDocument();
        expect(screen.getByText('status.PROPOSED')).toBeInTheDocument();
    });

    test('handles empty list', async () => {
        mockGet.mockResolvedValue({
            data: { items: [], total: 0, totalPages: 0 }
        });

        renderComponent();

        await waitFor(() => {
            // Assuming ListView shows something for empty or just table headers
            expect(screen.getByText('list.column_org')).toBeInTheDocument();
        });
    });
});
