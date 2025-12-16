import { Router, Response, Request } from 'express';
import { userJsonSchema, userUiSchema } from '@shared/schemas/users';
import { partnerJsonSchema, partnerUiSchema } from '@shared/schemas/partners';
import { solutionJsonSchema, solutionUiSchema } from '@shared/schemas/solutions';
import { ticketJsonSchema, ticketUiSchema } from '@shared/schemas/tickets';

const router = Router();

const schemas: Record<string, { schema: any, uischema: any }> = {
    user: { schema: userJsonSchema, uischema: userUiSchema },
    partner: { schema: partnerJsonSchema, uischema: partnerUiSchema },
    solution: { schema: solutionJsonSchema, uischema: solutionUiSchema },
    ticket: { schema: ticketJsonSchema, uischema: ticketUiSchema },
};

// GET /v1/schemas/:type
router.get('/:type', (req: Request, res: Response) => {
    const { type } = req.params;
    const schemaData = schemas[type];

    if (!schemaData) {
        res.status(404).json({ error: 'Schema not found' });
        return;
    }

    res.json(schemaData);
});

export default router;
