import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Base fields
const TicketBase = {
    title: z.string().describe('Title'),
    description: z.string().describe('Description'),
    solutionId: z.string().describe('Solution ID').optional(),
    partnerId: z.string().describe('Partner ID').optional(),
    ticketId: z.string().describe('Ticket Display ID').optional(),
    type: z.enum([
        'PROBLEM_SUBMISSION', 'OPTIMIZATION', 'FUNDING', 'CAPACITY_BUILDING',
        'TRAINING', 'SUCCESS_STORIES', 'PARTNER_INFO', 'USER_GROUP_CHANGE',
        'PARTNER_CONNECT', 'SOLUTION_VALIDATION', 'SOLUTION_APPROVAL', 'PARTNER_APPROVAL'
    ]).describe('Ticket Type'),
    status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).describe('Status'),
    comments: z.array(z.object({
        content: z.string().describe('Message'),
        createdAt: z.string().datetime().describe('Date'),
        userId: z.string().describe('User')
    })).describe('Comments').readonly().optional()
};

// System fields
const SystemFields = {
    id: z.string().describe('ID').readonly(),
    createdByUserId: z.string().describe('Creator ID').readonly(),
    createdByUserName: z.string().describe('Created By').readonly(),
    createdAt: z.string().describe('Created At').readonly(),
    updatedAt: z.string().describe('Updated At').readonly(),
};

// Input Schema
export const TicketInputSchema = z.object({
    ...TicketBase,
    id: SystemFields.id.optional(),
    createdByUserId: SystemFields.createdByUserId.optional(),
    createdByUserName: SystemFields.createdByUserName.optional(),
    createdAt: SystemFields.createdAt.optional(),
    updatedAt: SystemFields.updatedAt.optional(),
});
export type TicketInput = z.infer<typeof TicketInputSchema>;

// Entity Schema
export const TicketSchema = z.object({
    ...TicketBase,
    ...SystemFields
});

const generatedSchema = zodToJsonSchema(TicketInputSchema as any, 'ticketSchema');
export const ticketJsonSchema = (generatedSchema as any).definitions.ticketSchema;

export const ticketUiSchema = {
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
                { type: 'Control', scope: '#/properties/createdByUserName' }
            ]
        },
        {
            type: 'Control',
            scope: '#/properties/title'
        },

        {
            type: 'Control',
            scope: '#/properties/description',
            options: { multi: true }
        },
        {
            type: 'Control',
            scope: '#/properties/comments',
            options: { readonly: true }
        }
    ]
};
