import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';

const Tickets = () => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const { schema, uischema, loading: schemaLoading, error: schemaError } = useSchema('ticket');
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

    const canApprove = (user?.role === 'ADMIN' || user?.role === 'ICP_SUPPORT') &&
        selectedTicket?.status !== 'RESOLVED' &&
        (selectedTicket?.type === 'SOLUTION_APPROVAL' || selectedTicket?.type === 'PARTNER_APPROVAL');

    if (schemaLoading) return <div>Loading schema...</div>;
    if (schemaError) return <div className="text-red-500">{schemaError}</div>;

    if (selectedTicket) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-brand-blue hover:text-brand-blue/80"
                    >
                        &larr; Back to List
                    </button>
                    {canApprove && (
                        <button
                            onClick={handleResolve}
                            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                        >
                            Approve Request
                        </button>
                    )}
                </div>
                <DetailView
                    title="Ticket Details"
                    data={selectedTicket}
                    schema={schema}
                    uischema={uischema}
                    readOnly={true} // Tickets are mostly read-only for now, updates via comments/status actions
                    canEdit={false}
                />
            </div>
        );
    }

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === 'RESOLVED' ? 'bg-green-100 text-green-800' :
                    value === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                    }`}>
                    {value}
                </span>
            )
        }
    ];

    return (
        <ListView
            title="Tickets"
            items={tickets}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedTicket(item)}
            // onCreate={...} // Ticket creation is usually automated or via specific flows, omit for now or add if needed
            searchKeys={['title', 'description', 'type']}
        />
    );
};

export default Tickets;
