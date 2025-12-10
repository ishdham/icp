import { useState } from 'react';
import { rankWith, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Box, Button, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress, Link } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';

import { auth } from '../../../config/firebase'; // Import auth directly

// Update with your API base URL if needed, or use relative if proxy is set up
// But usually for localhost dev:
const API_BASE_URL = 'http://localhost:3000/v1';

const FileUploaderControl = (props: ControlProps) => {
    const { data, handleChange, path, enabled, label } = props;
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadedFiles: string[] = Array.isArray(data) ? data : [];

    // Helper to extract display name from URL
    // URL structure: .../uploads/UUID-filename
    // We want 'filename'
    const getDisplayName = (url: string) => {
        try {
            const decodedUrl = decodeURIComponent(url);
            const basename = decodedUrl.split('/').pop() || '';
            // UUID (v4) is 36 chars + 1 hyphen = 37 chars prefix
            // Check if it starts with a UUID-like pattern
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/;
            if (uuidPattern.test(basename)) {
                return basename.replace(uuidPattern, '');
            }
            return basename;
        } catch (e) {
            return url;
        }
    };

    const isImage = (filename: string) => {
        return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(filename);
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setError(null);

        try {
            // Get current token
            const token = await auth.currentUser?.getIdToken();
            const headers: any = { 'Content-Type': 'multipart/form-data' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            console.log('Uploading file with token:', token ? 'Token present' : 'No token');

            // We can also leverage existing axios instance if it has interceptors
            const response = await axios.post(`${API_BASE_URL}/common/upload`, formData, {
                headers: headers
            });

            const newUrl = response.data.url;
            const updatedFiles = [...uploadedFiles, newUrl];
            handleChange(path, updatedFiles);
        } catch (err) {
            console.error('Upload failed', err);
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleRemove = (indexToRemove: number) => {
        const updatedFiles = uploadedFiles.filter((_, index) => index !== indexToRemove);
        handleChange(path, updatedFiles);
    };

    const handleCopy = (url: string) => {
        const displayName = getDisplayName(url);
        const image = isImage(displayName);

        let encodedUrl = url;
        try {
            // 1. Decode first to avoid double-encoding if it handles mixed states
            const decoded = decodeURI(url);
            // 2. Encode using standard URI rules (handles space, <, >, etc.)
            encodedUrl = encodeURI(decoded);
            // 3. Explicitly encode Markdown-breaking characters that encodeURI misses
            // '(' -> %28, ')' -> %29
            encodedUrl = encodedUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
        } catch (e) {
            console.warn('Failed to normalize URL encoding:', e);
            // Fallback to basic space replacement if something fails
            encodedUrl = url.replace(/ /g, '%20');
        }

        const markdown = `${image ? '!' : ''}[${displayName}](${encodedUrl})`;
        navigator.clipboard.writeText(markdown);
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {label}
            </Typography>

            <List dense>
                {uploadedFiles.map((url, index) => {
                    const displayName = getDisplayName(url);
                    return (
                        <ListItem key={index} divider={index < uploadedFiles.length - 1} sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 0.5 }}>
                            <ListItemText
                                primary={
                                    <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover">
                                        {displayName}
                                    </Link>
                                }
                                secondary={url}
                                secondaryTypographyProps={{ variant: 'caption', noWrap: true, sx: { maxWidth: '300px', display: 'block' } }}
                            />
                            <ListItemSecondaryAction>
                                <IconButton edge="end" aria-label="copy" onClick={() => handleCopy(url)} title="Copy Markdown Link" size="small" sx={{ mr: 1 }}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(index)} disabled={!enabled} size="small" color="error">
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </ListItemSecondaryAction>
                        </ListItem>
                    );
                })}
            </List>

            {error && <Typography color="error" variant="caption" sx={{ display: 'block', mb: 1 }}>{error}</Typography>}

            {enabled && (
                <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={uploading ? <CircularProgress size={20} /> : <CloudUploadIcon />}
                    disabled={uploading}
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input
                        type="file"
                        hidden
                        onChange={handleUpload}
                    />
                </Button>
            )}
        </Box>
    );
};

export const fileUploaderTester = rankWith(
    5,
    (uischema) => {
        return (uischema.options as any)?.renderer === 'file-uploader';
    }
);

export default withJsonFormsControlProps(FileUploaderControl);
