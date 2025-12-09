import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canEditSolution } from '../utils/permissions';

const Solutions = () => {
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('solution');
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [partners, setPartners] = useState<any[]>([]);

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

    const fetchPartners = async () => {
        try {
            const response = await client.get('/partners');
            setPartners(response.data || []);
        } catch (error) {
            console.error('Error fetching partners:', error);
        }
    };

    useEffect(() => {
        fetchSolutions();
        fetchPartners();
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

    // Inject partners into schema
    const activeSchema = (schema && partners.length > 0) ? {
        ...schema,
        properties: {
            ...schema.properties,
            partnerId: {
                type: 'string',
                title: 'Partner',
                oneOf: partners.map(p => ({
                    const: p.id,
                    title: p.organizationName
                }))
            }
        }
    } : schema;

    // Add partnerId to UI schema if not present (simple check)
    // We assume backend uischema might not have it yet? 
    // Actually, backend uiSchema for solution doesn't have it.
    // We should modify backend uiSchema or patch it here.
    // Let's patch it here for now to ensure it shows up.

    // Check if partnerId is already in uiSchema specific layout?
    // If not, we append it.
    // For simplicity, we just pass modified schema but if uiSchema controls layout, it needs to be there.
    // Let's rely on JSONForms showing it if in schema but not uischema? No, usually it hides it.
    // We need to add it to uischema.

    const activeUiSchema = (uischema && !JSON.stringify(uischema).includes('partnerId')) ? {
        ...uischema,
        elements: [
            ...uischema.elements,
            { type: 'Control', scope: '#/properties/partnerId' }
        ]
    } : uischema;

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
                    schema={activeSchema}
                    uischema={activeUiSchema}
                    canEdit={isCreating ? false : canEditSolution(user, selectedSolution)}
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
