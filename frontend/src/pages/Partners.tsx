import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';

const Partners = () => {
    const { user } = useAuth();
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

    const { schema, uischema, loading: schemaLoading, error: schemaError } = useSchema('partner');

    if (schemaLoading) return <div>Loading schema...</div>;
    if (schemaError) return <div className="text-red-500">{schemaError}</div>;

    if (selectedPartner || isCreating) {
        return (
            <div className="space-y-6">
                <Link
                    to="#"
                    onClick={() => { setSelectedPartner(null); setIsCreating(false); }}
                    className="text-brand-blue hover:text-brand-blue/80 mb-4 inline-block"
                >
                    &larr; Back to List
                </Link>
                <DetailView
                    title={isCreating ? 'Propose New Partner' : 'Partner Details'}
                    data={selectedPartner || {}}
                    schema={schema}
                    uischema={uischema}
                    canEdit={!!user} // Allow edit attempt if logged in
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => { setSelectedPartner(null); setIsCreating(false); }}
                />
            </div>
        );
    }

    const columns = [
        { key: 'organizationName', label: 'Organization' },
        { key: 'entityType', label: 'Type' },
        {
            key: 'status',
            label: 'Status',
            render: (value: string) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        value === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                    }`}>
                    {value}
                </span>
            )
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
