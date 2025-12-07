import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import DetailView from '../components/common/DetailView';
import { useSchema } from '../hooks/useSchema';

const Profile = () => {
    const { user } = useAuth();
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

    const { schema, uischema, loading: schemaLoading, error: schemaError } = useSchema('user');

    if (loading || schemaLoading) return <div>Loading...</div>;
    if (schemaError) return <div className="text-red-500">{schemaError}</div>;
    if (!user) return <div>Please log in.</div>;

    const profileSchema = schema ? {
        ...schema,
        properties: {
            ...schema.properties,
            role: { ...schema.properties.role, readOnly: true },
            email: { ...schema.properties.email, readOnly: true }
        }
    } : {};

    return (
        <div className="max-w-3xl mx-auto">
            <DetailView
                title="My Profile"
                data={profileData || {}}
                schema={profileSchema}
                uischema={uischema}
                canEdit={true}
                onSave={handleUpdate}
            />
        </div>
    );
};

export default Profile;
