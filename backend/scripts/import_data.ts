
import { db } from '../src/config/firebase';
import * as fs from 'fs';
import * as path from 'path';

// Robust CSV Parser that handles quoted fields and newlines
function parseCsv(content: string): Record<string, string>[] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    // Normalize line endings to \n
    const text = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                currentValue += '"';
                i++; // Skip next quote
            } else {
                // Toggle quotes
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            currentRow.push(currentValue);
            currentValue = '';
        } else if (char === '\n' && !inQuotes) {
            // End of row
            currentRow.push(currentValue);
            rows.push(currentRow);
            currentRow = [];
            currentValue = '';
        } else {
            currentValue += char;
        }
    }

    // Add last row if not empty
    if (currentValue || currentRow.length > 0) {
        currentRow.push(currentValue);
        rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    // Extract headers (first row) and trim them
    const headers = rows[0].map(h => h.trim());
    const result: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        // Skip empty rows
        if (values.length === 0 || (values.length === 1 && values[0].trim() === '')) continue;

        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            // Access value safe
            let val = values[index];
            if (val === undefined) val = '';
            row[header] = val.trim();
        });
        result.push(row);
    }

    return result;
}

async function importData() {
    try {
        console.log('Starting data import...');

        // Paths assuming script is run from backend/ directory
        const partnersPath = path.resolve(__dirname, '../../partner_9dec.csv');
        const solutionsPath = path.resolve(__dirname, '../../solutions_9dec.csv');

        console.log(`Reading partners from ${partnersPath}`);
        const partnersContent = fs.readFileSync(partnersPath, 'utf-8');
        const partnersRows = parseCsv(partnersContent);

        const partnerNameIdMap = new Map<string, string>();

        console.log(`Found ${partnersRows.length} partners. Importing...`);

        for (const row of partnersRows) {
            const name = row['Partner Name'];
            if (!name) continue;

            const partnerDoc = {
                organizationName: name,
                entityType: row['Type'] || 'NGO', // Default to NGO if missing
                websiteUrl: formatUrl(row['Website']),
                contact: {
                    email: formatEmail(row['Email Address']),
                    phone: formatPhone(row['Contact Number'])
                },
                address: {
                    city: row['City'],
                    country: row['Country']
                },
                status: 'MATURE',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Remove undefined fields
            cleanObject(partnerDoc);

            console.log(`Adding partner: ${name}`);
            const ref = await db.collection('partners').add(partnerDoc);
            partnerNameIdMap.set(name, ref.id);
        }

        console.log(`Partners imported. Map size: ${partnerNameIdMap.size}`);
        console.log(`Reading solutions from ${solutionsPath}`);

        const solutionsContent = fs.readFileSync(solutionsPath, 'utf-8');
        const solutionsRows = parseCsv(solutionsContent);

        console.log(`Found ${solutionsRows.length} solutions. Importing...`);

        for (const row of solutionsRows) {
            const pName = row['Partner'];
            const solutionName = row['Solution'];
            if (!solutionName) continue;

            let partnerId = undefined;
            let partnerName = undefined;

            if (pName) {
                if (partnerNameIdMap.has(pName)) {
                    partnerId = partnerNameIdMap.get(pName);
                    partnerName = pName;
                } else {
                    console.warn(`Warning: Partner '${pName}' not found for solution '${solutionName}'.`);
                }
            }

            const detail = row['Details'] || 'No details provided.';
            // Handle potentially empty detail or summary logic
            const summaryLen = 200;
            const summary = detail.length > summaryLen ? detail.substring(0, summaryLen - 3) + '...' : detail;

            const solutionDoc = {
                name: solutionName,
                summary: summary,
                detail: detail,
                domain: 'Education', // Defaulting as discussed
                verticalDomain: undefined,
                benefit: row['Unique Value Proposition'] || 'N/A',
                costAndEffort: row['Key Costs'] || 'N/A',
                returnOnInvestment: row['Expected Social Impact'] || 'N/A',
                launchYear: parseInt(row['Launch Year']) || undefined,
                targetBeneficiaries: row['Target Beneficiaries'] ? [row['Target Beneficiaries']] : [],
                status: 'MATURE',
                providedByPartnerId: partnerId,
                providedByPartnerName: partnerName,
                references: row['Website'] ? [formatUrl(row['Website'])].filter(Boolean) as string[] : [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Clean object
            cleanObject(solutionDoc);

            console.log(`Adding solution: ${solutionName}`);
            await db.collection('solutions').add(solutionDoc);
        }

        console.log('Import completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
}

function formatUrl(url: string): string | undefined {
    if (!url || url === '-' || url.toLowerCase().includes('tbd')) return undefined;
    if (!url.startsWith('http')) return `https://${url}`;
    return url;
}

function formatEmail(email: string): string | undefined {
    if (!email || email === '-' || email.toLowerCase().includes('tbd')) return undefined;
    return email;
}

function formatPhone(phone: string): string | undefined {
    if (!phone || phone === '-' || phone.toLowerCase().includes('tbd')) return undefined;
    return phone;
}

function cleanObject(obj: any) {
    Object.keys(obj).forEach(key => {
        if (obj[key] === undefined) {
            delete obj[key];
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            cleanObject(obj[key]);
            if (Object.keys(obj[key]).length === 0) {
                if (!Array.isArray(obj[key])) {
                    delete obj[key];
                }
            }
        }
    });
}

importData();
