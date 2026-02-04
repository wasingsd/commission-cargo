// src/lib/firebase.ts
// Firebase Admin SDK initialization

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

let app: App;
let db: Firestore;

function getFirebaseApp(): App {
    if (getApps().length === 0) {
        // Try to load from service account file first (more robust on Windows)
        const serviceAccountPath = path.join(process.cwd(), 'commission-cargo-firebase-adminsdk-fbsvc-5d1acb3134.json');

        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            app = initializeApp({
                credential: cert(serviceAccount),
            });
        } else {
            // Fallback to environment variables
            const sanitize = (val: string | undefined, name: string) => {
                if (!val) return '';
                let s = val.trim();
                // Remove wrapping quotes
                if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                    s = s.substring(1, s.length - 1);
                }
                // Handle escaped newlines in private key
                if (name === 'PK') {
                    s = s.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
                    // Aggressively remove non-ASCII (including char 184)
                    s = s.replace(/[^\x00-\x7F]/g, '');

                    // If it lacks headers but is long, it might be raw base64
                    if (s.length > 500 && !s.includes('-----BEGIN PRIVATE KEY-----')) {
                        s = `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----\n`;
                    }
                } else {
                    // For other fields, just remove everything but basic safe chars
                    s = s.replace(/[^\x20-\x7E]/g, '');
                }
                return s.trim();
            };

            const projectId = sanitize(process.env.FIREBASE_PROJECT_ID, 'ID');
            const clientEmail = sanitize(process.env.FIREBASE_CLIENT_EMAIL, 'EMAIL');
            const privateKey = sanitize(process.env.FIREBASE_PRIVATE_KEY, 'PK');

            if (!projectId || !clientEmail || !privateKey) {
                const missing = [];
                if (!projectId) missing.push('PROJECT_ID');
                if (!clientEmail) missing.push('CLIENT_EMAIL');
                if (!privateKey) missing.push('PRIVATE_KEY');
                throw new Error(`Missing Firebase Config: ${missing.join(', ')}`);
            }

            try {
                app = initializeApp({
                    credential: cert({
                        projectId,
                        clientEmail,
                        privateKey,
                    }),
                });
            } catch (initErr: any) {
                console.error('Firebase InitializeApp Error:', initErr);
                throw new Error(`Firebase Cert Error: ${initErr.message}. PK_LEN: ${privateKey.length}`);
            }
        }
    } else {
        app = getApps()[0];
    }
    return app;
}

export function getDb(): Firestore {
    try {
        if (!db) {
            getFirebaseApp();
            db = getFirestore();
            // Prevent "Cannot use undefined as a Firestore value" errors
            db.settings({ ignoreUndefinedProperties: true });
        }
        return db;
    } catch (e: any) {
        console.error('Firestore getDb Error:', e);
        throw new Error(`Firestore Init Failed: ${e.message}`);
    }
}

// Collection names as constants
export const Collections = {
    USERS: 'users',
    SALESPERSONS: 'salespersons',
    CUSTOMERS: 'customers',
    RATE_CARDS: 'rateCards',
    SHIPMENTS: 'shipments',
    AUDIT_LOGS: 'auditLogs',
} as const;

export { app, db };
