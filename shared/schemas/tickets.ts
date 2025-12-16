import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export const TicketSchema = z.object({
    id: z.string().describe('ID').readonly().optional(),
    createdByUserId: z.string().describe('Creator ID').readonly().optional(),
    createdByUserName: z.string().describe('Created By').readonly().optional(),
    createdAt: z.string().describe('Created At').readonly().optional(),
    updatedAt: z.string().describe('Updated At').readonly().optional(),
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
});

const generatedSchema = zodToJsonSchema(TicketSchema as any, 'ticketSchema');
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
