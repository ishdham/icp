import { z } from 'zod';
import { SolutionSchema } from '@shared/schemas/solutions';

export type Solution = z.infer<typeof SolutionSchema>;
