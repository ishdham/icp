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

                {!isCreating && selectedPartner?.id && (
                    <Box mt={4}>
                        <PartnerSolutions partnerId={selectedPartner.id} />
                    </Box>
                )}
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

const PartnerSolutions = ({ partnerId }: { partnerId: string }) => {
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSolutions = async () => {
            setLoading(true);
            try {
                const response = await client.get(`/partners/${partnerId}/solutions`);
                setSolutions(response.data || []);
            } catch (error) {
                console.error('Error fetching partner solutions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSolutions();
    }, [partnerId]);

    if (loading) return <CircularProgress size={24} />;
    if (solutions.length === 0) return <Box mt={2}><Chip label="No associated solutions found" /></Box>;

    // Reuse ListView? Or just a simple list.
    // Let's use a simple list for now since ListView takes full page typically. 
    // Or we can construct a small table.

    return (
        <Box>
            <h3>Associated Solutions</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                        <th style={{ padding: '8px' }}>Name</th>
                        <th style={{ padding: '8px' }}>Domain</th>
                        <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {solutions.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{ padding: '8px' }}>{s.name}</td>
                            <td style={{ padding: '8px' }}>{s.domain}</td>
                            <td style={{ padding: '8px' }}>
                                <Chip label={s.status} size="small" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Box>
    );
};

export default Partners;
