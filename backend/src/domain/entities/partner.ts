import { z } from 'zod';
import { PartnerSchema } from '@shared/schemas/partners';

export type Partner = z.infer<typeof PartnerSchema>;
