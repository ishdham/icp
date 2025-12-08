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
        </Container>
    );
};

export default Profile;
