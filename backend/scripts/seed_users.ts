import { db, auth } from '../src/config/firebase';

const csvData = `uid,firstName,lastName,email,phone_countryCode,phone_number,role,discoverySource,organizationId,createdAt,password
USER-101,Aarav,Patel,aarav.p@example.com,+91,9876543210,REGULAR,Social Media,,2024-01-15T10:00:00Z,
USER-102,Sita,Sharma,sita.s@partner-ngo.org,+91,9123456780,REGULAR,Conference,PARTNER-501,2024-02-20T14:30:00Z,
USER-ADMIN-01,Vikram,Malhotra,admin@wheels-foundation.org,+91,9988776655,ADMIN,Internal,,2023-11-01T09:00:00Z,
USER-SUP-01,Ratnasri,Maddala,support@icp-platform.org,+91,9811223344,ICP_SUPPORT,Internal,,2023-12-23T09:00:00Z,
USER-105,John,Doe,john.doe@innovate-corp.com,+1,4155550199,REGULAR,Web Search,PARTNER-502,2024-03-10T11:15:00Z,
USER-ADMIN-TEST,Test,Admin,admin0@icp.test,+91,9000000001,ADMIN,Test,,2024-01-01T00:00:00Z,admin0
USER-SUP-TEST,Test,Support,icp_support0@icp.test,+91,9000000002,ICP_SUPPORT,Test,,2024-01-01T00:00:00Z,icp_support0
USER-REG-TEST,Test,Regular,regular0@icp.test,+91,9000000003,REGULAR,Test,,2024-01-01T00:00:00Z,regular0`;

async function seedUsers() {
    try {
        const lines = csvData.trim().split('\n');
        // Skipping header verification for simplicity, assuming fixed format

        console.log(`Found ${lines.length - 1} users to seed...`);

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const user: any = {};
            const password = values[10];

            // Basic mapping
            user.uid = values[0];
            user.firstName = values[1];
            user.lastName = values[2];
            user.email = values[3];

            // Phone object
            user.phone = {
                countryCode: values[4],
                number: values[5]
            };

            user.role = values[6];
            user.discoverySource = values[7];

            if (values[8]) {
                user.organizationId = values[8];
            }

            user.createdAt = values[9];
            user.associatedPartners = [];

            // Map legacy organizationId to associatedPartners
            if (user.organizationId) {
                user.associatedPartners.push({
                    partnerId: user.organizationId,
                    status: 'APPROVED',
                    requestedAt: user.createdAt,
                    approvedAt: user.createdAt
                });
            }

            user.bookmarks = []; // Default empty bookmarks

            // 1. Create in Firebase Auth if password is provided
            if (password) {
                try {
                    await auth.getUserByEmail(user.email);
                    console.log(`User ${user.email} already exists in Auth.`);
                    // Ideally we might want to update the password or UID here if needed,
                    // but for seeding let's assume existence is enough or we rely on pre-cleaned env.
                    // If we want to ensure UID matches CSV, we'd need to check that too.
                    const existingUser = await auth.getUserByEmail(user.email);
                    if (existingUser.uid !== user.uid) {
                        console.warn(`WARNING: Auth UID (${existingUser.uid}) does not match Seed UID (${user.uid}) for ${user.email}`);
                        // Optionally force update or just proceed with Firestore using the CSV UID (which might cause mismatch issues)
                    }
                } catch (e: any) {
                    if (e.code === 'auth/user-not-found') {
                        console.log(`Creating user in Auth: ${user.email}`);
                        await auth.createUser({
                            uid: user.uid,
                            email: user.email,
                            password: password,
                            displayName: `${user.firstName} ${user.lastName}`,
                            emailVerified: true
                        });
                        console.log(`Setting custom claims for ${user.email} with role ${user.role}`);
                        await auth.setCustomUserClaims(user.uid, { role: user.role });
                    } else {
                        throw e;
                    }
                }
            }

            // Ensure claims are set even if user already exists (important for fixing existing users)
            if (password) {
                try {
                    // We might have already set it above if new, but setting it again is safe/idempotent
                    // optimize: checking if claims are already set would be better but this is a seed script
                    console.log(`Ensuring custom claims for ${user.email} with role ${user.role}`);
                    await auth.setCustomUserClaims(user.uid, { role: user.role });
                } catch (e) {
                    console.error(`Failed to set claims for ${user.email}:`, e);
                }
            }

            // 2. Create/Update in Firestore
            console.log(`Seeding user in Firestore: ${user.uid} (${user.email})`);
            await db.collection('users').doc(user.uid).set(user);
        }

        console.log('User seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
}

seedUsers();
