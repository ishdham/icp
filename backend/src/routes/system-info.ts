import { Router } from 'express';
import buildInfo from '../build-info.json';

const router = Router();

router.get('/', (req, res) => {
    res.json(buildInfo);
});

export default router;
