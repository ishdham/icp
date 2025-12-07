import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';

const Users = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await client.get('/users');
            setUsers(response.data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchUsers();
        }
    }, [user]);

    const handleUpdate = async (data: any) => {
        if (!selectedUser?.id) return;
        try {
            const { id, ...updateData } = data;
            await client.put(`/users/${selectedUser.id}`, updateData);
            setSelectedUser(null);
            fetchUsers();
            alert('User updated successfully!');
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user.');
        }
    };

    const { schema, uischema, loading: schemaLoading, error: schemaError } = useSchema('user');

    if (user?.role !== 'ADMIN') {
        return <div className="p-4 text-red-500">Unauthorized: Admins only.</div>;
    }

    if (schemaLoading) return <div>Loading schema...</div>;
    if (schemaError) return <div className="text-red-500">{schemaError}</div>;

    if (selectedUser) {
        return (
            <div className="space-y-6">
                <Link to="/" className="text-brand-blue hover:text-brand-blue/80 mb-4 inline-block">&larr; Back to Dashboard</Link>
                <button
                    onClick={() => setSelectedUser(null)}
                    className="text-brand-blue hover:text-brand-blue/80 mb-4" // Changed className as per instruction
                >
                    &larr; Back to List
                </button>
                <DetailView
                    title="User Details"
                    data={selectedUser}
                    schema={schema}
                    uischema={uischema}
                    canEdit={true}
                    onSave={handleUpdate}
                    onCancel={() => setSelectedUser(null)}
                />
            </div>
        );
    }

    const columns = [
        { key: 'email', label: 'Email' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        {
            key: 'role',
            label: 'Role',
            render: (value: string) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    value === 'ICP_SUPPORT' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                    }`}>
                    {value || 'REGULAR'}
                </span>
            )
        }
    ];

    return (
        <ListView
            title="User Management"
            items={users}
            columns={columns}
            loading={loading}
            onSelect={(item) => setSelectedUser(item)}
            searchKeys={['email', 'firstName', 'lastName']}
        />
    );
};

export default Users;
