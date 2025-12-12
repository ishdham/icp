import client from './client';

export const updateUserProfile = async (uid: string, data: any) => {
    const response = await client.put(`/users/${uid}`, data);
    return response.data;
};
