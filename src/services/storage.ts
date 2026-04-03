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
import { Shift, FuelRecord } from '../types';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { updateDoc } from 'firebase/firestore';

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

const getShiftCollectionPath = () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Usuário não autenticado');
  return `users/${userId}/turnos`;
};

export const subscribeToActiveShift = (onUpdate: (shift: Shift | null) => void) => {
  const path = getShiftCollectionPath();
  // Query only by status to avoid composite index with timestamp
  const q = query(
    collection(db, path),
    where('status', '==', 'Aberto')
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      onUpdate(null);
    } else {
      // Sort in memory to get the latest one
      const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Shift));
      docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(docs[0]);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const startShift = async (shift: Omit<Shift, 'id' | 'status' | 'timestamp' | 'userId' | 'remainingLiters'>) => {
  const path = getShiftCollectionPath();
  try {
    const newShift: Omit<Shift, 'id'> = {
      ...shift,
      status: 'Aberto',
      remainingLiters: shift.initialLiters,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser?.uid || ''
    };
    await addDoc(collection(db, path), newShift);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const closeShift = async (shiftId: string) => {
  const path = getShiftCollectionPath();
  try {
    await updateDoc(doc(db, path, shiftId), { status: 'Fechado' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${shiftId}`);
  }
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

export const subscribeToRecordsByDate = (date: Date, onUpdate: (records: FuelRecord[]) => void) => {
  const path = getCollectionPath();
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();
  
  const q = query(
    collection(db, path),
    where('timestamp', '>=', start),
    where('timestamp', '<=', end),
    orderBy('timestamp', 'desc')
  );
  
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
  // Query only by plate to avoid composite index with timestamp
  const q = query(
    collection(db, path), 
    where('plate', '==', plate.toUpperCase())
  );
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const docs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FuelRecord));
    // Sort in memory
    docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return docs[0];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getMorningRecordForPlateOnDay = async (plate: string, date: Date): Promise<FuelRecord | null> => {
  const path = getCollectionPath();
  const start = startOfDay(date).toISOString();
  const end = endOfDay(date).toISOString();
  
  // Query by plate and timestamp range, filter shift in memory
  const q = query(
    collection(db, path),
    where('plate', '==', plate.toUpperCase()),
    where('timestamp', '>=', start),
    where('timestamp', '<=', end)
  );
  
  try {
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const records = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FuelRecord[];
    const morningRecord = records.find(r => r.shift === 'Manhã');
    return morningRecord || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const getWeeklyRecordsForPlate = async (plate: string): Promise<FuelRecord[]> => {
  const path = getCollectionPath();
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  
  // Query only by plate to avoid composite index with timestamp
  const q = query(
    collection(db, path),
    where('plate', '==', plate.toUpperCase())
  );
  
  try {
    const snapshot = await getDocs(q);
    const records = snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as FuelRecord))
      .filter(r => r.timestamp >= sevenDaysAgo);
    
    return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const getRecordsForCurrentWeek = async (): Promise<FuelRecord[]> => {
  const path = getCollectionPath();
  // Monday to Saturday
  const now = new Date();
  const start = startOfDay(startOfWeek(now, { weekStartsOn: 1 })); // Monday 00:00
  const end = endOfDay(addDays(start, 5)); // Saturday 23:59
  
  const q = query(
    collection(db, path),
    where('timestamp', '>=', start.toISOString()),
    where('timestamp', '<=', end.toISOString()),
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

export const saveRecord = async (record: Omit<FuelRecord, 'id'>, activeShift: Shift) => {
  const path = getCollectionPath();
  const shiftPath = getShiftCollectionPath();
  try {
    // 1. Calculate consumption if possible
    let consumption: number | undefined;
    const lastRecord = await getLastRecordForPlate(record.plate);
    
    if (lastRecord && record.truckKm > lastRecord.truckKm) {
      const kmDiff = record.truckKm - lastRecord.truckKm;
      consumption = kmDiff / record.liters;
    }

    const dataToSave = {
      ...record,
      consumption,
      userId: auth.currentUser?.uid
    };

    // 2. Save the fuel record
    await addDoc(collection(db, path), dataToSave);

    // 3. Update remaining liters in the shift
    const newRemaining = activeShift.remainingLiters - record.liters;
    await updateDoc(doc(db, shiftPath, activeShift.id), {
      remainingLiters: newRemaining
    });
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
