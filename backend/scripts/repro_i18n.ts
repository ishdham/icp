
import axios from 'axios';
import { db } from '../src/config/firebase';
import { translationService } from '../src/services/translation.service';

// Mock Config
const API_URL = 'http://localhost:3000/v1';

async function runTest() {
    console.log('--- Starting I18n Repro Test ---');

    // 1. Create a dummy solution (direct DB)
    const solutionRef = await db.collection('solutions').add({
        name: 'Test Solution for I18n',
        summary: 'This is a summary in English.',
        detail: 'Detailed description of the solution in English.',
        status: 'MATURE',
        domain: 'Water',
        createdAt: new Date().toISOString()
    });
    const solutionId = solutionRef.id;
    console.log(`Created test solution: ${solutionId}`);

    try {
        // 2. Clear any existing translations (just in case)
        await solutionRef.update({ translations: {} });

        // 3. Call GET with ?lang=hi
        console.log('Requesting translation (GET /solutions/:id?lang=hi)...');
        // We can't easily auth via script without a token, but let's assume public/optional auth works or mocked.
        // Wait, GET /solutions/:id is NOT protected in the router (no 'authenticate' middleware on the final route? Let's check).
        // router.get('/:id', ...) has no middleware in definition! So it is public.

        try {
            // We use fetch since axios might not be configured in this script context with baseURL
            const response = await fetch(`${API_URL}/solutions/${solutionId}?lang=hi`);
            const data = await response.json();

            console.log('Response Status:', response.status);
            // console.log('Response Data:', JSON.stringify(data, null, 2));

            if (data.summary && data.summary !== 'This is a summary in English.') {
                console.log('SUCCESS: content appears translated!');
                console.log('Original:', 'This is a summary in English.');
                console.log('Translated:', data.summary);
            } else {
                console.error('FAILURE: Content is NOT translated.');
                console.log('Received:', data.summary);
            }

            // 4. Check DB for persistence
            const updatedDoc = await solutionRef.get();
            const translations = updatedDoc.data()?.translations;
            if (translations && translations.hi) {
                console.log('DB SUCCESS: Translation persisted in DB.');
            } else {
                console.error('DB FAILURE: Translation NOT saved to DB.');
            }

        } catch (e) {
            console.error('Fetch error:', e);
        }

    } catch (err) {
        console.error('Test script error:', err);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        await solutionRef.delete();
        process.exit();
    }
}

// Check if we can run this. API must be running.
runTest();
