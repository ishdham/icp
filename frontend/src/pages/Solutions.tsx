import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { Link } from 'react-router-dom';
import { useSchema } from '../hooks/useSchema';

const Solutions = () => {
    const { user } = useAuth();
    const [solutions, setSolutions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const fetchSolutions = async () => {
        setLoading(true);
        try {
            const response = await client.get('/solutions');
            setSolutions(response.data.items || []);
        } catch (error) {
            console.error('Error fetching solutions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSolutions();
    }, []);

    const { schema, uischema, loading: schemaLoading, error: schemaError } = useSchema('solution');

    const handleCreate = async (data: any) => {
        try {
            await client.post('/solutions', { ...data, status: 'DRAFT' });
            setIsCreating(false);
            fetchSolutions();
            alert('Solution submitted successfully!');
        } catch (error) {
            console.error('Error creating solution:', error);
            alert('Failed to create solution.');
        }
    };

    const handleUpdate = async (data: any) => {
        if (!selectedSolution?.id) return;
        try {
            // Remove read-only fields if necessary, or backend handles it
            const { id, ...updateData } = data;
            await client.put(`/solutions/${selectedSolution.id}`, updateData);
            setSelectedSolution(null);
            fetchSolutions();
            alert('Solution updated successfully!');
        } catch (error) {
            console.error('Error updating solution:', error);
            alert('Failed to update solution.');
        }
    };

    if (schemaLoading) return <div>Loading schema...</div>;
    if (schemaError) return <div className="text-red-500">{schemaError}</div>;

    if (selectedSolution || isCreating) {
        return (
            <div className="space-y-6">
                <Link to="/" className="text-brand-blue hover:text-brand-blue/80 mb-4 inline-block">&larr; Back to Dashboard</Link>
                <DetailView
                    title={isCreating ? 'Submit New Solution' : 'Solution Details'}
                    data={selectedSolution || {}}
                    schema={schema}
                    uischema={uischema}
                    readOnly={!isCreating && !user}
                    canEdit={!!user}
                    onSave={isCreating ? handleCreate : handleUpdate}
                    onCancel={() => { setSelectedSolution(null); setIsCreating(false); }}
                />
            </div>
        );
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'domain', label: 'Domain' },
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
            title="Solutions"
            items={solutions}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedSolution(item)}
            onCreate={user ? () => setIsCreating(true) : undefined}
            searchKeys={['name', 'domain', 'description']}
        />
    );
};

export default Solutions;
