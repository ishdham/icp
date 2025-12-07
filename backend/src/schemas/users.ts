import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const UserSchema = z.object({
    firstName: z.string().describe('First Name'),
    lastName: z.string().describe('Last Name'),
    email: z.string().email().describe('Email').readonly(),
    role: z.enum(['REGULAR', 'ADMIN', 'ICP_SUPPORT']).describe('Role'),
    phone: z.object({
        countryCode: z.string().optional().describe('Country Code'),
        number: z.string().optional().describe('Number')
    }).optional().describe('Phone'),
    discoverySource: z.string().optional().describe('Discovery Source')
});

export const userJsonSchema = zodToJsonSchema(UserSchema as any, 'userSchema');

export const userUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'HorizontalLayout',
            elements: [
                { type: 'Control', scope: '#/properties/firstName' },
                { type: 'Control', scope: '#/properties/lastName' }
            ]
        },
        {
            type: 'HorizontalLayout',
            elements: [
                { type: 'Control', scope: '#/properties/email', options: { readonly: true } },
                { type: 'Control', scope: '#/properties/role' }
            ]
        },
        {
            type: 'Group',
            label: 'Phone',
            elements: [
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/phone/properties/countryCode' },
                        { type: 'Control', scope: '#/properties/phone/properties/number' }
                    ]
                }
            ]
        },
        { type: 'Control', scope: '#/properties/discoverySource' }
    ]
};
