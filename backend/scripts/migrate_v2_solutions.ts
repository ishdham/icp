import { db } from '../src/config/firebase';
import * as admin from 'firebase-admin';

// Run with: npx ts-node scripts/migrate_v2_solutions.ts

const migrate = async () => {
    console.log('Starting migration to v2 schema...');

    // 1. Fetch all solutions
    const solutionsSnap = await db.collection('solutions').get();
    console.log(`Found ${solutionsSnap.size} solutions to migrate.`);

    let updatedCount = 0;

    for (const doc of solutionsSnap.docs) {
        const data = doc.data();
        const updates: any = {};

        // Check if already migrated? (If providedByPartnerId exists)
        if (data.providedByPartnerId || data.proposedByUserId) {
            console.log(`Skipping ${doc.id} - already migrated or new.`);
            continue;
        }

        // Mapping:
        // providerId (User) -> proposedByUserId
        if (data.providerId) {
            updates.proposedByUserId = data.providerId;
            updates.providerId = admin.firestore.FieldValue.delete();
            updates.providerName = admin.firestore.FieldValue.delete(); // We will refetch valid name
        }

        // partnerId (Partner) -> providedByPartnerId
        if (data.partnerId) {
            updates.providedByPartnerId = data.partnerId;
            updates.partnerId = admin.firestore.FieldValue.delete();
        }

        // Fetch Names
        if (updates.proposedByUserId) {
            const u = await db.collection('users').doc(updates.proposedByUserId).get();
            if (u.exists) {
                const uData = u.data();
                updates.proposedByUserName = `${uData?.firstName || ''} ${uData?.lastName || ''}`.trim();
            }
        }

        if (updates.providedByPartnerId) {
            const p = await db.collection('partners').doc(updates.providedByPartnerId).get();
            if (p.exists) {
                updates.providedByPartnerName = p.data()?.organizationName;
            }
        }

        // Ensure updatedAt
        if (!data.updatedAt) {
            updates.updatedAt = data.createdAt || new Date().toISOString();
        }

        if (Object.keys(updates).length > 0) {
            await db.collection('solutions').doc(doc.id).update(updates);
            console.log(`Updated ${doc.id}`);
            updatedCount++;
        }
    }

    console.log(`Migration complete. Updated ${updatedCount} documents.`);
    process.exit(0);
};

migrate().catch(console.error);
