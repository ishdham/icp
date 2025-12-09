import React, { useState } from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers, materialCells } from '@jsonforms/material-renderers';
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
    const [data, setData] = useState(initialData);
    const [isEditing, setIsEditing] = useState(!readOnly && !initialData.id);
    const [errors, setErrors] = useState<any[]>([]);

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
                await onSave(currentData);
                setIsEditing(false);
                // Update local state with the cleaned data
                setData(currentData);
            } catch (error) {
                console.error("Save failed", error);
                alert("Failed to save changes.");
            }
        }
    };

    return (
        <Paper elevation={3} sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title}
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
                    <JsonForms
                        schema={schema}
                        uischema={uischema}
                        data={data}
                        renderers={materialRenderers}
                        cells={materialCells}
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
