import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canEditTickets } from '../utils/permissions';

const Tickets = () => {
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('ticket');
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const response = await client.get('/tickets');
            setTickets(response.data || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

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
            setSelectedTicket(null);
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
            setSelectedTicket(null);
            fetchTickets();
            alert('Ticket updated successfully!');
        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('Failed to update ticket.');
        }
    };

    const canApprove = (user?.role === 'ADMIN' || user?.role === 'ICP_SUPPORT') &&
        selectedTicket?.status !== 'RESOLVED' &&
        (selectedTicket?.type === 'SOLUTION_APPROVAL' || selectedTicket?.type === 'PARTNER_APPROVAL');

    (selectedTicket?.type === 'SOLUTION_APPROVAL' || selectedTicket?.type === 'PARTNER_APPROVAL');

    if (selectedTicket || isCreating) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => { setSelectedTicket(null); setIsCreating(false); }}
                    >
                        Back to List
                    </Button>
                    {!isCreating && canApprove && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleResolve}
                        >
                            Approve Request
                        </Button>
                    )}
                </Box>
                <DetailView
                    title={isCreating ? 'Submit New Ticket' : 'Ticket Details'}
                    data={selectedTicket || {}}
                    schema={schema}
                    uischema={uischema}
                    readOnly={false}
                    canEdit={isCreating ? true : canEditTickets(user, selectedTicket)}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => { setSelectedTicket(null); setIsCreating(false); }}
                />
            </Box>
        );
    }

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'RESOLVED') color = "success";
                else if (value === 'CLOSED') color = "default";
                else if (value === 'NEW') color = "warning";
                else if (value === 'IN_PROGRESS') color = "info";

                return <Chip label={value} color={color} size="small" />;
            }
        }
    ];

    return (
        <ListView
            title="Tickets"
            items={tickets}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedTicket(item)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            searchKeys={['title', 'description', 'type']}
        />
    );
};

export default Tickets;
