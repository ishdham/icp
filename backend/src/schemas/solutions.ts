import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const SolutionSchema = z.object({
    id: z.string().describe('ID').readonly().optional(),
    providedByPartnerId: z.string().describe('Provided By Partner ID').optional(),
    providedByPartnerName: z.string().describe('Provided By Partner Name').readonly().optional(),
    proposedByUserId: z.string().describe('Proposed By User ID').readonly().optional(),
    proposedByUserName: z.string().describe('Proposed By User Name').readonly().optional(),
    createdAt: z.string().describe('Created At').readonly().optional(),
    updatedAt: z.string().describe('Updated At').readonly().optional(),
    name: z.string().min(3).describe('Solution Name'),
    description: z.string().describe('Description'),
    domain: z.enum(['Water', 'Health', 'Energy', 'Education', 'Livelihood', 'Sustainability']).describe('Domain'),
    verticalDomain: z.string().optional().describe('Vertical Domain'),
    uniqueValueProposition: z.string().describe('Unique Value Proposition'),
    launchYear: z.number().int().optional().describe('Launch Year'),
    targetBeneficiaries: z.array(z.string()).optional().describe('Target Beneficiaries'),
    status: z.enum(['PROPOSED', 'DRAFT', 'PENDING', 'APPROVED', 'MATURE', 'PILOT', 'REJECTED']).describe('Status')
});

const generatedSchema = zodToJsonSchema(SolutionSchema as any, 'solutionSchema');
export const solutionJsonSchema = (generatedSchema as any).definitions.solutionSchema;

export const solutionUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'Group',
            label: 'System Info',
            elements: [
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/id', options: { readonly: true } },
                        { type: 'Control', scope: '#/properties/createdAt', options: { readonly: true } },
                        { type: 'Control', scope: '#/properties/updatedAt', options: { readonly: true } }
                    ]
                },
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/providedByPartnerName', options: { readonly: true } },
                        { type: 'Control', scope: '#/properties/proposedByUserName', options: { readonly: true } }
                    ]
                }
            ]
        },
        {
            type: 'Group',
            label: 'Solution Details',
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
                    type: 'Control',
                    scope: '#/properties/launchYear'
                },
                {
                    type: 'Control',
                    scope: '#/properties/targetBeneficiaries'
                },
                {
                    type: 'Control',
                    scope: '#/properties/providedByPartnerId'
                },
                {
                    type: 'Control',
                    scope: '#/properties/status'
                }
            ]
        }
    ]
};
