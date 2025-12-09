import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const PartnerSchema = z.object({
    id: z.string().describe('ID').readonly().optional(),
    proposedByUserId: z.string().describe('Proposer ID').readonly().optional(),
    proposedByUserName: z.string().describe('Proposed By').readonly().optional(),
    createdAt: z.string().describe('Created At').readonly().optional(),
    updatedAt: z.string().describe('Updated At').readonly().optional(),
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
    status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED']).describe('Status')
});

const generatedSchema = zodToJsonSchema(PartnerSchema as any, 'partnerSchema');
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
                        { type: 'Control', scope: '#/properties/id' }
                    ]
                },
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/createdAt' },
                        { type: 'Control', scope: '#/properties/updatedAt' }
                    ]
                },
                { type: 'Control', scope: '#/properties/proposedByUserName' }
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
                    scope: '#/properties/websiteUrl'
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
