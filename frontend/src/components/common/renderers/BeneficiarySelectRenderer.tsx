import { useEffect, useState } from 'react';
import { rankWith, type ControlProps } from '@jsonforms/core';
import { Autocomplete, TextField, Chip } from '@mui/material';
import axios from 'axios';

// Update with your actual API base URL configuration
const API_BASE_URL = 'http://localhost:3000/v1';

const BeneficiarySelectControl = (props: ControlProps) => {
    const { data, handleChange, path, enabled } = props;
    const [options, setOptions] = useState<string[]>([]);
    // const [loading, setLoading] = useState(false); // Removed unused loading state for now

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                // setLoading(true);
                const response = await axios.get(`${API_BASE_URL}/common/beneficiary-types`);
                if (Array.isArray(response.data)) {
                    setOptions(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch beneficiary types', error);
            } finally {
                // setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    const handleChangeValue = async (_: any, newValue: string[]) => {
        // Check if there's a new value that needs creating
        // Logic: if newValue contains something not in options, we might want to POST it.
        // Or we can just let the backend handle "new" ones if it scans solutions, 
        // but here we want to explicitly add to the list if the backend supports it.

        // Find new items
        const newItems = newValue.filter(item => !options.includes(item));

        for (const item of newItems) {
            try {
                await axios.post(`${API_BASE_URL}/common/beneficiary-types`, { name: item });
                // We assume success means it's added.
            } catch (e) {
                console.error('Error adding new type', e);
            }
        }

        // Update local options if needed (autocomplete usually handles this for free-solo, but for strict select we update)
        if (newItems.length > 0) {
            setOptions(prev => [...prev, ...newItems]);
        }

        handleChange(path, newValue);
    };

    return (
        <Autocomplete
            multiple
            freeSolo
            options={options}
            value={data || []}
            onChange={handleChangeValue}
            // onInputChange for free solo typing
            renderTags={(value: readonly string[], getTagProps) =>
                value.map((option: string, index: number) => {
                    const { key, ...tagProps } = getTagProps({ index });
                    return (
                        <Chip variant="outlined" key={key} label={option} {...tagProps} />
                    );
                })
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    label={props.label || "Target Beneficiaries"}
                    placeholder="Select or type to add..."
                />
            )}
            disabled={!enabled}
        />
    );
};

export const beneficiarySelectTester = rankWith(
    3,
    (uischema) => {
        return (uischema.options as any)?.renderer === 'beneficiary-select';
    }
);

export default BeneficiarySelectControl;
