import { db } from '../src/config/firebase';

const csvData = `uid,firstName,lastName,email,phone_countryCode,phone_number,role,discoverySource,organizationId,createdAt
USER-101,Aarav,Patel,aarav.p@example.com,+91,9876543210,REGULAR,Social Media,,2024-01-15T10:00:00Z
USER-102,Sita,Sharma,sita.s@partner-ngo.org,+91,9123456780,REGULAR,Conference,PARTNER-501,2024-02-20T14:30:00Z
USER-ADMIN-01,Vikram,Malhotra,admin@wheels-foundation.org,+91,9988776655,ADMIN,Internal,,2023-11-01T09:00:00Z
USER-SUP-01,Ratnasri,Maddala,support@icp-platform.org,+91,9811223344,ICP_SUPPORT,Internal,,2023-12-23T09:00:00Z
USER-105,John,Doe,john.doe@innovate-corp.com,+1,4155550199,REGULAR,Web Search,PARTNER-502,2024-03-10T11:15:00Z`;

async function seedUsers() {
    try {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split(',');

        console.log(`Found ${lines.length - 1} users to seed...`);

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const user: any = {};

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
            user.bookmarks = []; // Default empty bookmarks

            console.log(`Seeding user: ${user.uid} (${user.email})`);
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
