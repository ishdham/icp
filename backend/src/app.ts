import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import solutionsRouter from './routes/solutions';
import ticketsRouter from './routes/tickets';
import partnersRouter from './routes/partners';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import aiRouter from './routes/ai';
import schemasRouter from './routes/schemas';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/v1/solutions', solutionsRouter);
app.use('/v1/tickets', ticketsRouter);
app.use('/v1/partners', partnersRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/ai', aiRouter);
app.use('/v1/schemas', schemasRouter);

app.get('/', (req, res) => {
    res.send('ICP Backend is running!');
});

export default app;
