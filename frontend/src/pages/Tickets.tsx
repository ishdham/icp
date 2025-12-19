import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import {
    Chip, Button, Box, CircularProgress,
    List, ListItem, ListItemAvatar, ListItemText, Avatar, TextField, Typography, Divider, IconButton
} from '@mui/material';
import { ArrowBack, Send, Edit } from '@mui/icons-material';
import { canEditTickets } from '@shared/permissions';

const Tickets = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { language } = useLanguage();
    const { schema, uischema, loading: schemaLoading } = useSchema('ticket');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [nextPageToken, setNextPageToken] = useState<string | null>(null);
    const [totalItems, setTotalItems] = useState<number | undefined>(undefined);
    const [commentText, setCommentText] = useState('');
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

    const fetchTickets = async (pageToken?: string) => {
        setLoading(true);
        try {
            const params: any = { limit: 20 };
            if (pageToken) params.pageToken = pageToken;

            const response = await client.get('/tickets', { params });
            const newItems = response.data.items || [];

            setTickets(prev => pageToken ? [...prev, ...newItems] : newItems);
            setNextPageToken(response.data.nextPageToken || null);
            if (response.data.total !== undefined) {
                setTotalItems(response.data.total);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [language]);

    useEffect(() => {
        if (id) {
            const found = tickets.find(t => t.id === id);
            if (found) {
                setSelectedTicket(found);
            } else if (!loading) {
                // If not found and not loading, it might not exist or user lacks permission
                setSelectedTicket(null);
                // Optionally navigate away?
            }
            setIsCreating(false);
        } else {
            setSelectedTicket(null);
        }
    }, [id, tickets, loading]);

    const handleCreate = async (data: any) => {
        try {
            await client.post('/tickets', {
                ...data,
                type: 'PROBLEM_SUBMISSION',
                status: 'NEW'
            });
            setIsCreating(false);
            fetchTickets();
            alert('Ticket created successfully!');
            navigate('/tickets');
        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Failed to create ticket.');
        }
    };

    const handleResolve = async () => {
        if (!selectedTicket || !confirm('Are you sure you want to resolve this ticket and approve the request?')) return;
        try {
            await client.patch(`/tickets/${selectedTicket.id}/status`, {
                status: 'RESOLVED',
                comment: 'Approved via Dashboard'
            });
            navigate('/tickets');
            fetchTickets();
            alert('Ticket resolved and request approved!');
        } catch (error) {
            console.error('Error resolving ticket:', error);
            alert('Failed to resolve ticket.');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedTicket?.id) return;
        try {
            const { id, ...updateData } = data;
            await client.put(`/tickets/${selectedTicket.id}`, updateData);
            // Re-fetch or update list?
            // Since we rely on list to find selected item, we should refetch or update state.
            fetchTickets();
            alert('Ticket updated successfully!');
        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('Failed to update ticket.');
        }
    };

    const handleSaveComment = async () => {
        if (!commentText.trim() || !selectedTicket) return;

        // Use crypto.randomUUID if available, else fallback
        const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);

        const newComment = {
            id: editingCommentId || newId,
            content: commentText,
            userId: user?.uid || 'anonymous',
            createdAt: new Date().toISOString()
        };

        let updatedComments;
        if (editingCommentId) {
            updatedComments = (selectedTicket.comments || []).map((c: any) =>
                c.id === editingCommentId ? { ...c, content: commentText } : c
            );
        } else {
            updatedComments = [...(selectedTicket.comments || []), newComment];
        }

        try {
            // Call API directly to avoid double alert if we want, but reuse handleUpdate for consistency
            // For better UX, we might want to silence the alert in handleUpdate or just call client.put directly here.
            // Let's call client.put directly to avoid "Ticket updated" alert which is generic.
            await client.put(`/tickets/${selectedTicket.id}`, { ...selectedTicket, comments: updatedComments });

            // Update local state
            setSelectedTicket(prev => ({ ...prev, comments: updatedComments }));
            setCommentText('');
            setEditingCommentId(null);
            // fetchTickets(); // background update?
        } catch (error) {
            console.error('Error updating comments:', error);
            alert('Failed to save comment.');
        }
    };

    const handleEditComment = (comment: any) => {
        setCommentText(comment.content);
        setEditingCommentId(comment.id);
    };

    const canApprove = (user?.role === 'ADMIN' || user?.role === 'ICP_SUPPORT') &&
        selectedTicket?.status !== 'RESOLVED' &&
        (selectedTicket?.type === 'SOLUTION_APPROVAL' || selectedTicket?.type === 'PARTNER_APPROVAL');

    if (selectedTicket || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => {
                            if (isCreating) setIsCreating(false);
                            navigate('/tickets');
                        }}
                    >
                        {useLanguage().t('common.back_to_list')}
                    </Button>
                    {!isCreating && canApprove && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleResolve}
                        >
                            {useLanguage().t('tickets.approve_request')}
                        </Button>
                    )}
                </Box>
                <DetailView
                    title={isCreating ? useLanguage().t('tickets.submit_new') : useLanguage().t('tickets.details')}
                    data={selectedTicket || {}}
                    schema={schema}
                    uischema={uischema}
                    readOnly={false}
                    canEdit={isCreating ? true : canEditTickets(user, selectedTicket)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => {
                        if (isCreating) setIsCreating(false);
                        navigate('/tickets');
                    }}
                />

                {!isCreating && selectedTicket && (
                    <Box mt={4} p={2} bgcolor="background.paper" borderRadius={1}>
                        <Typography variant="h6" gutterBottom>
                            {useLanguage().t('tickets.comments') || 'Comments'}
                        </Typography>
                        <List>
                            {(selectedTicket.comments || []).map((comment: any, index: number) => (
                                <Box key={comment.id || index}>
                                    <ListItem alignItems="flex-start"
                                        secondaryAction={
                                            user?.uid === comment.userId && (
                                                <IconButton edge="end" aria-label="edit" onClick={() => handleEditComment(comment)}>
                                                    <Edit />
                                                </IconButton>
                                            )
                                        }
                                    >
                                        <ListItemAvatar>
                                            <Avatar alt={comment.userId} src="/static/images/avatar/1.jpg" />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle2" component="span">
                                                    {comment.userId === user?.uid ? 'You' : (comment.userName || comment.userId)}
                                                    <Typography component="span" variant="caption" color="text.secondary" ml={2}>
                                                        {new Date(comment.createdAt).toLocaleString()}
                                                    </Typography>
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography variant="body1" color="text.primary" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                                                    {comment.content}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                    <Divider variant="inset" component="li" />
                                </Box>
                            ))}
                        </List>
                        <Box display="flex" gap={2} mt={2}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                variant="outlined"
                                placeholder={useLanguage().t('tickets.add_comment') || "Add a comment..."}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                            />
                            <Button
                                variant="contained"
                                endIcon={<Send />}
                                onClick={handleSaveComment}
                                disabled={!commentText.trim()}
                                sx={{ height: 'fit-content', alignSelf: 'flex-end' }}
                            >
                                {editingCommentId ? (useLanguage().t('common.save') || 'Save') : (useLanguage().t('common.post') || 'Post')}
                            </Button>
                            {editingCommentId && (
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        setEditingCommentId(null);
                                        setCommentText('');
                                    }}
                                    sx={{ height: 'fit-content', alignSelf: 'flex-end' }}
                                >
                                    {useLanguage().t('common.cancel') || 'Cancel'}
                                </Button>
                            )}
                        </Box>
                    </Box>
                )}
            </Box>
        );
    }

    const { t } = useLanguage();

    const columns = [
        { key: 'title', label: t('list.column_title') },
        { key: 'type', label: t('list.column_type') },
        {
            key: 'status',
            label: t('list.column_status'),
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'RESOLVED') color = "success";
                else if (value === 'CLOSED') color = "default";
                else if (value === 'NEW') color = "warning";
                else if (value === 'IN_PROGRESS') color = "info";

                return <Chip label={t(`status.${value}`) || value} color={color} size="small" />;
            }
        }
    ];

    return (
        <ListView
            title={useLanguage().t('tickets.title')}
            items={tickets}
            columns={columns}
            loading={loading}
            onSelect={(item) => navigate(`/tickets/${item.id}`)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            searchKeys={['title', 'description', 'type']}
            hasMore={!!nextPageToken}
            onLoadMore={() => nextPageToken && fetchTickets(nextPageToken)}
            totalItems={totalItems}
        />
    );
};
export default Tickets;
