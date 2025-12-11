import React, { useState, useRef, useEffect } from 'react';
import {
    Box, TextField, Paper, IconButton, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip
} from '@mui/material';
import { Send, SmartToy, AutoFixHigh, Close } from '@mui/icons-material';
import client from '../../api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

interface AiImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (data: any) => void;
}

const AiImportDialog: React.FC<AiImportDialogProps> = ({ open, onClose, onImport }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Reset chat when dialog opens
    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'ai',
                content: "Hi! I can help you import a solution. Describe it here, paste links, or provide details. When you're ready, click 'Auto-Fill Form'."
            }]);
        }
    }, [open]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const aiMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: '' }]);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            // Standard chat endpoint for conversation
            const response = await fetch(`${client.defaults.baseURL || 'http://localhost:3000'}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage.content, history: history })
            });

            if (!response.body) throw new Error('No response body');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                aiContent += text;
                setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: aiContent } : msg));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, content: 'Sorry, communication failed.' } : msg));
        } finally {
            setIsLoading(false);
        }
    };

    const handleExtract = async () => {
        setIsExtracting(true);
        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));
            const response = await client.post('/ai/extract', { history });

            if (response.data) {
                onImport(response.data);
                onClose();
            } else {
                alert('Could not extract data.');
            }
        } catch (error: any) {
            console.error('Extraction failed:', error);
            const message = error.response?.data?.error || error.response?.data?.details || 'Failed to auto-fill form. Please try adding more details.';
            alert(message);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <SmartToy color="primary" />
                    AI Assisted Import
                </Box>
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ height: '50vh', display: 'flex', flexDirection: 'column', p: 0 }}>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {messages.map((msg) => (
                        <Box key={msg.id} sx={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', display: 'flex', gap: 1 }}>
                            {msg.role === 'ai' && <SmartToy color="primary" sx={{ mt: 1, fontSize: 20 }} />}
                            <Paper elevation={1} sx={{ p: 2, bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100', color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary', borderRadius: 2 }}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </Paper>
                        </Box>
                    ))}
                    <div ref={messagesEndRef} />
                </Box>

                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            inputRef={inputRef}
                            fullWidth
                            placeholder="Describe the solution you want to import or paste a link..."
                            variant="outlined"
                            size="small"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            disabled={isLoading || isExtracting}
                            multiline
                            maxRows={3}
                        />

                        <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || isLoading || isExtracting}>
                            {isLoading ? <CircularProgress size={24} /> : <Send />}
                        </IconButton>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Box>
                    <Tooltip title="Uses Gemini 3.0 Pro reasoning to populate the form" arrow>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleExtract}
                            disabled={isExtracting || messages.length < 2}
                            startIcon={isExtracting ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
                        >
                            {isExtracting ? 'Analyzing...' : 'Auto-Fill Form'}
                        </Button>
                    </Tooltip>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default AiImportDialog;
