import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { useTranslated, useTranslatedList } from '../hooks/useTranslated';
import { Chip, Button, Box, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { ArrowBack, ViewList, SmartToy } from '@mui/icons-material';
import { canEditSolution, isModerator } from '@shared/permissions';
import AiChatView from '../components/common/AiChatView';
import AiImportDialog from '../components/common/AiImportDialog';

const Solutions = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('solution');
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [rawSelectedSolution, setRawSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'ai'>('list');
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [creationData, setCreationData] = useState<any>({ status: 'PROPOSED' });

    // New Pagination & Search State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [currentSearch, setCurrentSearch] = useState('');
    const [searchMode, setSearchMode] = useState<'semantic' | 'fuzzy'>('semantic');

    // Translation Hooks
    const translatedSolutions = useTranslatedList(solutions);
    const selectedSolution = useTranslated(rawSelectedSolution);

    const fetchSolutions = async (pageNum: number = 1, searchQuery: string = '', mode: 'semantic' | 'fuzzy' = 'semantic') => {
        setLoading(true);
        try {
            const params: any = { limit: 20, page: pageNum, mode };
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
            setRawSelectedSolution(response.data);
        } catch (error) {
            console.error('Error fetching solution:', error);
            // Optionally navigate back to list if not found
            navigate('/solutions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial fetch & Updates
        fetchSolutions(page, currentSearch, searchMode);
    }, [page, currentSearch, searchMode]);


    useEffect(() => {
        if (id) {
            // Check if we already have the item in the list
            const found = solutions.find(s => s.id === id);
            if (found) {
                setRawSelectedSolution(found);
            } else {
                fetchSolution(id);
            }
            setIsCreating(false);
        } else {
            setRawSelectedSolution(null);
        }
    }, [id, solutions.length]);


    const handleCreate = async (data: any) => {
        try {
            await client.post('/solutions', { ...data, status: 'PROPOSED' });
            setIsCreating(false);
            fetchSolutions(1, currentSearch, searchMode);
            alert('Solution submitted successfully!');
            navigate('/solutions');
        } catch (error) {
            console.error('Error creating solution:', error);
            // Rethrow so DetailView can handle validation errors
            throw error;
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedSolution?.id) return;
        try {
            const { id, _score, providedByPartnerName, proposedByUserName, createdAt, updatedAt, ...updateData } = data;
            await client.put(`/solutions/${selectedSolution.id}`, updateData);
            fetchSolution(selectedSolution.id);
            alert('Solution updated successfully!');
            fetchSolutions(page, currentSearch, searchMode);
        } catch (error) {
            console.error('Error updating solution:', error);
            // Rethrow so DetailView can handle validation errors
            throw error;
        }
    };

    const handleImport = (data: any) => {
        setCreationData((prev: any) => ({ ...prev, ...data }));
    };

    const handleSearch = (query: string) => {
        setCurrentSearch(query);
        setSearchMode('semantic'); // Enter triggers semantic
        setPage(1);
    };

    const handleLiveSearch = (query: string) => {
        setCurrentSearch(query);
        setSearchMode('fuzzy'); // Typing triggers fuzzy
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // ... Schema Injection ...
    // Use default schema, do not inject massive Enum
    const activeSchema = schema;

    let finalUiSchema = (uischema && !JSON.stringify(uischema).includes('providedByPartnerId')) ? {
        ...uischema,
        elements: [
            ...uischema.elements,
            {
                type: 'Control',
                scope: '#/properties/providedByPartnerId',
                options: {
                    autocomplete: false, // Legacy flag
                    renderer: 'async-autocomplete', // Explicit hint if needed or handled by tester logic
                    apiUrl: '/partners',
                    labelKey: 'organizationName',
                    valueKey: 'id'
                }
            }
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

    const columns = [
        { key: 'name', label: t('list.column_name') },
        {
            key: 'providedByPartnerName',
            label: t('list.column_partner'),
        },
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
                    items={translatedSolutions}
                    columns={columns}
                    loading={loading}
                    onSelect={(item) => navigate(`/solutions/${item.id}`)}
                    onCreate={user ? () => { setIsCreating(true); setCreationData({ status: 'PROPOSED' }); } : undefined}
                    // Pagination & Search
                    onSearch={handleSearch}
                    onLiveSearch={handleLiveSearch}
                    page={page}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={handlePageChange}
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
