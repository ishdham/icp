import { Router, Response, Request } from 'express';
import { userJsonSchema, userUiSchema } from '../schemas/users';
import { partnerJsonSchema, partnerUiSchema } from '../schemas/partners';
import { solutionJsonSchema, solutionUiSchema } from '../schemas/solutions';
import { ticketJsonSchema, ticketUiSchema } from '../schemas/tickets';

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
