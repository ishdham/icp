import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    CardActions,
    Button,
    Box,
    Container,
    Paper
} from '@mui/material';
import {
    Description,
    Group,
    ConfirmationNumber,
    AddCircleOutline
} from '@mui/icons-material';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        solutions: 0,
        partners: 0,
        tickets: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [solRes, partnerRes, ticketRes] = await Promise.all([
                    client.get('/solutions'),
                    client.get('/partners'),
                    client.get('/tickets')
                ]);

                setStats({
                    solutions: solRes.data.items?.length || 0,
                    partners: partnerRes.data?.length || 0,
                    tickets: ticketRes.data?.length || 0
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchStats();
        } else {
            setLoading(false);
        }
    }, [user]);

    if (!user) {
        return (
            <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
                <Typography variant="h2" component="h1" gutterBottom>
                    Welcome to ICP
                </Typography>
                <Typography variant="h5" color="textSecondary" paragraph>
                    Impact Collaboration Platform
                </Typography>
                <Box mt={4}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        component={Link}
                        to="/login"
                    >
                        Get Started
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4 }}>
                Dashboard
            </Typography>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={4}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Description color="primary" sx={{ mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Total Solutions
                                </Typography>
                            </Box>
                            <Typography variant="h4">
                                {loading ? '...' : stats.solutions}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" component={Link} to="/solutions">View All</Button>
                        </CardActions>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Group color="primary" sx={{ mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    Active Partners
                                </Typography>
                            </Box>
                            <Typography variant="h4">
                                {loading ? '...' : stats.partners}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" component={Link} to="/partners">View All</Button>
                        </CardActions>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <ConfirmationNumber color="primary" sx={{ mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    My Tickets
                                </Typography>
                            </Box>
                            <Typography variant="h4">
                                {loading ? '...' : stats.tickets}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" component={Link} to="/tickets">View All</Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick Actions */}
            <Box mt={6}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    Quick Actions
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 3,
                                display: 'flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                                color: 'inherit',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: '0.3s'
                            }}
                            component={Link}
                            to="/solutions"
                        >
                            <AddCircleOutline color="primary" sx={{ fontSize: 40, mr: 2 }} />
                            <Box>
                                <Typography variant="h6">Submit a Solution</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Share your innovative solution with the platform.
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 3,
                                display: 'flex',
                                alignItems: 'center',
                                textDecoration: 'none',
                                color: 'inherit',
                                '&:hover': { bgcolor: 'action.hover' },
                                transition: '0.3s'
                            }}
                            component={Link}
                            to="/partners"
                        >
                            <AddCircleOutline color="primary" sx={{ fontSize: 40, mr: 2 }} />
                            <Box>
                                <Typography variant="h6">Propose a Partner</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Recommend a new partner organization.
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
};

export default Dashboard;
