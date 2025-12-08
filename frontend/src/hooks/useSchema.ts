import { useState, useEffect } from 'react';
import client from '../api/client';

interface SchemaData {
    schema: any;
    uischema: any;
}

export const useSchema = (type: string) => {
    const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchSchema = async () => {
            setLoading(true);
            try {
                const response = await client.get(`/schemas/${type}`);
                setSchemaData(response.data);
                setError(null);
            } catch (err: any) {
                console.error(`Error fetching schema for ${type}:`, err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (type) {
            fetchSchema();
        }
    }, [type]);

    return { ...schemaData, loading, error };
};
