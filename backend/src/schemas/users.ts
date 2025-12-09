import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const UserSchema = z.object({
    id: z.string().describe('ID').readonly().optional(),
    uid: z.string().describe('UID').readonly().optional(),
    createdAt: z.string().describe('Created At').readonly().optional(),
    updatedAt: z.string().describe('Updated At').readonly().optional(),
    firstName: z.string().describe('First Name'),
    lastName: z.string().describe('Last Name'),
    email: z.string().email().describe('Email').readonly(),
    role: z.enum(['REGULAR', 'ADMIN', 'ICP_SUPPORT']).describe('Role'),
    phone: z.object({
        countryCode: z.string().optional().describe('Country Code'),
        number: z.string().optional().describe('Number')
    }).optional().describe('Phone'),
    discoverySource: z.string().optional().describe('Discovery Source'),
    bookmarks: z.array(z.object({
        solutionId: z.string().describe('Solution ID').readonly(),
        solutionName: z.string().describe('Solution Name').readonly().optional(),
        bookmarkedAt: z.string().describe('Bookmarked At').readonly().optional()
    })).optional().describe('Bookmarks'),
    associatedPartners: z.array(z.object({
        partnerId: z.string(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
        requestedAt: z.string().optional(),
        approvedAt: z.string().optional()
    })).optional().describe('Associated Partners')
});

const generatedSchema = zodToJsonSchema(UserSchema as any, 'userSchema');
export const userJsonSchema = (generatedSchema as any).definitions.userSchema;

export const userUiSchema = {
    type: 'VerticalLayout',
    elements: [
        {
            type: 'Group',
            label: 'System Info',
            elements: [
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/id' },
                        { type: 'Control', scope: '#/properties/uid' }
                    ]
                },
                {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/createdAt' },
                        { type: 'Control', scope: '#/properties/updatedAt' }
                    ]
                }
            ]
        },
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
        { type: 'Control', scope: '#/properties/discoverySource' },
        {
            type: 'Control',
            scope: '#/properties/bookmarks',
            options: {
                detail: {
                    type: 'VerticalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/solutionName' },
                        { type: 'Control', scope: '#/properties/bookmarkedAt' }
                    ]
                },
                showSort: true
            }
        },
        {
            type: 'Control',
            scope: '#/properties/associatedPartners',
            options: {
                detail: {
                    type: 'HorizontalLayout',
                    elements: [
                        { type: 'Control', scope: '#/properties/partnerId' },
                        { type: 'Control', scope: '#/properties/status', options: { readonly: true } }
                    ]
                }
            }
        }
    ]
};
