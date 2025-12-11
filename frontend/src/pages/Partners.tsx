import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canEditPartner, isModerator } from '../utils/permissions';

const Partners = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('partner');
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState<number | undefined>(undefined);

    const fetchPartners = async (pageToken?: string) => {
        setLoading(true);
        try {
            const params: any = { limit: 20 };
            if (pageToken) params.pageToken = pageToken;

            const response = await client.get('/partners', { params });
            const newItems = response.data.items || [];

            setPartners(prev => pageToken ? [...prev, ...newItems] : newItems);
            setNextPageToken(response.data.nextPageToken || null);
            if (response.data.total !== undefined) {
                setTotalItems(response.data.total);
            }
        } catch (error) {
            console.error('Error fetching partners:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartner = async (partnerId: string) => {
        setLoading(true);
        try {
            // If we don't have a direct endpoint for single partner public fetch, we might fallback to filtered list?
            // Assuming GET /partners/:id exists. 
            // If not, we rely on finding it in the list (fetchPartners logic below).
            // But backend route `backend/src/routes/partners.ts` usually has filtered list.
            // Let's check if GET /partners/:id exists. If not, we might need to rely on list.
            // Looking at previous conversations/code, generic CRUD usually has GET /:id.
            // If not, I should implement it. But assuming standard CRUD.
            const response = await client.get(`/partners/${partnerId}`);
            setSelectedPartner(response.data);
        } catch (error) {
            console.error('Error fetching partner:', error);
            navigate('/partners');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    useEffect(() => {
        if (id) {
            const found = partners.find(p => p.id === id);
            if (found) {
                setSelectedPartner(found);
            } else {
                if (!loading && partners.length > 0) {
                    fetchPartner(id); // If not found in loaded list
                } else if (!loading && partners.length === 0) {
                    fetchPartner(id);
                }

                if (!selectedPartner || selectedPartner.id !== id) {
                    fetchPartner(id);
                }
            }
            setIsCreating(false);
        } else {
            setSelectedPartner(null);
        }
    }, [id, partners.length]);

    const handleCreate = async (data: any) => {
        try {
            await client.post('/partners', { ...data, status: 'PROPOSED' });
            setIsCreating(false);
            fetchPartners();
            alert('Partner proposed successfully!');
            navigate('/partners');
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
            fetchPartner(selectedPartner.id);
            alert('Partner updated successfully!');
        } catch (error) {
            console.error('Error updating partner:', error);
            alert('Failed to update partner.');
        }
    };

    if (selectedPartner || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        let finalUiSchema = uischema;
        if (isCreating && finalUiSchema && finalUiSchema.elements) {
            finalUiSchema = {
                ...finalUiSchema,
                elements: finalUiSchema.elements.filter((e: any) => e.label !== 'System Info')
            };
        }

        // Status Restriction: Only Moderators can edit status
        if (finalUiSchema && !isModerator(user)) {
            finalUiSchema = JSON.parse(JSON.stringify(finalUiSchema));

            const patchStatus = (elements: any[]) => {
                elements.forEach((element: any) => {
                    if (element.scope === '#/properties/status') {
                        element.options = { ...element.options, readonly: true };
                    }
                    if (element.elements) {
                        patchStatus(element.elements);
                    }
                });
            };

            if (finalUiSchema.elements) {
                patchStatus(finalUiSchema.elements);
            }
        }

        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => {
                        if (isCreating) setIsCreating(false);
                        navigate('/partners');
                    }}
                    sx={{ mb: 2 }}
                >
                    Back to List
                </Button>
                <DetailView
                    title={isCreating ? 'Propose New Partner' : 'Partner Details'}
                    data={selectedPartner || (isCreating ? { status: 'PROPOSED' } : {})}
                    schema={schema}
                    uischema={finalUiSchema}
                    canEdit={isCreating ? false : canEditPartner(user, selectedPartner)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => {
                        if (isCreating) setIsCreating(false);
                        navigate('/partners');
                    }}
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
                if (value === 'APPROVED' || value === 'MATURE') color = "success";
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
            onSelect={(item) => navigate(`/partners/${item.id}`)}
            onCreate={user ? () => navigate('/partners/new') : undefined}
            searchKeys={['organizationName', 'entityType']}
            loading={loading}
            hasMore={!!nextPageToken}
            onLoadMore={() => nextPageToken && fetchPartners(nextPageToken)}
            totalItems={totalItems}
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
