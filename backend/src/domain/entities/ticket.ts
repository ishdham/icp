import { z } from 'zod';
import { TicketSchema } from '@shared/schemas/tickets';

export type Ticket = z.infer<typeof TicketSchema>;
