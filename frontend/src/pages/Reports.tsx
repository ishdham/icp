import { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import { Box, Typography, CircularProgress, Grid, Paper, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput, Stack, Card, CardContent, Button } from '@mui/material';
import Plot from 'react-plotly.js';
import { useNavigate } from 'react-router-dom';
import { ArrowBack } from '@mui/icons-material';

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
        // user variable was unused in previous code block logic, so we can ignore it unless we add logic.
        // Actually the Requirement says "The list of states shown should be the list of states accessible for the user".
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
            const domain = s.domain || 'Unknown';
            counts[domain] = (counts[domain] || 0) + 1;
        });
        return {
            labels: Object.keys(counts),
            values: Object.values(counts)
        };
    }, [statusFilteredData]);

    const providerData = useMemo(() => {
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
                    Solutions Report
                </Typography>
                <Button variant="outlined" startIcon={<ArrowBack />} onClick={() => navigate('/solutions')}>
                    Back to Solutions
                </Button>
            </Box>

            {/* Filter Section */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <FormControl sx={{ m: 1, width: 300 }}>
                    <InputLabel id="status-multiple-chip-label">Solution Status</InputLabel>
                    <Select
                        labelId="status-multiple-chip-label"
                        id="status-multiple-chip"
                        multiple
                        value={selectedStatuses}
                        onChange={handleStatusChange}
                        input={<OutlinedInput id="select-multiple-chip" label="Solution Status" />}
                        renderValue={(selected) => (
                            <Box sx={{ display: { xs: 'block', sm: 'flex' }, flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={value} />
                                ))}
                            </Box>
                        )}
                    >
                        {availableStatuses.map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                {drillDownFilter && (
                    <Chip
                        label={`Filtered by ${drillDownFilter.type}: ${drillDownFilter.value}`}
                        onDelete={() => setDrillDownFilter(null)}
                        color="primary"
                        sx={{ ml: 2 }}
                    />
                )}
            </Paper>

            <Grid container spacing={3} mb={4}>
                {/* Pie Chart: Domain */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: 450 }}>
                        <Typography variant="h6" gutterBottom>Solutions by Domain</Typography>
                        <Plot
                            data={[{
                                values: domainData.values,
                                labels: domainData.labels,
                                type: 'pie',
                                textinfo: 'label+percent',
                                hoverinfo: 'label+value'
                            }]}
                            layout={{
                                width: 400,
                                height: 400,
                                margin: { t: 0, b: 0, l: 0, r: 0 },
                                showlegend: true
                            }}
                            onClick={(data: any) => {
                                if (data.points && data.points[0]) {
                                    setDrillDownFilter({ type: 'domain', value: data.points[0].label });
                                }
                            }}
                        />
                    </Paper>
                </Grid>

                {/* Bar Chart: Provider */}
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', height: 450 }}>
                        <Typography variant="h6" gutterBottom>Solutions by Provider</Typography>
                        <Plot
                            data={[{
                                x: providerData.x,
                                y: providerData.y,
                                type: 'bar',
                                marker: { color: '#1976d2' }
                            }]}
                            layout={{
                                width: 400,
                                height: 400,
                                margin: { t: 20, b: 60, l: 40, r: 20 },
                                xaxis: { tickangle: -45, automargin: true }
                            }}
                            onClick={(data: any) => {
                                if (data.points && data.points[0]) {
                                    setDrillDownFilter({ type: 'provider', value: data.points[0].x as string });
                                }
                            }}
                        />
                    </Paper>
                </Grid>
            </Grid>

            {/* List Section */}
            <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    {finalFilteredData.length} Solutions Found
                </Typography>
                <Grid container spacing={2}>
                    {finalFilteredData.map((s) => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={s.id}>
                            <Card variant="outlined" onClick={() => navigate(`/solutions/${s.id}`)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                                <CardContent>
                                    <Typography variant="subtitle1" component="div" noWrap title={s.name}>
                                        {s.name}
                                    </Typography>
                                    <Typography color="text.secondary" variant="body2" gutterBottom>
                                        {s.domain}
                                    </Typography>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Chip label={s.status} size="small" color={s.status === 'MATURE' ? 'success' : 'default'} />
                                        {s.providedByPartnerName && (
                                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '60%' }}>
                                                by {s.providedByPartnerName}
                                            </Typography>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    {finalFilteredData.length === 0 && (
                        <Grid size={{ xs: 12 }}>
                            <Typography color="text.secondary" align="center">No solutions match the selected criteria.</Typography>
                        </Grid>
                    )}
                </Grid>
            </Paper>

        </Box>
    );
};

export default Reports;
