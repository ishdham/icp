import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Container } from '@mui/material';
import frontendBuildInfo from '../build-info.json';

interface BuildInfo {
    commitHash: string;
    commitMessage: string;
    commitDate: string;
    buildDate: string;
}

const About = () => {
    const [backendBuildInfo, setBackendBuildInfo] = useState<BuildInfo | null>(null);

    useEffect(() => {
        // Fetch backend build info
        const fetchBackendInfo = async () => {
            try {
                // Assuming standard API base URL from Vite env or relative
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/icp-demo-480309/us-central1/api/v1';
                const response = await fetch(`${API_BASE}/system-info`);
                if (response.ok) {
                    const data = await response.json();
                    setBackendBuildInfo(data);
                }
            } catch (error) {
                console.error('Failed to fetch backend build info', error);
            }
        };

        fetchBackendInfo();
    }, []);

    const DetailRow = ({ label, value }: { label: string, value: string }) => (
        <Box sx={{ display: 'flex', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 100, flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: label === 'Last Update:' ? 'italic' : 'normal' }}>
                {value}
            </Typography>
        </Box>
    );

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Card>
                    <CardHeader
                        title="About ICP Demo"
                        titleTypographyProps={{ variant: 'h5', color: 'primary.main', fontWeight: 'bold' }}
                    />
                    <CardContent>
                        <Typography variant="body1" paragraph>
                            ICP Demo is a demo platform created by <strong>Ish Dham</strong> (ish.dham@gmail.com)
                            to explore options for <a href="https://impactcollaborationplatform.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>https://impactcollaborationplatform.org/</a>.
                        </Typography>
                        <Typography variant="body1">
                            It is a demonstration and learning platform to explore various architecture and implementation details.
                        </Typography>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Build Details" titleTypographyProps={{ variant: 'h6' }} />
                    <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
                            {/* Frontend Details */}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                                    Frontend
                                </Typography>
                                <DetailRow label="Version:" value={frontendBuildInfo.commitHash} />
                                <DetailRow label="Build Date:" value={new Date(frontendBuildInfo.buildDate).toLocaleString()} />
                                <DetailRow label="Last Update:" value={`"${frontendBuildInfo.commitMessage}"`} />
                            </Box>

                            {/* Backend Details */}
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
                                    Backend
                                </Typography>
                                {backendBuildInfo ? (
                                    <>
                                        <DetailRow label="Version:" value={backendBuildInfo.commitHash} />
                                        <DetailRow label="Build Date:" value={new Date(backendBuildInfo.buildDate).toLocaleString()} />
                                        <DetailRow label="Last Update:" value={`"${backendBuildInfo.commitMessage}"`} />
                                    </>
                                ) : (
                                    <Typography variant="body2" color="warning.main" sx={{ animation: 'pulse 2s infinite' }}>
                                        Loading backend info...
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default About;
