import React, { useState } from 'react';
import JsonForm from './JsonForm';

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
    const [isEditing, setIsEditing] = useState(!readOnly && !initialData.id); // Default to edit if creating new (no ID)
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
        <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                <div className="flex space-x-3">
                    {canEdit && !isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                            Edit
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setData(initialData);
                                    if (onCancel) onCancel();
                                }}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={errors.length > 0}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                            >
                                Save
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <JsonForm
                    schema={schema}
                    uischema={uischema}
                    data={data}
                    onChange={({ data, errors }) => {
                        setData(data);
                        setErrors(errors || []);
                    }}
                    readonly={!isEditing}
                />
            </div>
        </div>
    );
};

export default DetailView;
