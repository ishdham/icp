import { useState } from 'react';
import { rankWith, type ControlProps } from '@jsonforms/core';
import { Box, Button, Typography, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, CircularProgress, Link } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import axios from 'axios';

// Update with your API base URL
const API_BASE_URL = 'http://localhost:3000/v1';

const FileUploaderControl = (props: ControlProps) => {
    const { data, handleChange, path, enabled, label } = props;
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadedFiles: string[] = Array.isArray(data) ? data : [];

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setError(null);

        try {
            // Get current token if authentication is required (assuming localStorage or similar)
            // For now, relying on axios interceptors or just global config if set, otherwise need token
            const token = await (window as any).firebase?.auth().currentUser?.getIdToken();
            const headers: any = { 'Content-Type': 'multipart/form-data' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

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
        navigator.clipboard.writeText(`![Image](${url})`);
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {label}
            </Typography>

            <List dense>
                {uploadedFiles.map((url, index) => (
                    <ListItem key={index}>
                        <ListItemText
                            primary={
                                <Link href={url} target="_blank" rel="noopener noreferrer">
                                    {url.split('/').pop() || url}
                                </Link>
                            }
                            secondary={url}
                            primaryTypographyProps={{ noWrap: true, maxWidth: '300px' }}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="copy" onClick={() => handleCopy(url)} title="Copy Markdown Link">
                                <ContentCopyIcon />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemove(index)} disabled={!enabled}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>

            {error && <Typography color="error" variant="caption">{error}</Typography>}

            {enabled && (
                <Button
                    variant="outlined"
                    component="label"
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
    3,
    (uischema) => {
        return (uischema.options as any)?.renderer === 'file-uploader';
    }
);

export default FileUploaderControl;
