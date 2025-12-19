
import React, { useState, useEffect, useMemo } from 'react';
import { rankWith, scopeEndsWith } from '@jsonforms/core';
import type { ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import client from '../../../api/client';
import debounce from 'lodash.debounce';

interface AsyncAutocompleteControlProps extends ControlProps {
    uischema: any;
}

const AsyncAutocompleteControl = (props: AsyncAutocompleteControlProps) => {
    const { data, handleChange, path, uischema, enabled, visible, label, required, errors } = props;
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [value, setValue] = useState<any>(null);

    // Configuration from UI Schema options
    const apiUrl = uischema.options?.apiUrl || '/partners';
    const labelKey = uischema.options?.labelKey || 'organizationName';
    const valueKey = uischema.options?.valueKey || 'id';

    // Fetch initial value if data exists (and we don't have the object populated)
    useEffect(() => {
        let active = true;

        if (!data) {
            setValue(null);
            return;
        }

        // If we already have the full object as value (unlikely for string control, but possible if passed weirdly), 
        // or if we have just the ID, we might need to fetch the display label if it's not denormalized elsewhere.
        // HOWEVER, our solution data DOES have `providedByPartnerName`. 
        // But this renderer binds to `providedByPartnerId`.
        // We can look at adjacent data if we had access to root data, but standard ControlProps only gives us `data` (the leaf value).
        // So we might need to fetch the single item to display it correctly if we only have ID.

        // Optimisation: If we can pass the name via options or sibling data, that's better.
        // But standard pattern: Fetch by ID.

        (async () => {
            // For now, if we have an ID, we try to fetch it to show the label correctly
            // UNLESS we are in the "options" list already.
            // But options list is dynamic.

            if (active) {
                try {
                    setLoading(true);
                    const res = await client.get(`${apiUrl}/${data}`);
                    // Backend returns { ...partner }
                    setValue(res.data);
                } catch (e) {
                    console.error("Failed to fetch initial value", e);
                } finally {
                    setLoading(false);
                }
            }
        })();

        return () => { active = false; };
    }, [data, apiUrl]);


    const fetchOptions = useMemo(
        () =>
            debounce(async (request: { input: string }, callback: (results: any[]) => void) => {
                try {
                    const params = { q: request.input, limit: 20 };
                    const response = await client.get(apiUrl, { params });
                    const items = response.data.items || response.data || [];
                    callback(items);
                } catch (error) {
                    console.error("Autocomplete search error", error);
                    callback([]);
                }
            }, 300),
        [apiUrl]
    );

    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            setOptions(value ? [value] : []);
            return undefined;
        }

        setLoading(true);

        fetchOptions({ input: inputValue }, (results: any[]) => {
            if (active) {
                let newOptions = [...results];
                setOptions(newOptions);
                setLoading(false);
            }
        });

        return () => {
            active = false;
        };
    }, [inputValue, fetchOptions, value]);

    if (!visible) return null;

    return (
        <Autocomplete
            id={`autocomplete-${path}`}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            isOptionEqualToValue={(option, value) => option[valueKey] === value[valueKey]}
            getOptionLabel={(option) => option[labelKey] || ''}
            options={options}
            loading={loading}
            disabled={!enabled}
            value={value}
            onChange={(_event: any, newValue: any | null) => {
                setValue(newValue);
                handleChange(path, newValue ? newValue[valueKey] : null);
            }}
            onInputChange={(_event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label + (required ? '*' : '')}
                    error={errors.length > 0}
                    helperText={errors}
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                />
            )}
        />
    );
};

export default withJsonFormsControlProps(AsyncAutocompleteControl);

export const asyncAutocompleteTester = rankWith(
    3, // Rank higher than default enum control
    scopeEndsWith('providedByPartnerId') // Specific targeting for now, or generic option check
);
