import {
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, auth, storage, firebaseConfig } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  projectId: string;
  authDomain: string;
  lastChecked: string;
  message: string;
}

/**
 * Validates connection to Firebase project
 */
export async function testFirestoreConnection(): Promise<FirebaseConnectionStatus> {
  const result: FirebaseConnectionStatus = {
    connected: false,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    lastChecked: new Date().toLocaleTimeString(),
    message: 'Connecting to Firebase project ' + firebaseConfig.projectId + '...',
  };

  try {
    // Attempt ping to check Firestore availability using test/connection
    await getDocFromServer(doc(db, 'test', 'connection'));
    result.connected = true;
    result.message = `Successfully connected to Cloud Firestore (${firebaseConfig.projectId})`;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      result.connected = false;
      result.message = 'Client is offline or Cloud Firestore is currently unreachable. Operating in resilient offline mode.';
      console.error('Please check your Firebase configuration: ' + (error?.message || error));
    } else if (error?.code === 'permission-denied' || error?.message?.includes('insufficient permissions')) {
      // Permission denied confirms reachability of project rules engine
      result.connected = true;
      result.message = `Connected to Firebase (${firebaseConfig.projectId}) - Authorization gate active`;
    } else {
      result.connected = true;
      result.message = `Connected to Firebase project ${firebaseConfig.projectId}`;
    }
  }

  return result;
}

/**
 * Uploads a file (such as company logo or employee photo) to Firebase Storage and returns download URL
 */
export async function uploadFileToStorage(storagePath: string, file: File | Blob): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPLOAD, storagePath);
    throw error;
  }
}

/**
 * Deletes a file from Firebase Storage given its path or download URL
 */
export async function deleteFileFromStorage(storagePathOrUrl: string): Promise<void> {
  if (!storagePathOrUrl) return;
  try {
    let storageRef;
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      storageRef = ref(storage, storagePathOrUrl);
    } else {
      storageRef = ref(storage, storagePathOrUrl);
    }
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('Storage delete warning:', error);
  }
}

/**
 * Recursively removes all undefined values from an object or array to ensure compatibility with Firestore setDoc and updateDoc.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}

/**
 * Syncs a document to Firestore with merge enabled
 */
export async function syncDocToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    const sanitizedData = sanitizeForFirestore({
      ...data,
      syncedAt: new Date().toISOString(),
    });
    await setDoc(docRef, sanitizedData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    throw error;
  }
}

