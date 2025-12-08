import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Assumes GOOGLE_APPLICATION_CREDENTIALS is set
    });
}

const auth = admin.auth();
const db = admin.firestore();

// Log Project ID
console.log('Backend Firebase Config:', admin.app().options);

const createAdminUser = async () => {
    const email = 'admin@icp.com';
    const password = 'password123';

    try {
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
            console.log('User already exists:', userRecord.uid);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.log('Creating new admin user...');
                userRecord = await auth.createUser({
                    email,
                    password,
                    displayName: 'Admin User',
                    emailVerified: true,
                });
                console.log('User created:', userRecord.uid);
            } else {
                throw error;
            }
        }

        // Set custom claims
        await auth.setCustomUserClaims(userRecord.uid, { role: 'ADMIN' });
        console.log('Custom claims set for ADMIN role.');

        // Create user document in Firestore if it doesn't exist
        const userDocRef = db.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        if (!userDoc.exists) {
            await userDocRef.set({
                email: email,
                firstName: 'Admin',
                lastName: 'User',
                role: 'ADMIN',
                createdAt: new Date().toISOString()
            });
            console.log('User document created in Firestore.');
        } else {
            // Ensure role is admin in firestore too
            await userDocRef.update({ role: 'ADMIN' });
            console.log('User document updated with ADMIN role.');
        }

        console.log('Admin user setup complete.');
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
