import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Base fields
const SolutionBase = {
    providedByPartnerId: z.string().describe('Provided By Partner ID').optional(),
    providedByPartnerName: z.string().describe('Provided By Partner Name').readonly().optional(),
    name: z.string().min(3, 'Required').describe('Solution Name'),
    summary: z.string().max(200).min(1, 'Required').describe('Summary (One Line)'),
    detail: z.string().min(1, 'Required').describe('Detailed Description'), // Renamed from description
    domain: z.enum(['Water', 'Health', 'Energy', 'Education', 'Livelihood', 'Sustainability']).describe('Domain'),
    verticalDomain: z.string().optional().describe('Vertical Domain'),
    benefit: z.string().min(1, 'Required').describe('Unique Value Proposition (Benefit)'), // Renamed from uniqueValueProposition
    costAndEffort: z.string().min(1, 'Required').describe('Cost and Effort'),
    returnOnInvestment: z.string().min(1, 'Required').describe('Return on Investment (ROI)'),
    launchYear: z.number().int().optional().describe('Launch Year'),
    targetBeneficiaries: z.array(z.string()).optional().describe('Target Beneficiaries'),
    status: z.enum(['PROPOSED', 'DRAFT', 'PENDING', 'APPROVED', 'MATURE', 'PILOT', 'REJECTED']).describe('Status'),
    references: z.array(z.string()).optional().describe('References (Links)'),
    attachments: z.array(z.string()).optional().describe('Attachments'),
    translations: z.record(z.string(), z.object({
        name: z.string().optional(),
        summary: z.string().optional(),
        detail: z.string().optional(),
        benefit: z.string().optional(),
        costAndEffort: z.string().optional(),
        returnOnInvestment: z.string().optional()
    }).partial()).optional().describe('Translations')
};

// System fields
const SystemFields = {
    id: z.string().describe('ID').readonly(),
    proposedByUserId: z.string().describe('Proposed By User ID').readonly(),
    proposedByUserName: z.string().describe('Proposed By User Name').readonly(),
    createdAt: z.string().describe('Created At').readonly(),
    updatedAt: z.string().describe('Updated At').readonly(),
};

// Input Schema
export const SolutionInputSchema = z.object({
    ...SolutionBase,
    id: SystemFields.id.optional(),
    proposedByUserId: SystemFields.proposedByUserId.optional(),
    proposedByUserName: SystemFields.proposedByUserName.optional(),
    createdAt: SystemFields.createdAt.optional(),
    updatedAt: SystemFields.updatedAt.optional(),
});

// Entity Schema
export const SolutionSchema = z.object({
    ...SolutionBase,
    ...SystemFields
});

const generatedSchema = zodToJsonSchema(SolutionInputSchema as any, 'solutionSchema');
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
                        { type: 'Control', scope: '#/properties/proposedByUserName', options: { readonly: true } }
                    ]
                }
            ]
        },
        {
            type: 'Group',
            label: 'Solution Overview',
            elements: [
                { type: 'Control', scope: '#/properties/name' },
                { type: 'Control', scope: '#/properties/providedByPartnerId' },
                { type: 'Control', scope: '#/properties/summary' },
                {
                    type: 'Control',
                    scope: '#/properties/detail',
                    options: { format: 'markdown' }
                },
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/domain' },
                        { type: 'Control', scope: '#/properties/verticalDomain' }
                    ]
                }
            ]
        },
        {
            type: 'Group',
            label: 'Impact & Benefits',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/benefit',
                    label: 'Unique Value Proposition (Benefit)',
                    options: { format: 'markdown' } // Label comes from schema: Unique Value Proposition (Benefit)
                },
                {
                    type: 'Control',
                    scope: '#/properties/returnOnInvestment',
                    label: 'Return on Investment (ROI)',
                    options: { format: 'markdown' } // Label comes from schema: Return on Investment (ROI)
                },
                {
                    type: 'Control',
                    scope: '#/properties/targetBeneficiaries',
                    options: {
                        renderer: 'beneficiary-select'
                    }
                }
            ]
        },
        {
            type: 'Group',
            label: 'Implementation Details',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/costAndEffort',
                    label: 'Cost and Effort',
                    options: { format: 'markdown' }
                },
                { type: 'Control', scope: '#/properties/launchYear' },
                { type: 'Control', scope: '#/properties/status' }
            ]
        },
        {
            type: 'Group',
            label: 'Resources',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/references'
                },
                {
                    type: 'Control',
                    scope: '#/properties/attachments',
                    label: 'Attachments',
                    options: {
                        renderer: 'file-uploader'
                    }
                }
            ]
        }
    ]
};
