import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canEditPartner } from '../utils/permissions';

const Partners = () => {
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('partner');
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchPartners = async () => {
        setLoading(true);
        try {
            const response = await client.get('/partners');
            setPartners(response.data || []);
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    const handleCreate = async (data: any) => {
        try {
            await client.post('/partners', data);
            setIsCreating(false);
            fetchPartners();
            alert('Partner proposed successfully!');
        } catch (error) {
            console.error('Error creating partner:', error);
            alert('Failed to create partner.');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedPartner?.id) return;
        try {
            const { id, ...updateData } = data;
            await client.put(`/partners/${selectedPartner.id}`, updateData);
            setSelectedPartner(null);
            fetchPartners();
            alert('Partner updated successfully!');
        } catch (error) {
            console.error('Error updating partner:', error);
            alert('Failed to update partner.');
        }
    };

    if (selectedPartner || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => { setSelectedPartner(null); setIsCreating(false); }}
                    sx={{ mb: 2 }}
                >
                    Back to List
                </Button>
                <DetailView
                    title={isCreating ? 'Propose New Partner' : 'Partner Details'}
                    data={selectedPartner || {}}
                    schema={schema}
                    uischema={uischema}
                    canEdit={isCreating ? false : canEditPartner(user, selectedPartner)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => { setSelectedPartner(null); setIsCreating(false); }}
                />
            </Box>
        );
    }

    const columns = [
        { key: 'organizationName', label: 'Organization' },
        { key: 'entityType', label: 'Type' },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'APPROVED') color = "success";
                else if (value === 'REJECTED') color = "error";
                else if (value === 'PROPOSED') color = "warning";

                return <Chip label={value} color={color} size="small" />;
            }
        }
    ];

    return (
        <ListView
            title="Partners"
            items={partners}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedPartner(item)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            searchKeys={['organizationName', 'entityType']}
        />
    );
};

export default Partners;
