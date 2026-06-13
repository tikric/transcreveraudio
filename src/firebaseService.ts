/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Transcript } from './types';

const TRAN_COLLECTION = 'transcripts';

/**
 * Saves a transcript document to Firestore for an authenticated user.
 */
export async function saveTranscriptToFirestore(transcript: Transcript, ownerId: string): Promise<void> {
  const path = `${TRAN_COLLECTION}/${transcript.id}`;
  try {
    const docRef = doc(db, TRAN_COLLECTION, transcript.id);
    const docData = {
      ...transcript,
      ownerId,
      isPublic: transcript.isPublic ?? false,
    };
    await setDoc(docRef, docData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Fetches all transcripts belonging to a specific user and sorts them client-side to prevent database index errors.
 */
export async function getTranscriptsFromFirestore(ownerId: string): Promise<Transcript[]> {
  const path = TRAN_COLLECTION;
  try {
    const q = query(collection(db, TRAN_COLLECTION), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
    const results: Transcript[] = [];
    
    snapshot.forEach((snapDoc) => {
      const data = snapDoc.data();
      results.push({
        ...data,
        id: snapDoc.id,
      } as Transcript);
    });

    // Sort client-side descending by createdAt ISO string to guarantee zero indexed-query runtime exceptions
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Updates an existing transcript document's data in Firestore.
 */
export async function updateTranscriptInFirestore(transcriptId: string, updatedData: Partial<Transcript>): Promise<void> {
  const path = `${TRAN_COLLECTION}/${transcriptId}`;
  try {
    const docRef = doc(db, TRAN_COLLECTION, transcriptId);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Deletes a transcript document from Firestore.
 */
export async function deleteTranscriptFromFirestore(transcriptId: string): Promise<void> {
  const path = `${TRAN_COLLECTION}/${transcriptId}`;
  try {
    const docRef = doc(db, TRAN_COLLECTION, transcriptId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Fetches a single public transcript from Firestore using getDoc (even for unauthenticated users).
 */
export async function getPublicTranscriptFromFirestore(transcriptId: string): Promise<Transcript | null> {
  const path = `${TRAN_COLLECTION}/${transcriptId}`;
  try {
    const docRef = doc(db, TRAN_COLLECTION, transcriptId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    const data = snap.data();
    // Enforce public check as supplementary layer
    if (data.isPublic !== true) {
      throw new Error("Missing or insufficient permissions.");
    }
    return {
      ...data,
      id: snap.id,
    } as Transcript;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}
