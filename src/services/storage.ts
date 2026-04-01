import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer,
  limit,
  where,
  getDocs,
  startAt,
  endAt
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FuelRecord } from '../types';
import { startOfDay, endOfDay, subDays } from 'date-fns';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const getCollectionPath = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Usuário não autenticado');
  return `users/${userId}/abastecimentos`;
};

export const subscribeToRecords = (onUpdate: (records: FuelRecord[]) => void, limitCount?: number) => {
  const path = getCollectionPath();
  let q = query(collection(db, path), orderBy('timestamp', 'desc'));
  
  if (limitCount) {
    q = query(q, limit(limitCount));
  }
  
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    })) as FuelRecord[];
    onUpdate(records);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getLastRecordForPlate = async (plate: string): Promise<FuelRecord | null> => {
  const path = getCollectionPath();
  const q = query(
    collection(db, path), 
    where('plate', '==', plate.toUpperCase()), 
    orderBy('timestamp', 'desc'), 
    limit(1)
  );
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as FuelRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getMorningRecordForPlateOnDay = async (plate: string, date: Date): Promise<FuelRecord | null> => {
  const path = getCollectionPath();
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();
  
  const q = query(
    collection(db, path),
    where('plate', '==', plate.toUpperCase()),
    where('shift', '==', 'Manhã'),
    where('timestamp', '>=', start),
    where('timestamp', '<=', end),
    limit(1)
  );
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { ...snapshot.docs[0].data(), id: snapshot.docs[0].id } as FuelRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getWeeklyRecordsForPlate = async (plate: string): Promise<FuelRecord[]> => {
  const path = getCollectionPath();
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  
  const q = query(
    collection(db, path),
    where('plate', '==', plate.toUpperCase()),
    where('timestamp', '>=', sevenDaysAgo),
    orderBy('timestamp', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FuelRecord[];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const saveRecord = async (record: Omit<FuelRecord, 'id'>) => {
  const path = getCollectionPath();
  try {
    const dataToSave = {
      ...record,
      userId: auth.currentUser?.uid
    };

    // Remove undefined fields to prevent Firestore errors
    const cleanData = Object.fromEntries(
      Object.entries(dataToSave).filter(([_, value]) => value !== undefined)
    );

    await addDoc(collection(db, path), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const removeRecord = async (id: string) => {
  const path = getCollectionPath();
  try {
    await deleteDoc(doc(db, path, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
};
