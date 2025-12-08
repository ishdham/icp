import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const Solutions = () => {
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('solution');
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchSolutions = async () => {
        setLoading(true);
        try {
            const response = await client.get('/solutions');
            setSolutions(response.data.items || []);
        } catch (error) {
            console.error('Error fetching solutions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolutions();
    }, []);

    const handleCreate = async (data: any) => {
        try {
            await client.post('/solutions', { ...data, status: 'DRAFT' });
            setIsCreating(false);
            fetchSolutions();
            alert('Solution submitted successfully!');
        } catch (error) {
            console.error('Error creating solution:', error);
            alert('Failed to create solution.');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedSolution?.id) return;
        try {
            const { id, ...updateData } = data;
            await client.put(`/solutions/${selectedSolution.id}`, updateData);
            setSelectedSolution(null);
            fetchSolutions();
            alert('Solution updated successfully!');
        } catch (error) {
            console.error('Error updating solution:', error);
            alert('Failed to update solution.');
        }
    };

    if (selectedSolution || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => { setSelectedSolution(null); setIsCreating(false); }}
                    sx={{ mb: 2 }}
                >
                    Back to List
                </Button>
                <DetailView
                    title={isCreating ? 'Submit New Solution' : 'Solution Details'}
                    data={selectedSolution || {}}
                    schema={schema}
                    uischema={uischema}
                    canEdit={!!user}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => { setSelectedSolution(null); setIsCreating(false); }}
                />
            </Box>
        );
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'domain', label: 'Domain' },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'APPROVED' || value === 'MATURE') color = "success";
                else if (value === 'REJECTED') color = "error";
                else if (value === 'PENDING' || value === 'DRAFT') color = "warning";
                else if (value === 'PILOT') color = "info";

                return <Chip label={value} color={color} size="small" />;
            }
        }
    ];

    return (
        <ListView
            title="Solutions"
            items={solutions}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedSolution(item)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            searchKeys={['name', 'domain', 'description']}
        />
    );
};

export default Solutions;
