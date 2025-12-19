import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Base fields for user input
const PartnerBase = {
    organizationName: z.string().min(3).describe('Organization Name'),
    entityType: z.enum(['NGO', 'Social Impact Entity', 'Academic', 'Corporate']).describe('Entity Type'),
    websiteUrl: z.string().url().optional().describe('Website URL'),
    contact: z.object({
        email: z.string().email().optional().describe('Email'),
        phone: z.string().optional().describe('Phone')
    }).optional().describe('Contact Information'),
    address: z.object({
        city: z.string().optional().describe('City'),
        country: z.string().optional().describe('Country')
    }).optional().describe('Address'),
    description: z.string().optional().describe('Description'),
    status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED', 'MATURE']).describe('Status'),
    translations: z.record(z.string(), z.object({
        organizationName: z.string().optional(),
        description: z.string().optional(),
        // Add other translatable fields here as needed
    }).partial()).optional().describe('Translations')
};

// System fields
const SystemFields = {
    id: z.string().describe('ID').readonly(),
    proposedByUserId: z.string().describe('Proposer ID').readonly(),
    proposedByUserName: z.string().describe('Proposed By').readonly(),
    createdAt: z.string().describe('Created At').readonly(),
    updatedAt: z.string().describe('Updated At').readonly(),
};

// Input Schema: System fields are optional (for forms/creation)
export const PartnerInputSchema = z.object({
    ...PartnerBase,
    id: SystemFields.id.optional(),
    proposedByUserId: SystemFields.proposedByUserId.optional(),
    proposedByUserName: SystemFields.proposedByUserName.optional(),
    createdAt: SystemFields.createdAt.optional(),
    updatedAt: SystemFields.updatedAt.optional(),
});
export type PartnerInput = z.infer<typeof PartnerInputSchema>;

// Entity Schema: System fields are required (for backend/types)
export const PartnerSchema = z.object({
    ...PartnerBase,
    ...SystemFields
});

// Generate JSON Schema from Input Schema so forms don't validation-error on missing system fields
const generatedSchema = zodToJsonSchema(PartnerInputSchema as any, 'partnerSchema');
export const partnerJsonSchema = (generatedSchema as any).definitions.partnerSchema;

export const partnerUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'Group',
            label: 'System Info',
            elements: [
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/id', options: { readonly: true } }
                    ]
                },
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/createdAt', options: { readonly: true } },
                        { type: 'Control', scope: '#/properties/updatedAt', options: { readonly: true } }
                    ]
                },
                { type: 'Control', scope: '#/properties/proposedByUserName', options: { readonly: true } }
            ]
        },
        {
            type: 'Group',
            label: 'Organization Details',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/organizationName'
                },
                {
                    type: 'Control',
                    scope: '#/properties/entityType'
                },
                {
                    type: 'Control',
                    scope: '#/properties/description',
                    options: { format: 'markdown', multi: true }
                },
                {
                    type: 'Control',
                    scope: '#/properties/websiteUrl'
                },
                {
                    type: 'Control',
                    scope: '#/properties/status'
                },
                {
                    type: 'Group',
                    label: 'Contact Details',
                    elements: [
                        {
                            type: 'HorizontalLayout',
                            elements: [
                                { type: 'Control', scope: '#/properties/contact/properties/email' },
                                { type: 'Control', scope: '#/properties/contact/properties/phone' }
                            ]
                        }
                    ]
                },
                {
                    type: 'Group',
                    label: 'Location',
                    elements: [
                        {
                            type: 'HorizontalLayout',
                            elements: [
                                { type: 'Control', scope: '#/properties/address/properties/city' },
                                { type: 'Control', scope: '#/properties/address/properties/country' }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
};
