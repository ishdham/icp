import React from 'react';
import { rankWith, optionIs, type ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TextField, Box, Tabs, Tab, Typography } from '@mui/material';

const MarkdownControl = (props: ControlProps) => {
    const { data, handleChange, path, enabled } = props;
    const [tab, setTab] = React.useState(0);

    if (!enabled) {
        return (
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    {props.label}
                </Typography>
                <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 1, backgroundColor: '#fafafa' }}>
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            img: (props) => (
                                <Box
                                    component="img"
                                    src={props.src}
                                    alt={props.alt}
                                    sx={{ maxWidth: '100%', height: 'auto', display: 'block', mt: 1, mb: 1 }}
                                />
                            ),
                            a: (props) => (
                                <a
                                    href={props.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: '#1976d2', textDecoration: 'underline' }}
                                >
                                    {props.children}
                                </a>
                            )
                        }}
                    >
                        {data || ''}
                    </ReactMarkdown>
                </Box>
            </Box>
        );
    }

    const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
        setTab(newValue);
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                {props.label}
            </Typography>
            <Tabs value={tab} onChange={handleTabChange} aria-label="markdown-tabs">
                <Tab label="Edit" />
                <Tab label="Preview" />
            </Tabs>
            <Box hidden={tab !== 0} sx={{ mt: 1 }}>
                <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    variant="outlined"
                    value={data || ''}
                    onChange={(e) => handleChange(path, e.target.value)}
                    placeholder="Enter markdown..."
                    disabled={!enabled}
                />
            </Box>
            <Box hidden={tab !== 1} sx={{ mt: 1, p: 2, border: '1px solid #ccc', borderRadius: 1, minHeight: '100px', backgroundColor: '#fafafa' }}>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        img: (props) => (
                            <Box
                                component="img"
                                src={props.src}
                                alt={props.alt}
                                sx={{ maxWidth: '100%', height: 'auto', display: 'block', mt: 1, mb: 1 }}
                            />
                        ),
                        a: (props) => (
                            <a
                                href={props.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#1976d2', textDecoration: 'underline' }}
                            >
                                {props.children}
                            </a>
                        )
                    }}
                >
                    {data || ''}
                </ReactMarkdown>
            </Box>
        </Box>
    );
};

export const markdownRendererTester = rankWith(
    3, // Higher rank than default
    optionIs('format', 'markdown')
);

export default withJsonFormsControlProps(MarkdownControl);
