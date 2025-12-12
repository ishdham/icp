import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import ListView from '../components/common/ListView';
import { Chip, Button, Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

const Users = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [currentSearch, setCurrentSearch] = useState('');

    const fetchUsers = async (pageNum: number = 1, searchQuery: string = '') => {
        setLoading(true);
        try {
            const params: any = { limit: 20, page: pageNum };
            if (searchQuery) params.q = searchQuery;

            const response = await client.get('/users', { params });
            const { items, total, totalPages: pages } = response.data;

            setUsers(items || []);
            setTotalItems(total || 0);
            setTotalPages(pages || 1);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUser = async (uid: string) => {
        setLoading(true);
        try {
            const response = await client.get(`/users/${uid}`);
            setSelectedUser(response.data);
        } catch (error) {
            console.error('Error fetching user:', error);
            navigate('/users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.role === 'ADMIN') {
            fetchUsers(page, currentSearch);
        } else if (user) {
            // Non-admin trying to access users list? 
            // Currently Users page is strictly Admin.
            // But if user is accessing his own profile via /users/me or /users/:id 
            // We should allow detailing view if ID matches.
        }
    }, [user, page, currentSearch]);

    useEffect(() => {
        if (id && user) {
            if (id === selectedUser?.uid) return;
            fetchUser(id);
        } else {
            setSelectedUser(null);
        }
    }, [id, user]);

    const handleUpdateRole = async (uid: string, newRole: string) => {
        try {
            await client.put(`/users/${uid}`, { role: newRole });
            alert('User role updated');
            fetchUser(uid); // Refresh details
            fetchUsers(page, currentSearch); // Refresh list
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role');
        }
    };

    const handleSearch = (query: string) => {
        setCurrentSearch(query);
        setPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };


    if (!user || user.role !== 'ADMIN') {
        return <Typography variant="h6" p={4}>Access Denied</Typography>;
    }

    if (selectedUser) {
        return (
            <Box>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/users')} sx={{ mb: 2 }}>
                    Back to List
                </Button>
                <Paper sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>User Profile: {selectedUser.email}</Typography>
                    <Typography><strong>Name:</strong> {selectedUser.firstName} {selectedUser.lastName}</Typography>
                    <Typography><strong>UID:</strong> {selectedUser.uid}</Typography>
                    <Box mt={2} display="flex" alignItems="center" gap={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={selectedUser.role || 'REGULAR'}
                                label="Role"
                                onChange={(e) => handleUpdateRole(selectedUser.uid, e.target.value)}
                            >
                                <MenuItem value="REGULAR">Regular</MenuItem>
                                <MenuItem value="ICP_SUPPORT">ICP Support</MenuItem>
                                <MenuItem value="ADMIN">Admin</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                    <Box mt={4}>
                        <Typography variant="h6">Associations</Typography>
                        {/* List associations if any */}
                    </Box>
                </Paper>
            </Box>
        );
    }

    const columns = [
        { key: 'email', label: 'Email' },
        {
            key: 'firstName',
            label: 'Name',
            render: (_: any, item: any) => `${item.firstName || ''} ${item.lastName || ''}`
        },
        {
            key: 'role',
            label: 'Role',
            render: (value: string) => <Chip label={value} size="small" color={value === 'ADMIN' ? 'secondary' : 'default'} />
        },
        {
            key: 'createdAt',
            label: 'Joined',
            render: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
        }
    ];

    return (
        <ListView
            title="Users Management"
            items={users}
            columns={columns}
            loading={loading}
            onSelect={(item) => navigate(`/users/${item.uid}`)}
            onSearch={handleSearch}
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={handlePageChange}
        />
    );
};

export default Users;
