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
    const [researchText, setResearchText] = useState('');
    const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when dialog opens
    useEffect(() => {
        if (open && step === 'INPUT') {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open, step]);

    useEffect(() => {
        if (open) {
            setInput('');
            setResearchText('');
            setStep('INPUT');
            setLoading(false);
        }
    }, [open]);

    const handleResearch = async () => {
        if (!input.trim()) return;

        setLoading(true);
        try {
            const response = await client.post('/ai/research', { prompt: input });
            if (response.data && response.data.researchText) {
                setResearchText(response.data.researchText);
                setStep('REVIEW');
            } else {
                alert('Could not research data.');
            }
        } catch (error: any) {
            console.error('Research failed:', error);
            const message = error.response?.data?.error || 'Failed to research solution. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async () => {
        if (!researchText.trim()) return;

        setLoading(true);
        try {
            const response = await client.post('/ai/extract-structured', { researchText });
            if (response.data) {
                onImport(response.data);
                onClose();
            } else {
                alert('Could not extract data.');
            }
        } catch (error: any) {
            console.error('Extraction failed:', error);
            const message = error.response?.data?.error || 'Failed to generate form. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (step === 'INPUT') handleResearch();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <AutoFixHigh color="primary" />
                    {step === 'INPUT' ? 'AI Assisted Import' : 'Review Research'}
                </Box>
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {step === 'INPUT' ? (
                        <>
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
                                disabled={loading}
                                multiline
                                minRows={4}
                                maxRows={8}
                                autoFocus
                            />
                        </>
                    ) : (
                        <>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2 }}>
                                Review the research below. You can edit this text to correct any errors (e.g., ensure only one Domain is listed) before generating the form.
                            </Paper>
                            <TextField
                                fullWidth
                                label="Research Results"
                                variant="outlined"
                                value={researchText}
                                onChange={(e) => setResearchText(e.target.value)}
                                disabled={loading}
                                multiline
                                minRows={10}
                                maxRows={20}
                            />
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
                <Button onClick={onClose} color="inherit" disabled={loading}>Cancel</Button>
                {step === 'REVIEW' && (
                    <Button onClick={() => setStep('INPUT')} color="inherit" disabled={loading}>
                        Back
                    </Button>
                )}
                <Button
                    variant="contained"
                    color="primary"
                    onClick={step === 'INPUT' ? handleResearch : handleExtract}
                    disabled={loading || (step === 'INPUT' ? !input.trim() : !researchText.trim())}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHigh />}
                    sx={{ minWidth: 150 }}
                >
                    {loading ? 'Processing...' : (step === 'INPUT' ? 'Analyze' : 'Generate Form')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AiImportDialog;
