import { onRequest } from 'firebase-functions/v2/https';
import app from './app';
import { aiService } from './container';

const PORT = process.env.PORT || 3000;

// Initialize AI Service (Vector Store)
// Note: In Cloud Functions, this might need to be lazy-loaded or handled differently 
// if initialization takes too long, but for now we keep it top-level.
aiService.initialize().catch(err => console.error('AI Service initialization failed:', err));

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

export const api = onRequest({ cors: true, invoker: 'public' }, app);
