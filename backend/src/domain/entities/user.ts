import { z } from 'zod';
import { UserSchema } from '@shared/schemas/users';

export type User = z.infer<typeof UserSchema>;
