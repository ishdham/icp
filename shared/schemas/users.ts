import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Base fields
const UserBase = {
    firstName: z.string().describe('First Name'),
    lastName: z.string().describe('Last Name'),
    email: z.string().email().describe('Email').readonly(),
    role: z.enum(['REGULAR', 'ADMIN', 'ICP_SUPPORT']).describe('Role'),
    language: z.string().default('en').describe('Preferred Language'),
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
};

// System fields
const SystemFields = {
    id: z.string().describe('ID').readonly(),
    uid: z.string().describe('UID').readonly(),
    createdAt: z.string().describe('Created At').readonly(),
    updatedAt: z.string().describe('Updated At').readonly(),
};

// Input Schema
export const UserInputSchema = z.object({
    ...UserBase,
    id: SystemFields.id.optional(),
    uid: SystemFields.uid.optional(),
    createdAt: SystemFields.createdAt.optional(),
    updatedAt: SystemFields.updatedAt.optional(),
});
export type UserInput = z.infer<typeof UserInputSchema>;

// Entity Schema
export const UserSchema = z.object({
    ...UserBase,
    ...SystemFields
});

const generatedSchema = zodToJsonSchema(UserInputSchema as any, 'userSchema');
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
