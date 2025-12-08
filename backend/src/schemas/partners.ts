import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const PartnerSchema = z.object({
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
    status: z.enum(['PROPOSED', 'APPROVED', 'REJECTED']).describe('Status').readonly()
});

const generatedSchema = zodToJsonSchema(PartnerSchema as any, 'partnerSchema');
export const partnerJsonSchema = (generatedSchema as any).definitions.partnerSchema;

export const partnerUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'Control',
            scope: '#/properties/organizationName'
        },
        {
            type: 'HorizontalLayout',
            elements: [
                {
                    type: 'Control',
                    scope: '#/properties/entityType'
                },
                {
                    type: 'Control',
                    scope: '#/properties/status',
                    options: { readonly: true }
                }
            ]
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
};
