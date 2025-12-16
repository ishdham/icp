import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canEditPartner, isModerator } from '@shared/permissions';

const Partners = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();
    const { schema, uischema, loading: schemaLoading } = useSchema('partner');
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [currentSearch, setCurrentSearch] = useState('');

    const fetchPartners = async (pageNum: number = 1, searchQuery: string = '') => {
        setLoading(true);
        try {
            const params: any = { limit: 20, page: pageNum };
            if (searchQuery) params.q = searchQuery;

            const response = await client.get('/partners', { params });
            const { items, total, totalPages: pages } = response.data;

            setPartners(items || []);
            setTotalItems(total || 0);
            setTotalPages(pages || 1);
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
        fetchPartners(page, currentSearch);
    }, [page, currentSearch, language]);

    useEffect(() => {
        if (id) {
            if (language === 'en') {
                const found = partners.find(p => p.id === id);
                if (found) {
                    setSelectedPartner(found);
                } else {
                    if (!loading) fetchPartner(id);
                }
            } else {
                // Non-English: Always fetch to ensure translation trigger
                fetchPartner(id);
            }
            setIsCreating(false);
        } else {
            setSelectedPartner(null);
        }
    }, [id, partners.length, language]);

    const handleCreate = async (data: any) => {
        try {
            await client.post('/partners', { ...data, status: 'PROPOSED' });
            setIsCreating(false);
            fetchPartners(1, currentSearch); // Refresh first page
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
            fetchPartners(page, currentSearch);
        } catch (error) {
            console.error('Error updating partner:', error);
            alert('Failed to update partner.');
        }
    };

    const handleSearch = (query: string) => {
        setCurrentSearch(query);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    // ... Schema Injection Customization ...
    let finalUiSchema = uischema;
    if (finalUiSchema && !isModerator(user)) {
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

    if (selectedPartner || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

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
                    {useLanguage().t('common.back_to_list')}
                </Button>
                <DetailView
                    title={isCreating ? useLanguage().t('partners.propose_new') : useLanguage().t('partners.details')}
                    data={selectedPartner || { status: 'PROPOSED' }}
                    schema={schema}
                    uischema={finalUiSchema}
                    canEdit={isCreating ? false : canEditPartner(user, selectedPartner)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => {
                        if (isCreating) setIsCreating(false);
                        navigate('/partners');
                    }}
                />
                {selectedPartner && !isCreating && (
                    <Box mt={4}>
                        {/* We could add Solutions by Partner list here later */}
                    </Box>
                )}
            </Box>
        );
    }

    const { t } = useLanguage();

    const columns = [
        { key: 'organizationName', label: t('list.column_org') },
        {
            key: 'entityType',
            label: t('list.column_type'),
            render: (value: string) => t(`entity_type.${value}`) || value
        },
        { key: 'mainDomain', label: t('list.column_domain') },
        {
            key: 'status',
            label: t('list.column_status'),
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'APPROVED' || value === 'MATURE') color = "success";
                else if (value === 'REJECTED') color = "error";
                else if (value === 'PROPOSED') color = "warning";

                return <Chip label={t(`status.${value}`) || value} color={color} size="small" />;
            }
        },
        {
            key: 'proposedByUserName',
            label: t('list.column_proposed_by')
        }
    ];

    return (
        <ListView
            title={useLanguage().t('partners.title')}
            items={partners}
            columns={columns}
            loading={loading}
            onSelect={(item) => navigate(`/partners/${item.id}`)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            // Pagination & Search
            onSearch={handleSearch}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={handlePageChange}
        />
    );
};

export default Partners;
