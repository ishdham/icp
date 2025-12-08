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

    const handleSave = async () => {
        if (onSave) {
            try {
                await onSave(data);
                setIsEditing(false);
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
                                        if (onCancel) onCancel();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleSave}
                                    disabled={errors.length > 0}
                                >
                                    Save
                                </Button>
                            </>
                        )}
                    </Box>
                </Toolbar>
            </AppBar>
            <Box sx={{ p: 3 }}>
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
            </Box>
        </Paper>
    );
};

export default DetailView;
