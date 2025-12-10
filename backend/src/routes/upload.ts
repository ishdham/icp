import { Router, Response, Request } from 'express';
import multer from 'multer';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /common/upload
router.post('/upload', authenticate as any, upload.single('file'), async (req: any, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const bucket = admin.storage().bucket();
        const filename = `${uuidv4()}-${req.file.originalname}`;
        const file = bucket.file(`uploads/${filename}`);

        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
            },
            resumable: false
        });

        stream.on('error', (err) => {
            console.error('Upload error:', err);
            res.status(500).json({ error: 'Failed to upload file' });
        });

        stream.on('finish', async () => {
            // Make public
            try {
                await file.makePublic();
                const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
                res.json({ url: publicUrl, filename: req.file.originalname });
            } catch (error) {
                console.error('Error making file public:', error);
                // Fallback or error? If makePublic fails, user can't read it easily without signed URL. 
                // Assuming standard rules allow read. But explicit public link is better for public bucket logic.
                res.status(500).json({ error: 'Failed to set public access' });
            }
        });

        stream.end(req.file.buffer);

    } catch (error) {
        console.error('Upload handler error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
