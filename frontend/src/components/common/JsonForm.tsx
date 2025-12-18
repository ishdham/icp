import React from 'react';
import { JsonForms } from '@jsonforms/react';
import { materialRenderers, materialCells } from '@jsonforms/material-renderers';
import MarkdownControl, { markdownRendererTester } from './renderers/MarkdownRenderer';
import BeneficiarySelectControl, { beneficiarySelectTester } from './renderers/BeneficiarySelectRenderer';
import FileUploaderControl, { fileUploaderTester } from './renderers/FileUploaderRenderer';

import AsyncAutocompleteControl, { asyncAutocompleteTester } from './renderers/AsyncAutocompleteRenderer';

const customRenderers = [
    ...materialRenderers,
    { tester: markdownRendererTester, renderer: MarkdownControl },
    { tester: beneficiarySelectTester, renderer: BeneficiarySelectControl },
    { tester: fileUploaderTester, renderer: FileUploaderControl },
    { tester: asyncAutocompleteTester, renderer: AsyncAutocompleteControl }
];

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
    renderers = customRenderers,
    cells = materialCells,
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
