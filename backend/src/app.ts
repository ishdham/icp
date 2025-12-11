import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import solutionRoutes from './routes/solutions';
import partnerRoutes from './routes/partners';
import userRoutes from './routes/users';
import ticketRoutes from './routes/tickets';
import aiRoutes from './routes/ai';
import schemasRouter from './routes/schemas';
import authRouter from './routes/auth';
import commonRoutes from './routes/common';
import uploadRoutes from './routes/upload';
import statsRoutes from './routes/stats';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ... other imports ...

app.use('/v1/solutions', solutionRoutes);
app.use('/v1/partners', partnerRoutes);
app.use('/v1/users', userRoutes);
app.use('/v1/tickets', ticketRoutes);
app.use('/v1/ai', aiRoutes);
app.use('/v1/schemas', schemasRouter);
app.use('/v1/common', commonRoutes);
app.use('/v1/common', uploadRoutes); // Mounts /v1/common/upload
app.use('/v1/auth', authRouter);
app.use('/v1/stats', statsRoutes);

app.get('/', (req, res) => {
    res.send('ICP Backend is running!');
});

// Export db from config to maintain consistency or remove if not needed here
// But existing code might import db from app.
// Better to re-export or change validation.
import { db } from './config/firebase';
export { db };

export default app;
