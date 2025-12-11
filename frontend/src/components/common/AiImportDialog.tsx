import React, { useState, useRef, useEffect } from 'react';
import {
    Box, TextField, Paper, IconButton, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { AutoFixHigh, Close } from '@mui/icons-material';
import client from '../../api/client';


interface AiImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (data: any) => void;
}

const AiImportDialog: React.FC<AiImportDialogProps> = ({ open, onClose, onImport }) => {
    const [input, setInput] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    const handleExtract = async () => {
        if (!input.trim()) return;

        setIsExtracting(true);
        try {
            // We pass the raw input as the prompt. History is empty since this is a one-shot operation.
            const response = await client.post('/ai/extract', {
                prompt: input,
                history: []
            });

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
            handleExtract();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <AutoFixHigh color="primary" />
                    AI Assisted Import
                </Box>
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                        Post a URL to an existing solution (GitHub, Website, PDF) or describe it in detail. The AI will research and auto-fill the form for you.
                    </Paper>

                    <TextField
                        inputRef={inputRef}
                        fullWidth
                        placeholder="e.g. https://github.com/example/project or 'A water monitoring system that uses LoRaWAN...'"
                        variant="outlined"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isExtracting}
                        multiline
                        minRows={4}
                        maxRows={8}
                        autoFocus
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} color="inherit" disabled={isExtracting}>Cancel</Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleExtract}
                    disabled={isExtracting || !input.trim()}
                    startIcon={isExtracting ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
                    sx={{ minWidth: 150 }}
                >
                    {isExtracting ? 'Analyzing...' : 'Generate Solution'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AiImportDialog;
