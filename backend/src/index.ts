import app from './app';
import { aiService } from './services/ai.service';

const PORT = process.env.PORT || 3000;

// Initialize AI Service (Vector Store)
aiService.initialize().catch(err => console.error('AI Service initialization failed:', err));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
