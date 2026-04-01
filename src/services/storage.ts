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
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { FuelRecord } from '../types';

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

export const saveRecord = async (record: Omit<FuelRecord, 'id'>) => {
  const path = getCollectionPath();
  try {
    await addDoc(collection(db, path), {
      ...record,
      userId: auth.currentUser?.uid
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
