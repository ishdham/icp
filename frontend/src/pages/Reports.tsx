import { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import { Box, Typography, CircularProgress, Paper, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput, Stack, Card, CardContent, Button, Link } from '@mui/material';
import Plot from 'react-plotly.js';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';
import { useLanguage } from '../context/LanguageContext';

interface Solution {
    id: string;
    name: string;
    domain: string;
    status: string;
    providedByPartnerName?: string;
    description?: string;
}

const Reports = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [solutions, setSolutions] = useState<Solution[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['MATURE']);
    const [drillDownFilter, setDrillDownFilter] = useState<{ type: 'domain' | 'provider', value: string } | null>(null);

    // Fetch all solutions (limit 1000)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // We fetch everything the user is allowed to see, then filter client-side
                const response = await client.get('/solutions?limit=1000');
                setSolutions(response.data.items || []);
            } catch (error) {
                console.error('Error fetching solutions for report:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Extract available statuses from data
    const availableStatuses = useMemo(() => {
        const statuses = new Set(solutions.map(s => s.status));
        return Array.from(statuses).sort();
    }, [solutions]);

    // Initial Selection Effect
    useEffect(() => {
        // The backend filters accessible solutions. So `availableStatuses` covers this.
    }, [loading, solutions]);

    const handleStatusChange = (event: any) => {
        const { target: { value } } = event;
        setSelectedStatuses(typeof value === 'string' ? value.split(',') : value);
        // Clear drilldown when changing main filters
        setDrillDownFilter(null);
    };

    // Filtered Data based on Status
    const statusFilteredData = useMemo(() => {
        return solutions.filter(s => selectedStatuses.includes(s.status));
    }, [solutions, selectedStatuses]);

    // Apply Drilldown Filter (from Chart clicks)
    const finalFilteredData = useMemo(() => {
        if (!drillDownFilter) return statusFilteredData;
        return statusFilteredData.filter(s => {
            if (drillDownFilter.type === 'domain') return s.domain === drillDownFilter.value;
            if (drillDownFilter.type === 'provider') return (s.providedByPartnerName || 'Unknown') === drillDownFilter.value;
            return true;
        });
    }, [statusFilteredData, drillDownFilter]);

    // Aggregations for Charts
    const domainData = useMemo(() => {
        const counts: Record<string, number> = {};
        statusFilteredData.forEach(s => {
            // Translate the domain KEY for display
            const rawDomain = s.domain;
            const domain = rawDomain ? (t(`domain.${rawDomain}`) || rawDomain) : 'Unknown';
            counts[domain] = (counts[domain] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            values: Object.values(counts)
        };
    }, [statusFilteredData, t]);

    const providerData = useMemo(() => {
        // Partners names are dynamic, usually not translated via static dict.
        // So we keep them as is.
        const counts: Record<string, number> = {};
        statusFilteredData.forEach(s => {
            const provider = s.providedByPartnerName || 'Unknown';
            counts[provider] = (counts[provider] || 0) + 1;
        });
        // Sort by count desc
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            x: sorted.map(i => i[0]),
            y: sorted.map(i => i[1])
        };
    }, [statusFilteredData]);

    if (loading) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    }

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1" flexGrow={1}>
                    {t('reports.title')}
                </Typography>
                <Button
                    startIcon={<ArrowBack />}
                    variant="outlined"
                    onClick={() => navigate('/solutions')}
                >
                    {t('reports.back_to_solutions')}
                </Button>
            </Box>

            {/* Filter Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <FormControl sx={{ m: 1, minWidth: 200, flex: 1 }}>
                        <InputLabel id="status-filter-label">{t('reports.status_filter')}</InputLabel>
                        <Select
                            labelId="status-filter-label"
                            id="status-filter"
                            multiple
                            value={selectedStatuses}
                            onChange={handleStatusChange}
                            input={<OutlinedInput label={t('reports.status_filter')} />}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {selected.map((value) => (
                                        <Chip key={value} label={t(`status.${value}`) || value} size="small" />
                                    ))}
                                </Box>
                            )}
                        >
                            {availableStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {t(`status.${status}`) || status}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {drillDownFilter && (
                        <Chip
                            label={`Filtered by ${drillDownFilter.type}: ${drillDownFilter.value}`}
                            onDelete={() => setDrillDownFilter(null)}
                            color="primary"
                        />
                    )}
                </Stack>
            </Paper>

            <Stack spacing={3}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                    {/* Domain Chart */}
                    <Box flex={1}>
                        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            <Typography variant="h6" gutterBottom>{t('reports.by_domain')}</Typography>
                            {domainData.values.length > 0 ? (
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <Plot
                                        data={[{
                                            values: domainData.values,
                                            labels: domainData.labels,
                                            type: 'pie',
                                            textinfo: 'label+percent',
                                            insidetextorientation: 'radial'
                                        }]}
                                        layout={{
                                            width: 350,
                                            height: 350,
                                            margin: { t: 0, b: 0, l: 0, r: 0 },
                                            showlegend: true,
                                            legend: { orientation: 'h', y: -0.1 }
                                        }}
                                        config={{ responsive: true, displayModeBar: false }}
                                        onClick={(data: any) => {
                                            const point = data.points[0];
                                            if (point && point.label) {
                                                setDrillDownFilter({ type: 'domain', value: point.label as string });
                                            }
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Box p={4}><Typography color="textSecondary">No data</Typography></Box>
                            )}
                        </Paper>
                    </Box>

                    {/* Provider Chart */}
                    <Box flex={1}>
                        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                            <Typography variant="h6" gutterBottom>{t('reports.by_provider')}</Typography>
                            {providerData.x.length > 0 ? (
                                <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <Plot
                                        data={[{
                                            x: providerData.x,
                                            y: providerData.y,
                                            type: 'bar',
                                            marker: { color: 'orange' }
                                        }]}
                                        layout={{
                                            width: 350,
                                            height: 350,
                                            margin: { t: 0, b: 50, l: 50, r: 0 },
                                            xaxis: { automargin: true }
                                        }}
                                        config={{ responsive: true, displayModeBar: false }}
                                        onClick={(data: any) => {
                                            const point = data.points[0];
                                            if (point && point.x) {
                                                setDrillDownFilter({ type: 'provider', value: point.x as string });
                                            }
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Box p={4}><Typography color="textSecondary">No data</Typography></Box>
                            )}
                        </Paper>
                    </Box>
                </Stack>

                {/* List of Solutions */}
                <Card>
                    <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6">
                                {finalFilteredData.length} {t('reports.found')}
                            </Typography>
                        </Stack>

                        {finalFilteredData.length === 0 && (
                            <Typography color="textSecondary">
                                {t('reports.no_match')}
                            </Typography>
                        )}
                        <Stack spacing={1}>
                            {finalFilteredData.map(s => (
                                <Paper key={s.id} variant="outlined" sx={{ p: 2 }}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                                        <Box flex={2} minWidth={0}>
                                            <Link component={RouterLink} to={`/solutions/${s.id}`} underline="hover" color="primary">
                                                <Typography variant="subtitle1" fontWeight="bold" noWrap component="span">{s.name}</Typography>
                                            </Link>
                                            <Typography variant="caption" color="textSecondary">{s.id}</Typography>
                                        </Box>
                                        <Box flex={1}>
                                            <Chip label={t(`domain.${s.domain}`) || s.domain} size="small" variant="outlined" />
                                        </Box>
                                        <Box flex={1}>
                                            <Typography variant="body2" noWrap>{s.providedByPartnerName}</Typography>
                                        </Box>
                                        <Box flex={1} sx={{ textAlign: 'right' }}>
                                            <Chip
                                                label={t(`status.${s.status}`) || s.status}
                                                color={s.status === 'MATURE' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </Box>
                                    </Stack>
                                </Paper>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};

export default Reports;
