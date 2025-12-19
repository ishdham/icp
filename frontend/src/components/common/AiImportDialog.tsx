import React, { useState, useRef, useEffect } from 'react';
import {
    Box, TextField, Paper, IconButton, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Alert, Chip
} from '@mui/material';
import { AutoFixHigh, Close, CloudUpload, Delete } from '@mui/icons-material';
import client from '../../api/client';


interface AiImportDialogProps {
    open: boolean;
    onClose: () => void;
    onImport: (data: any) => void;
    type?: 'solution' | 'partner';
}

const AiImportDialog: React.FC<AiImportDialogProps> = ({ open, onClose, onImport, type = 'solution' }) => {
    const [input, setInput] = useState('');
    const [researchText, setResearchText] = useState('');
    const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
    const [loading, setLoading] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<{ name: string; content: string; mimeType: string } | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            setWarning(null);
            setAttachment(null);
        }
    }, [open]);

    const handleResearch = async () => {
        if (!input.trim() && !attachment) return;

        setLoading(true);
        setWarning(null);
        try {
            const payload: any = { prompt: input, type };
            if (attachment) {
                payload.attachments = [{
                    type: 'file',
                    content: attachment.content,
                    mimeType: attachment.mimeType
                }];
            }

            const response = await client.post('/ai/research', payload);
            if (response.data && response.data.researchText) {
                setResearchText(response.data.researchText);
                if (response.data.warning) {
                    setWarning(response.data.warning);
                }
                setStep('REVIEW');
            } else {
                alert('Could not research data.');
            }
        } catch (error: any) {
            console.error('Research failed:', error);
            const message = error.response?.data?.error || 'Failed to research. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async () => {
        if (!researchText.trim()) return;

        setLoading(true);
        try {
            const response = await client.post('/ai/extract-structured', { researchText, type });
            if (response.data) {
                onImport(response.data);
                onClose();
            } else {
                alert('Could not extract data.');
            }
        } catch (error: any) {
            console.error('Extraction failed:', error);
            const message = error.response?.data?.details || error.response?.data?.error || 'Failed to generate form. Please try again.';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Limit size to 5MB
            if (file.size > 5 * 1024 * 1024) {
                alert('File is too large. Max 5MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                setAttachment({
                    name: file.name,
                    content: ev.target?.result as string,
                    mimeType: file.type
                });
            };
            reader.readAsDataURL(file);
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
                    {step === 'INPUT' ? `AI Assisted ${type === 'partner' ? 'Partner' : 'Solution'} Import` : 'Review Research'}
                </Box>
                <IconButton onClick={onClose}><Close /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {step === 'INPUT' ? (
                        <>
                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText', borderRadius: 2 }}>
                                {type === 'partner'
                                    ? "Describe the partner organization or upload a document (PDF, Image). The AI will research and extract details."
                                    : "Post a URL to an existing solution (GitHub, Website, PDF) or describe it in detail. The AI will research and auto-fill the form for you."
                                }
                            </Paper>
                            <TextField
                                inputRef={inputRef}
                                fullWidth
                                placeholder={type === 'partner'
                                    ? "e.g. 'Acme NGO works on water sanitation in Kenya...'"
                                    : "e.g. https://github.com/example/project or 'A water monitoring system...'"
                                }
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

                            <Box display="flex" alignItems="center" gap={2}>
                                <input
                                    type="file"
                                    hidden
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,application/pdf,text/plain"
                                />
                                <Button
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading}
                                >
                                    Upload Document/Image
                                </Button>
                                {attachment && (
                                    <Chip
                                        label={attachment.name}
                                        onDelete={() => setAttachment(null)}
                                        deleteIcon={<Delete />}
                                        color="primary"
                                        variant="outlined"
                                    />
                                )}
                            </Box>
                        </>
                    ) : (
                        <>
                            {warning && (
                                <Alert severity="warning" sx={{ mb: 2 }}>
                                    {warning}
                                </Alert>
                            )}
                            <Paper elevation={0} sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText', borderRadius: 2 }}>
                                Review the research below. You can edit this text to correct any errors before generating the form.
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
                    disabled={loading || (step === 'INPUT' ? (!input.trim() && !attachment) : !researchText.trim())}
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
