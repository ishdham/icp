import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Chip, Button, Box, Typography, CircularProgress } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { canSeeUsers, canEditUsers } from '../utils/permissions';

const Users = () => {
    const { user } = useAuth();
    const { schema, uischema, loading: schemaLoading } = useSchema('user');
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
        if (canSeeUsers(user)) {
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

    if (!canSeeUsers(user)) {
        return <Typography color="error" sx={{ p: 3 }}>Unauthorized: Admins only.</Typography>;
    }

    if (selectedUser) {
        if (schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => setSelectedUser(null)}
                    sx={{ mb: 2 }}
                >
                    Back to List
                </Button>
                <DetailView
                    title="User Details"
                    data={selectedUser}
                    schema={schema}
                    uischema={uischema}
                    canEdit={canEditUsers(user)}
                    onSave={handleUpdate}
                    onCancel={() => setSelectedUser(null)}
                />
            </Box>
        );
    }

    const columns = [
        { key: 'email', label: 'Email' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        {
            key: 'role',
            label: 'Role',
            render: (value: string) => {
                let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "default";
                if (value === 'ADMIN') color = "secondary";
                else if (value === 'ICP_SUPPORT') color = "primary";

                return <Chip label={value || 'REGULAR'} color={color} size="small" variant={value ? "filled" : "outlined"} />;
            }
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
