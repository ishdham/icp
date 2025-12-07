
import { auth, db } from '../src/config/firebase';

const setAdmin = async (email: string) => {
    try {
        console.log(`Looking up user with email: ${email}...`);
        const user = await auth.getUserByEmail(email);

        console.log(`Found user ${user.uid}. Setting custom claims...`);
        await auth.setCustomUserClaims(user.uid, { role: 'ADMIN' });

        console.log(`Updating Firestore profile...`);
        const userRef = db.collection('users').doc(user.uid);

        // Check if doc exists, if not create it (shallow)
        const doc = await userRef.get();
        if (!doc.exists) {
            await userRef.set({
                uid: user.uid,
                email: user.email,
                role: 'ADMIN',
                updatedAt: new Date().toISOString()
            });
        } else {
            await userRef.update({
                role: 'ADMIN',
                updatedAt: new Date().toISOString()
            });
        }

        console.log(`Successfully made ${email} an ADMIN.`);
        process.exit(0);
    } catch (error) {
        console.error('Error setting admin:', error);
        process.exit(1);
    }
};

const email = process.argv[2];
if (!email) {
    console.error('Usage: ts-node scripts/setAdmin.ts <email>');
    process.exit(1);
}

setAdmin(email);
