import React from 'react';
import { Box, Typography } from '@mui/material';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null, errorInfo: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("Global Error Boundary caught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box p={4} display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh">
                    <Typography variant="h4" color="error" gutterBottom>Something went wrong.</Typography>
                    <Typography title={this.state.error?.message} variant="body1" color="textSecondary" gutterBottom>
                        {this.state.error?.message}
                    </Typography>
                    <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1} maxWidth="800px" overflow="auto">
                        <Typography component="pre" style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                            {this.state.errorInfo?.componentStack || this.state.error?.stack}
                        </Typography>
                    </Box>
                </Box>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
