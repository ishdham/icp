import { db } from '../src/config/firebase';

const partners = [
    {
        organizationName: "Green Earth NGO",
        entityType: "NGO",
        status: "APPROVED",
        websiteUrl: "https://greenearth.org",
        contact: { email: "contact@greenearth.org", phone: "+1234567890" },
        address: { city: "New York", country: "USA" },
        createdAt: new Date().toISOString(),
        proposedByUserId: "USER-101"
    },
    {
        organizationName: "Tech for Good",
        entityType: "Social Impact Entity",
        status: "PROPOSED",
        websiteUrl: "https://techforgood.io",
        createdAt: new Date().toISOString(),
        proposedByUserId: "USER-102"
    }
];

const solutions = [
    {
        name: "Clean Water Initiative",
        description: "Providing clean water to rural areas using solar filtration.",
        domain: "Water",
        status: "APPROVED",
        uniqueValueProposition: "Low cost, high efficiency.",
        providerId: "USER-101",
        createdAt: new Date().toISOString()
    },
    {
        name: "Rural Solar Power",
        description: "Micro-grids for remote villages.",
        domain: "Energy",
        status: "DRAFT",
        uniqueValueProposition: "Decentralized power generation.",
        providerId: "USER-105",
        createdAt: new Date().toISOString()
    }
];

const tickets = [
    {
        title: "Login Issue",
        description: "Cannot reset password.",
        type: "PROBLEM_SUBMISSION",
        status: "NEW",
        createdByUserId: "USER-101",
        ticketId: `TKT-${Date.now()}`,
        createdAt: new Date().toISOString(),
        comments: []
    },
    {
        title: "Partner Approval Request",
        description: "Please approve Tech for Good.",
        type: "PARTNER_CONNECT",
        status: "PENDING",
        createdByUserId: "USER-102",
        ticketId: `TKT-${Date.now() + 1}`,
        createdAt: new Date().toISOString(),
        comments: []
    }
];

async function seedAll() {
    try {
        console.log("Seeding Partners...");
        for (const p of partners) {
            await db.collection('partners').add(p);
        }

        console.log("Seeding Solutions...");
        for (const s of solutions) {
            await db.collection('solutions').add(s);
        }

        console.log("Seeding Tickets...");
        for (const t of tickets) {
            await db.collection('tickets').add(t);
        }

        console.log("All collections seeded successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
}

seedAll();
