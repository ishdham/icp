import { db } from '../src/config/firebase';

async function migrateSolutions() {
    try {
        console.log('Starting Solution Migration...');
        const solutionsRef = db.collection('solutions');
        const snapshot = await solutionsRef.get();

        if (snapshot.empty) {
            console.log('No solutions found.');
            process.exit(0);
        }

        console.log(`Found ${snapshot.size} solutions to migrate.`);

        let updatedCount = 0;
        const batchSize = 500;
        let batch = db.batch();
        let operationCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const updates: any = {};
            let hasUpdates = false;

            // 1. Rename description -> detail
            if (data.description && !data.detail) {
                updates.detail = data.description;
                // Optional: updates.description = admin.firestore.FieldValue.delete(); 
                // We keep description for now to be safe, or we can delete it. 
                // The implementation plan said "safe to just copy".
                hasUpdates = true;
            }

            // 2. Rename uniqueValueProposition -> benefit
            if (data.uniqueValueProposition && !data.benefit) {
                updates.benefit = data.uniqueValueProposition;
                hasUpdates = true;
            }

            // 3. Populate summary
            if (!data.summary && (updates.detail || data.detail)) {
                // Use detail (or the new detail value) to create a summary
                const detailText = (updates.detail || data.detail) as string;
                updates.summary = detailText.length > 150
                    ? detailText.substring(0, 147) + '...'
                    : detailText;
                hasUpdates = true;
            }

            // 4. Initialize other fields if needed (optional)
            if (!data.targetBeneficiaries) {
                // Don't overwrite if it exists
                // updates.targetBeneficiaries = [];
            }

            // 5. Ensure status is robust
            if (!data.status) {
                updates.status = 'PROPOSED';
                hasUpdates = true;
            }

            if (hasUpdates) {
                batch.update(doc.ref, updates);
                operationCount++;
                updatedCount++;
            }

            if (operationCount >= batchSize) {
                await batch.commit();
                batch = db.batch();
                operationCount = 0;
                console.log(`Committed batch of updates...`);
            }
        }

        if (operationCount > 0) {
            await batch.commit();
            console.log(`Committed final batch.`);
        }

        console.log(`Migration completed. Updated ${updatedCount} solutions.`);
        process.exit(0);

    } catch (error) {
        console.error('Error migrating solutions:', error);
        process.exit(1);
    }
}

migrateSolutions();
