import { collection, query, orderBy, limit, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Retrieves paginated compliance scans for the Admin Dashboard.
 * Secures read paths with a strict `limit(20)` to optimize Firestore read costs.
 * 
 * @param {QueryDocumentSnapshot<DocumentData>} [lastVisibleDoc] - The last document snapshot from the previous query used for cursor-based pagination. Optional on the first request.
 * @returns {Promise<{ scans: DocumentData[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }>} An object containing the fetched scan data and the reference to the last document for subsequent queries.
 * @throws {Error} Throws if the network request fails or times out.
 */
export async function fetchPaginatedScans(
    lastVisibleDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ scans: DocumentData[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
        const scansRef = collection(db, 'compliance_scans');

        // Base query sorting by creation date in descending order, strictly limited to 20 documents.
        let q = query(scansRef, orderBy('createdAt', 'desc'), limit(20));

        // Append pagination cursor if provided
        if (lastVisibleDoc) {
            q = query(scansRef, orderBy('createdAt', 'desc'), startAfter(lastVisibleDoc), limit(20));
        }

        const snapshot = await getDocs(q);

        // Extract document data and ID
        const scans = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Identify the last document in the current batch to be used as cursor for the next page
        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { scans, lastDoc };
    } catch (error: any) {
        if (error?.code === 'deadline-exceeded' || error?.message?.includes('network')) {
            throw new Error('Network timeout fetching paginated scans.');
        }
        throw new Error(`Failed to fetch paginated scans: ${error.message}`);
    }
}

import { AuditDocument } from './validations/audit';
import { addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Saves a new AI Compliance Audit submission securely to Firestore.
 * 
 * @param {Omit<AuditDocument, 'timestamp'>} auditData - The validated audit document body, omitting the timestamp as Firestore handles it.
 * @returns {Promise<string>} The newly generated Firestore Document ID.
 * @throws {Error} Throws if the network request fails or times out.
 */
export async function saveAudit(auditData: Omit<AuditDocument, 'timestamp'>): Promise<string> {
    try {
        const auditsRef = collection(db, 'audits');
        const docRef = await addDoc(auditsRef, {
            ...auditData,
            timestamp: serverTimestamp()
        });
        return docRef.id;
    } catch (error: any) {
        throw new Error(`Failed to save audit: ${error.message}`);
    }
}

/**
 * Retrieves paginated AI Compliance Audits for the Admin Dashboard.
 * Secures read paths with a strict `limit(20)` to optimize Firestore read costs.
 * 
 * @param {QueryDocumentSnapshot<DocumentData>} [lastVisibleDoc] - The last document snapshot from the previous query.
 * @returns {Promise<{ audits: AuditDocument[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }>} 
 * @throws {Error} Throws if the network request fails or times out.
 */
export async function fetchPaginatedAudits(
    lastVisibleDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ audits: AuditDocument[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
        const auditsRef = collection(db, 'audits');

        let q = query(auditsRef, orderBy('timestamp', 'desc'), limit(20));

        if (lastVisibleDoc) {
            q = query(auditsRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleDoc), limit(20));
        }

        const snapshot = await getDocs(q);

        const audits = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as unknown as AuditDocument[];

        const lastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { audits, lastDoc };
    } catch (error: any) {
        if (error?.code === 'deadline-exceeded' || error?.message?.includes('network')) {
            throw new Error('Network timeout fetching paginated audits.');
        }
        throw new Error(`Failed to fetch paginated audits: ${error.message}`);
    }
}
