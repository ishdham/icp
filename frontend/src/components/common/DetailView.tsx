import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import JsonForm from './JsonForm';
import { translateSchema, translateUiSchema } from '../../utils/schemaTranslator';
import { getDirtyValues } from '../../utils/diff';
import {
    Button,
    Paper,
    Typography,
    Box,
    Toolbar,
    AppBar
} from '@mui/material';

interface DetailViewProps {
    title: string;
    data: any;
    schema: any;
    uischema: any;
    readOnly?: boolean;
    onSave?: (data: any) => Promise<void>;
    onCancel?: () => void;
    canEdit?: boolean;
}

const DetailView: React.FC<DetailViewProps> = ({
    title,
    data: initialData,
    schema,
    uischema,
    readOnly = false,
    onSave,
    onCancel,
    canEdit = false
}) => {
    const { t } = useLanguage();
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(!readOnly && !initialData.id);
    const [errors, setErrors] = useState<any[]>([]);

    React.useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const translatedSchema = useMemo(() => {
        // Deep clone to avoid mutating the original schema which might be cached by useSchema
        const schemaHooks = JSON.parse(JSON.stringify(schema));
        return translateSchema(schemaHooks, t);
    }, [schema, t]);

    const translatedUiSchema = useMemo(() => {
        return translateUiSchema(uischema, t);
    }, [uischema, t]);

    const handleSave = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        // Log all current errors for debugging
        console.log('Validating before save:', { data, errors });

        let currentData = data;
        const additionalErrors = errors.filter(e => e.keyword === 'additionalProperties');

        if (additionalErrors.length > 0) {
            const props = additionalErrors.map(e => e.params.additionalProperty).join(', ');
            console.warn('Additional properties found:', additionalErrors);
            if (window.confirm(`The following extra fields were found: ${props}.\nDo you want to remove them and save?`)) {
                // Clone data to avoid mutating state directly
                const newData = JSON.parse(JSON.stringify(data));

                // Remove the extra properties
                additionalErrors.forEach(error => {
                    const path = error.instancePath.split('/').filter((p: string) => p);
                    let target = newData;
                    // Navigate to the object containing the property
                    for (const segment of path) {
                        if (target && target[segment]) {
                            target = target[segment];
                        }
                    }
                    // Delete the property
                    if (target && typeof target === 'object') {
                        delete target[error.params.additionalProperty];
                    }
                });

                currentData = newData;

                // If there are other errors besides additionalProperties, update state and stop
                if (errors.length > additionalErrors.length) {
                    setData(currentData);
                    const otherErrors = errors.filter(e => e.keyword !== 'additionalProperties');
                    console.error('Validation errors remaining:', otherErrors);
                    alert("Extra fields removed, but other validation errors remain. Please fix them.");
                    return;
                }
            } else {
                return; // User cancelled
            }
        } else if (errors.length > 0) {
            console.error('Validation errors:', errors);
            const errorMessages = errors.map(e => `${e.instancePath || 'Form'} ${e.message}`).join('\n');
            alert(`Please fix the following validation errors:\n${errorMessages}`);
            return;
        }

        if (onSave) {
            try {
                let payload = currentData;

                // If it's an update (has ID) and we have initial data to compare against
                if (!readOnly && initialData.id) {
                    const changes = getDirtyValues(initialData, currentData);
                    if (Object.keys(changes).length === 0) {
                        console.log("No changes detected.");
                        setIsEditing(false);
                        return;
                    }
                    payload = changes;
                }

                await onSave(payload);
                setIsEditing(false);
                // We don't perform setData(payload) because payload might be partial.
                // We expect parent to refresh data or for initialData prop to change.
                setData(currentData);
            } catch (error: any) {
                console.error("Save failed", error);
                // Check if it's a backend validation error (Zod)
                if (error.response?.data?.error) {
                    const errData = error.response.data.error;
                    // If Zod error array
                    if (Array.isArray(errData)) {
                        const formatted = errData.map((e: any) => `${e.path.join('.')} - ${e.message}`).join('\n');
                        alert(`Server Validation Failed:\n${formatted}`);
                    } else {
                        // Generic string error
                        alert(`Save Failed: ${errData}`);
                    }
                } else {
                    alert("Failed to save changes. Please try again.");
                }
                // Do NOT close edit mode, so user can fix it
            }
        }
    };

    return (
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        {title}
                        {/* Visual indicator for current language */}
                        <Typography variant="caption" sx={{
                            backgroundColor: 'rgba(0,0,0,0.05)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(0,0,0,0.1)'
                        }}>
                            Language: {useLanguage().language.toUpperCase()}
                        </Typography>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        {canEdit && !isEditing && (
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit
                            </Button>
                        )}
                        {isEditing && (
                            <>
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setData(initialData);
                                        // Only close the view if we are creating a new item
                                        if (!initialData.id && onCancel) onCancel();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={(e) => handleSave(e)}
                                    type="button"
                                >
                                    Save
                                </Button>
                                { /* Hidden submit button to enable enter key submission if needed, but preventing default reload */}
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>
            <Box sx={{ p: 3 }}>
                <form onSubmit={(e) => e.preventDefault()} noValidate>
                    <JsonForm
                        schema={translatedSchema}
                        uischema={translatedUiSchema}
                        data={data}
                        onChange={({ data, errors }) => {
                            setData(data);
                            setErrors(errors || []);
                        }}
                        readonly={!isEditing}
                    />
                </form>
            </Box>
        </Paper>
    );
};

export default DetailView;
