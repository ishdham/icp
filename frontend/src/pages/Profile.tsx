import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';
import { Box, Typography, Container, CircularProgress } from '@mui/material';

const Profile = () => {
    const { user } = useAuth();
    const { schema: userSchema, uischema: userUiSchema, loading: schemaLoading } = useSchema('user');
    const [profileData, setProfileData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.uid) return;
            try {
                const response = await client.get(`/users/${user.uid}`);
                setProfileData(response.data);
            } catch (error) {
                console.error('Error fetching profile:', error);
                setProfileData({
                    firstName: user?.displayName?.split(' ')[0] || '',
                    lastName: user?.displayName?.split(' ')[1] || '',
                    email: user?.email,
                    role: user?.role,
                    uid: user?.uid
                });
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const [partners, setPartners] = useState<any[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');

    useEffect(() => {
        const fetchPartners = async () => {
            try {
                const response = await client.get('/partners?status=APPROVED'); // user can only join approved partners? Likely.
                setPartners(response.data || []);
            } catch (error) {
                console.error('Error fetching partners', error);
            }
        };
        fetchPartners();
    }, []);

    const handleUpdate = async (data: any) => {
        if (!user?.uid) return;
        try {
            await client.put(`/users/${user.uid}`, data);
            alert('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        }
    };

    const handleRequestAssociation = async () => {
        if (!selectedPartnerId || !user?.uid) return;
        try {
            await client.post(`/users/${user.uid}/associations`, { partnerId: selectedPartnerId });
            alert('Association requested successfully!');
            // Refresh profile logic?
            window.location.reload();
        } catch (error: any) {
            console.error('Error requesting association:', error);
            alert(error.response?.data?.error || 'Failed to request association');
        }
    };

    if (loading || schemaLoading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    if (!user) return <Typography p={4}>Please log in.</Typography>;
    if (!userSchema || !userUiSchema) return <Typography p={4} color="error">Failed to load profile form.</Typography>;

    const profileSchema = {
        ...userSchema,
        properties: {
            ...userSchema.properties,
            role: { ...userSchema.properties.role, readOnly: true },
            email: { ...userSchema.properties.email, readOnly: true }
        }
    };

    return (
        <Container maxWidth="md">
            <DetailView
                title="My Profile"
                data={profileData || {}}
                schema={profileSchema}
                uischema={userUiSchema}
                canEdit={true}
                onSave={handleUpdate}
            />

            <Box mt={6} mb={6} p={3} border="1px solid #ccc" borderRadius={2}>
                <Typography variant="h5" gutterBottom>Partner Associations</Typography>

                {profileData?.associatedPartners?.length > 0 ? (
                    <Box mb={2}>
                        {profileData.associatedPartners.map((assoc: any, idx: number) => {
                            // find partner name
                            const pName = partners.find(p => p.id === assoc.partnerId)?.organizationName || assoc.partnerId;
                            return (
                                <Box key={idx} display="flex" alignItems="center" gap={2} mb={1}>
                                    <Typography variant="body1"><strong>{pName}</strong></Typography>
                                    <Typography variant="caption" sx={{
                                        bgcolor: assoc.status === 'APPROVED' ? '#e8f5e9' : '#fff3e0',
                                        p: 0.5,
                                        borderRadius: 1
                                    }}>
                                        {assoc.status}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                ) : (
                    <Typography variant="body2" color="textSecondary" mb={2}>No active associations.</Typography>
                )}

                <Box display="flex" gap={2} alignItems="center" mt={2}>
                    <select
                        style={{ padding: '8px', width: '250px' }}
                        value={selectedPartnerId}
                        onChange={(e) => setSelectedPartnerId(e.target.value)}
                    >
                        <option value="">Select a Partner to Join...</option>
                        {partners.map(p => (
                            <option key={p.id} value={p.id}>{p.organizationName}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleRequestAssociation}
                        disabled={!selectedPartnerId}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: selectedPartnerId ? '#1976d2' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedPartnerId ? 'pointer' : 'default'
                        }}
                    >
                        Request Association
                    </button>
                </Box>
            </Box>
        </Container>
    );
};

export default Profile;
