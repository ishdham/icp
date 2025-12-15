import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AiChatView from './AiChatView';
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock client to avoid baseURL error if undefined in test env
vi.mock('../../api/client', () => ({
    default: {
        defaults: {
            baseURL: 'http://localhost:3000'
        }
    }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AiChatView', () => {
    beforeEach(() => {
        mockFetch.mockReset();
    });

    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <AiChatView />
            </BrowserRouter>
        );
    };

    test('renders initial state with greeting', () => {
        renderComponent();
        expect(screen.getByText(/Hi! I'm your Innovation Co-Pilot./i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Type a message.../i)).toBeInTheDocument();
    });

    test('sends message and displays user message', async () => {
        // Mock successful stream response
        const mockStream = new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode('Hello from AI'));
                controller.close();
            }
        });

        mockFetch.mockResolvedValue({
            body: mockStream,
            ok: true
        });

        renderComponent();

        const input = screen.getByPlaceholderText(/Type a message.../i);
        fireEvent.change(input, { target: { value: 'Hello AI' } });

        const sendButton = screen.getByRole('button', { name: /send/i, hidden: true });
        // Note: IconButton might not have accessible name 'send' by default unless aria-label is set.
        // Looking at code: <IconButton disabled={...}> {isLoading ? ... : <Send />} </IconButton>
        // It doesn't have aria-label. So we might need to find by role button and index or check for Send icon.
        // Best practice is to add aria-label to the component, but I can't modify it right now easily without changing task.
        // I'll try to find by svg or just all buttons.

        // Actually, let's just press Enter.
        fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        expect(await screen.findByText('Hello AI')).toBeInTheDocument();

        // Wait for AI response
        await waitFor(() => {
            expect(screen.getByText('Hello from AI')).toBeInTheDocument();
        });
    });

    test('handles fetch error', async () => {
        mockFetch.mockRejectedValue(new Error('Network error'));

        renderComponent();

        const input = screen.getByPlaceholderText(/Type a message.../i);
        fireEvent.change(input, { target: { value: 'Error test' } });
        fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

        await waitFor(() => {
            expect(screen.getByText(/Sorry, something went wrong/i)).toBeInTheDocument();
        });
    });
});
