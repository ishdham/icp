import * as functions from 'firebase-functions';
import app from './app';
import { aiService } from './services/ai.service';

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

export const api = functions.https.onRequest(app);
