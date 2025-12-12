
import { db } from '../src/config/firebase';
import { translationService } from '../src/services/translation.service';

// Mock Config
const API_URL = 'http://localhost:3000/v1';

async function runTest() {
    console.log('--- Starting List View I18n Lazy Translation Test ---');

    // 1. Create a dummy solution (direct DB)
    const solutionRef = await db.collection('solutions').add({
        name: 'Test Solution for List View I18n',
        summary: 'This is a summary in English for the listener.',
        status: 'MATURE',
        domain: 'Water',
        createdAt: new Date().toISOString()
    });
    const solutionId = solutionRef.id;
    console.log(`Created test solution: ${solutionId}`);

    try {
        // 2. Clear any existing translations
        await solutionRef.update({ translations: {} });

        // 3. Call GET /solutions with ?lang=hi
        console.log('Requesting List translation (GET /solutions?lang=hi)...');

        try {
            const response = await fetch(`${API_URL}/solutions?lang=hi`);
            const data: any = await response.json();

            // Find our item
            const item = data.items.find((s: any) => s.id === solutionId);

            if (item) {
                console.log('Found item in list.');
                if (item.summary !== 'This is a summary in English for the listener.') {
                    console.log('SUCCESS: List item content appears translated!');
                    console.log('Original: This is a summary in English for the listener.');
                    console.log('Translated:', item.summary);
                } else {
                    console.error('FAILURE: List item content is NOT translated.');
                    console.log('Received:', item.summary);
                }
            } else {
                console.error('FAILURE: Test item not found in list (check pagination/limit).');
            }

            // 4. Check DB for persistence
            // Wait a small bit since ensureTranslation might await the save but async behavior in test
            // Actually, my implementation awaits the save inside ensureTranslation before returning.
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

runTest();
