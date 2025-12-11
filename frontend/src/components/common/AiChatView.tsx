import React, { useState, useRef, useEffect } from 'react';
import { Box, TextField, Typography, Paper, IconButton, CircularProgress, Chip } from '@mui/material';
import { Send, SmartToy, Person } from '@mui/icons-material';
import client from '../../api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

const AiChatView = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
        // Placeholder for AI message
        setMessages(prev => [...prev, { id: aiMessageId, role: 'ai', content: '' }]);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            // Using fetch directly for streaming support since axios streaming is trickier in browser
            const response = await fetch(`${client.defaults.baseURL || 'http://localhost:3000'}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    history: history
                })
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

                setMessages(prev => prev.map(msg =>
                    msg.id === aiMessageId ? { ...msg, content: aiContent } : msg
                ));
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === aiMessageId ? { ...msg, content: 'Sorry, something went wrong. Please try again.' } : msg
            ));
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Messages Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.length === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.7 }}>
                        <SmartToy sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
                        <Typography variant="h6" gutterBottom>Hi! I'm your Innovation Co-Pilot.</Typography>
                        <Typography variant="body1">Ask me about solutions, partners, or domains.</Typography>
                        <Box sx={{ mt: 3, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Chip label="What water solutions are available?" onClick={() => setInput("What water solutions are available?")} clickable />
                            <Chip label="Tell me about energy partners" onClick={() => setInput("Tell me about energy partners")} clickable />
                            <Chip label="Any solutions for education?" onClick={() => setInput("Any solutions for education?")} clickable />
                        </Box>
                    </Box>
                )}
                {messages.map((msg) => (
                    <Box
                        key={msg.id}
                        sx={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '70%',
                            display: 'flex',
                            gap: 1
                        }}
                    >
                        {msg.role === 'ai' && <SmartToy color="primary" sx={{ mt: 1 }} />}
                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                                borderRadius: 2,
                                '& p': { m: 0 }
                            }}
                        >
                            {msg.role === 'user' ? (
                                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            ) : (
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        a: ({ node, ...props }) => {
                                            if (props.href && props.href.startsWith('/')) {
                                                return <Link to={props.href} style={{ color: '#1976d2', textDecoration: 'underline' }}>{props.children}</Link>;
                                            }
                                            return <a target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'underline' }} {...props} />;
                                        },
                                        img: ({ node, ...props }) => (
                                            <Box
                                                component="img"
                                                src={props.src}
                                                alt={props.alt}
                                                sx={{ maxWidth: '100%', height: 'auto', display: 'block', mt: 1, mb: 1, borderRadius: 1 }}
                                            />
                                        )
                                    }}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            )}
                        </Paper>
                        {msg.role === 'user' && <Person color="action" sx={{ mt: 1 }} />}
                    </Box>
                ))}
                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder="Type a message..."
                        variant="outlined"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        multiline
                        maxRows={4}
                    />
                    <IconButton
                        color="primary"
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        sx={{ alignSelf: 'flex-end', mb: 0.5 }}
                    >
                        {isLoading ? <CircularProgress size={24} /> : <Send />}
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default AiChatView;
