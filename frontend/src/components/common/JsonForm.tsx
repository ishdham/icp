import React from 'react';
import { JsonForms } from '@jsonforms/react';
import { vanillaRenderers, vanillaCells } from '@jsonforms/vanilla-renderers';

interface JsonFormProps {
    data: any;
    schema: any;
    uischema: any;
    renderers?: any[];
    cells?: any[];
    onChange?: (state: { data: any; errors?: any[] }) => void;
    readonly?: boolean;
}

const JsonForm: React.FC<JsonFormProps> = ({
    data,
    schema,
    uischema,
    renderers = vanillaRenderers,
    cells = vanillaCells,
    onChange,
    readonly
}) => {
    return (
        <JsonForms
            schema={schema}
            uischema={uischema}
            data={data}
            renderers={renderers}
            cells={cells}
            onChange={onChange}
            readonly={readonly}
        />
    );
};

export default JsonForm;
