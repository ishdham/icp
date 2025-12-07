import { useState, useEffect } from 'react';
import client from '../api/client';

interface UseSchemaResult {
    schema: any;
    uischema: any;
    loading: boolean;
    error: string | null;
}

export const useSchema = (type: string): UseSchemaResult => {
    const [schema, setSchema] = useState<any>(null);
    const [uischema, setUischema] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            try {
                const response = await client.get(`/schemas/${type}`);
                setSchema(response.data.schema);
                setUischema(response.data.uischema);
            } catch (err: any) {
                console.error(`Error fetching schema for ${type}:`, err);
                setError(err.message || 'Failed to fetch schema');
            } finally {
                setLoading(false);
            }
        };

        fetchSchema();
    }, [type]);

    return { schema, uischema, loading, error };
};
