import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ArrowBack, ViewList, SmartToy } from '@mui/icons-material';
import { canEditSolution, isModerator } from '../utils/permissions';
import AiChatView from '../components/common/AiChatView';
import AiImportDialog from '../components/common/AiImportDialog';

const Solutions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('solution');
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'ai'>('list');
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [creationData, setCreationData] = useState<any>({ status: 'PROPOSED' });

    const [partners, setPartners] = useState<any[]>([]);

    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState<number | undefined>(undefined);

    const fetchSolutions = async (pageToken?: string) => {
        setLoading(true);
        try {
            const params: any = { limit: 20 };
            if (pageToken) params.pageToken = pageToken;

            const response = await client.get('/solutions', { params });
            const newItems = response.data.items || [];

            setSolutions(prev => pageToken ? [...prev, ...newItems] : newItems);
            setNextPageToken(response.data.nextPageToken || null);
            if (response.data.total !== undefined) {
                setTotalItems(response.data.total);
            }
        } catch (error) {
            console.error('Error fetching solutions:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSolution = async (solutionId: string) => {
        setLoading(true);
        try {
            const response = await client.get(`/solutions/${solutionId}`);
            setSelectedSolution(response.data);
        } catch (error) {
            console.error('Error fetching solution:', error);
            // Optionally navigate back to list if not found
            navigate('/solutions');
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

    useEffect(() => {
        if (id) {
            // Check if we already have it in the list to save a call, otherwise fetch
            const found = solutions.find(s => s.id === id);
            if (found) {
                setSelectedSolution(found);
            } else {
                // If list is empty or not found, we might need to fetch individual.
                // However, fetchSolutions is called on mount.
                // If solutions are loading, wait.
                if (!loading && solutions.length > 0) {
                    // Loaded but not found in list -> maybe filtered or pagination?
                    // Fetch individually.
                    fetchSolution(id);
                } else if (!loading && solutions.length === 0) {
                    // Loaded and empty -> fetch individual
                    fetchSolution(id);
                }
                // If loading, do nothing, the fetchSolutions might find it, or we rely on this fallback?
                // Actually, fetchSolutions sets loading=false.
                // It's safer to just fetch individual if we have an ID and it's not currently selected.
                if (!selectedSolution || selectedSolution.id !== id) {
                    fetchSolution(id);
                }
            }
            setIsCreating(false);
        } else {
            setSelectedSolution(null);
        }
    }, [id, solutions.length]);
    // solutions.length dependency is a bit tricky. Better to rely on id change.
    // If we land on /solutions/123, fetchSolutions runs, fetchPartners runs. 
    // useEffect[id] runs. 

    const handleCreate = async (data: any) => {
        try {
            await client.post('/solutions', { ...data, status: 'PROPOSED' });
            setIsCreating(false);
            fetchSolutions();
            alert('Solution submitted successfully!');
            navigate('/solutions');
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
            // Update local state or refetch?
            // If we refetch, we might lose selection if we don't handle it.
            // But we have ID in URL, so refetching list works well.
            fetchSolution(selectedSolution.id);
            alert('Solution updated successfully!');
        } catch (error) {
            console.error('Error updating solution:', error);
            alert('Failed to update solution.');
        }
    };

    const handleImport = (data: any) => {
        setCreationData((prev: any) => ({ ...prev, ...data }));
    };

    // Inject partners into schema (for providedByPartnerId)
    const activeSchema = (schema && partners.length > 0) ? {
        ...schema,
        properties: {
            ...schema.properties,
            providedByPartnerId: {
                type: 'string',
                title: 'Provided By Partner',
                oneOf: partners.map(p => ({
                    const: p.id,
                    title: p.organizationName
                }))
            }
        }
    } : schema;

    // Add providedByPartnerId to UI schema if not present
    let finalUiSchema = (uischema && !JSON.stringify(uischema).includes('providedByPartnerId')) ? {
        ...uischema,
        elements: [
            ...uischema.elements,
            { type: 'Control', scope: '#/properties/providedByPartnerId' }
        ]
    } : uischema;

    // Status Restriction: Only Moderators can edit status
    if (finalUiSchema && !isModerator(user)) {
        // Deep clone to avoid mutation issues if uischema is reused (though currently it's from hook)
        finalUiSchema = JSON.parse(JSON.stringify(finalUiSchema));

        // Helper to find and patch status control
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

    // If creating, hide "System Info" group
    if (isCreating && finalUiSchema && finalUiSchema.elements) {
        finalUiSchema = {
            ...finalUiSchema,
            elements: finalUiSchema.elements.filter((e: any) => e.label !== 'System Info')
        };
    }

    if (selectedSolution || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => {
                        if (isCreating) {
                            setIsCreating(false);
                            navigate('/solutions');
                        } else {
                            navigate('/solutions');
                        }
                    }}
                    sx={{ mb: 2 }}
                >
                    Back to List
                </Button>
                {isCreating && (
                    <Button
                        startIcon={<SmartToy />}
                        variant="outlined"
                        sx={{ ml: 2, mb: 2 }}
                        onClick={() => setImportDialogOpen(true)}
                    >
                        AI Assisted Import
                    </Button>
                )}
                <DetailView
                    title={isCreating ? 'Submit New Solution' : 'Solution Details'}
                    data={selectedSolution || (isCreating ? creationData : {})}
                    schema={activeSchema}
                    uischema={finalUiSchema}
                    canEdit={isCreating ? false : canEditSolution(user, selectedSolution)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => {
                        if (isCreating) setIsCreating(false);
                        navigate('/solutions');
                    }}
                />
                <AiImportDialog
                    open={importDialogOpen}
                    onClose={() => setImportDialogOpen(false)}
                    onImport={handleImport}
                />
            </Box >
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
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    onChange={(_e, newView) => { if (newView) setViewMode(newView); }}
                    aria-label="view mode"
                    size="small"
                >
                    <ToggleButton value="list" aria-label="list view">
                        <ViewList sx={{ mr: 1 }} /> List
                    </ToggleButton>
                    <ToggleButton value="ai" aria-label="ai chat">
                        <SmartToy sx={{ mr: 1 }} /> AI Assistant
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {viewMode === 'ai' ? (
                <AiChatView />
            ) : (
                <ListView
                    title="Solutions"
                    items={solutions}
                    columns={columns}
                    loading={loading}
                    onSelect={(item) => navigate(`/solutions/${item.id}`)}
                    onCreate={user ? () => { setIsCreating(true); setCreationData({ status: 'PROPOSED' }); } : undefined}
                    searchKeys={['name', 'domain', 'description']}
                    hasMore={!!nextPageToken}
                    onLoadMore={() => nextPageToken && fetchSolutions(nextPageToken)}
                    totalItems={totalItems}
                />
            )}
            <AiImportDialog
                open={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                onImport={handleImport}
            />
        </Box>
    );
};

export default Solutions;
