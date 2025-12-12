import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
    const { language } = useLanguage();
    const { schema, uischema, loading: schemaLoading } = useSchema('solution');
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'ai'>('list');
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [creationData, setCreationData] = useState<any>({ status: 'PROPOSED' });

    const [partners, setPartners] = useState<any[]>([]);

    // New Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [currentSearch, setCurrentSearch] = useState('');

    const fetchSolutions = async (pageNum: number = 1, searchQuery: string = '') => {
        setLoading(true);
        try {
            const params: any = { limit: 20, page: pageNum };
            if (searchQuery) params.q = searchQuery;

            const response = await client.get('/solutions', { params });
            const { items, total, totalPages: pages } = response.data;

            setSolutions(items || []);
            setTotalItems(total || 0);
            setTotalPages(pages || 1);
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
        // Initial fetch
        fetchSolutions(page, currentSearch);
        fetchPartners();
    }, []);
    // Note: We don't depend on 'page' or 'currentSearch' here to avoid double fetch loop 
    // if handled via handler functions, but for simplicity let's rely on explicit calls.
    // Actually, proper pattern is useEffect on [page, currentSearch].

    // Let's refactor to standard pattern:
    useEffect(() => {
        fetchSolutions(page, currentSearch);
    }, [page, currentSearch, language]);


    useEffect(() => {
        if (id) {
            // If language is English, we can try to use the cached list item.
            // If language is NOT English, we MUST fetch individually to trigger the backend "Lazy Translation" logic
            // (unless we are sure the list item is already translated, but safer to fetch).
            if (language === 'en') {
                const found = solutions.find(s => s.id === id);
                if (found) {
                    setSelectedSolution(found);
                } else {
                    if (!loading) fetchSolution(id);
                }
            } else {
                // Non-English: Always fetch to ensure translation trigger
                fetchSolution(id);
            }
            setIsCreating(false);
        } else {
            setSelectedSolution(null);
        }
    }, [id, solutions.length, language]);


    const handleCreate = async (data: any) => {
        try {
            await client.post('/solutions', { ...data, status: 'PROPOSED' });
            setIsCreating(false);
            fetchSolutions(1, currentSearch); // Refresh first page
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
            fetchSolution(selectedSolution.id);
            alert('Solution updated successfully!');
            // Refresh list too to update row if needed, but might lose page. 
            // Better to refresh current page:
            fetchSolutions(page, currentSearch);
        } catch (error) {
            console.error('Error updating solution:', error);
            alert('Failed to update solution.');
        }
    };

    const handleImport = (data: any) => {
        setCreationData((prev: any) => ({ ...prev, ...data }));
    };

    const handleSearch = (query: string) => {
        setCurrentSearch(query);
        setPage(1); // Reset to first page on new search
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // ... Schema Injection (Same as before) ...
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

    let finalUiSchema = (uischema && !JSON.stringify(uischema).includes('providedByPartnerId')) ? {
        ...uischema,
        elements: [
            ...uischema.elements,
            { type: 'Control', scope: '#/properties/providedByPartnerId' }
        ]
    } : uischema;

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
                    {useLanguage().t('common.back_to_list')}
                </Button>
                {isCreating && (
                    <Button
                        startIcon={<SmartToy />}
                        variant="outlined"
                        sx={{ ml: 2, mb: 2 }}
                        onClick={() => setImportDialogOpen(true)}
                    >
                        {useLanguage().t('common.ai_import')}
                    </Button>
                )}
                <DetailView
                    title={isCreating ? useLanguage().t('solutions.submit_new') : useLanguage().t('solutions.details')}
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

    const { t } = useLanguage();

    // ... (rest of code)

    // ...

    const columns = [
        { key: 'name', label: t('list.column_name') },
        {
            key: 'domain',
            label: t('list.column_domain'),
            render: (value: string) => t(`domain.${value}`)
        },
        {
            key: 'status',
            label: t('list.column_status'),
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'APPROVED' || value === 'MATURE') color = "success";
                else if (value === 'REJECTED') color = "error";
                else if (value === 'PENDING' || value === 'DRAFT') color = "warning";
                else if (value === 'PILOT') color = "info";

                return <Chip label={t(`status.${value}`) || value} color={color} size="small" />;
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
                        <ViewList sx={{ mr: 1 }} /> {t('list.toggle_list')}
                    </ToggleButton>
                    <ToggleButton value="ai" aria-label="ai chat">
                        <SmartToy sx={{ mr: 1 }} /> {t('list.toggle_ai')}
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {viewMode === 'ai' ? (
                <AiChatView />
            ) : (
                <ListView
                    title={useLanguage().t('solutions.title')}
                    items={solutions}
                    columns={columns}
                    loading={loading}
                    onSelect={(item) => navigate(`/solutions/${item.id}`)}
                    onCreate={user ? () => { setIsCreating(true); setCreationData({ status: 'PROPOSED' }); } : undefined}
                    // Pagination & Search
                    onSearch={handleSearch}
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={handlePageChange}
                // Legacy props removed
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
