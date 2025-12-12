import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    Grid,
    Card,
    CardContent,
    Typography,
    CardActions,
    Button,
    Box,
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
    const { t } = useLanguage();
    const [stats, setStats] = useState({
        solutions: 0,
        partners: 0,
        tickets: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await client.get('/stats');
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    return (
        <Box>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4 }}>
                {t('nav.dashboard')}
            </Typography>
            {/* Dashboard Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Stats Cards */}
                <Grid size={{ xs: 12, sm: 6, md: user ? 4 : 6 }}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Description color="primary" sx={{ mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    {t('dashboard.total_solutions')}
                                </Typography>
                            </Box>
                            <Typography variant="h4">
                                {loading ? '...' : stats.solutions}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" component={Link} to="/solutions">{t('common.view_all')}</Button>
                        </CardActions>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6, md: user ? 4 : 6 }}>
                    <Card elevation={2}>
                        <CardContent>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Group color="primary" sx={{ mr: 1 }} />
                                <Typography color="textSecondary" gutterBottom>
                                    {t('dashboard.active_partners')}
                                </Typography>
                            </Box>
                            <Typography variant="h4">
                                {loading ? '...' : stats.partners}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" component={Link} to="/partners">{t('common.view_all')}</Button>
                        </CardActions>
                    </Card>
                </Grid>

                {user && (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <ConfirmationNumber color="primary" sx={{ mr: 1 }} />
                                    <Typography color="textSecondary" gutterBottom>
                                        {t('dashboard.my_tickets')}
                                    </Typography>
                                </Box>
                                <Typography variant="h4">
                                    {loading ? '...' : stats.tickets}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" component={Link} to="/tickets">{t('common.view_all')}</Button>
                            </CardActions>
                        </Card>
                    </Grid>
                )}
            </Grid>

            {/* Quick Actions */}
            {user && (
                <Box mt={6}>
                    <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                        {t('dashboard.quick_actions')}
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                    <Typography variant="h6">{t('dashboard.submit_solution')}</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {t('dashboard.submit_desc')}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>

                        <Grid size={{ xs: 12, sm: 6 }}>
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
                                    <Typography variant="h6">{t('dashboard.propose_partner')}</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        {t('dashboard.propose_desc')}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Box>
            )}
        </Box>
    );
};

export default Dashboard;
