import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const SolutionSchema = z.object({
    name: z.string().min(3).describe('Solution Name'),
    description: z.string().describe('Description'),
    domain: z.enum(['Water', 'Health', 'Energy', 'Education', 'Livelihood', 'Sustainability']).describe('Domain'),
    verticalDomain: z.string().optional().describe('Vertical Domain'),
    uniqueValueProposition: z.string().describe('Unique Value Proposition'),
    launchYear: z.number().int().optional().describe('Launch Year'),
    targetBeneficiaries: z.array(z.string()).optional().describe('Target Beneficiaries'),
    status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'MATURE', 'PILOT', 'REJECTED']).describe('Status').readonly()
});

const generatedSchema = zodToJsonSchema(SolutionSchema as any, 'solutionSchema');
export const solutionJsonSchema = (generatedSchema as any).definitions.solutionSchema;

export const solutionUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'Control',
            scope: '#/properties/name'
        },
        {
            type: 'Control',
            scope: '#/properties/description',
            options: {
                multi: true
            }
        },
        {
            type: 'HorizontalLayout',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/domain'
                },
                {
                    type: 'Control',
                    scope: '#/properties/verticalDomain'
                }
            ]
        },
        {
            type: 'Control',
            scope: '#/properties/uniqueValueProposition'
        },
        {
            type: 'HorizontalLayout',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/launchYear'
                },
                {
                    type: 'Control',
                    scope: '#/properties/status',
                    options: {
                        readonly: true
                    }
                }
            ]
        },
        {
            type: 'Control',
            scope: '#/properties/targetBeneficiaries'
        }
    ]
};
