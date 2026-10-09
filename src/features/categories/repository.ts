import {
  deleteField,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { toAppError, type AppError } from '@/lib/errors';
import { parseSnapshotDocs } from '@/lib/firestore/createConverter';
import { categoriesCol, categoryDoc } from '@/lib/firestore/paths';
import {
  categoryInputSchema,
  categorySchema,
  type Category,
  type CategoryInput,
} from './schemas';

export type Unsubscribe = () => void;

export interface CategoryUpdateInput {
  name?: string;
  icon?: string;
  color?: Category['color'];
  archived?: boolean;
}

/**
 * Subscribes to the user's categories collection in real time.
 * Corrupt or invalid documents are safely skipped and logged without breaking the list.
 */
export function subscribeCategories(
  uid: string,
  onData: (categories: Category[]) => void,
  onError: (error: AppError) => void,
): Unsubscribe {
  try {
    const colRef = categoriesCol(uid);
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const categories = parseSnapshotDocs(snapshot, categorySchema);
        onData(categories);
      },
      (error) => {
        onError(toAppError(error));
      },
    );
    return unsubscribe;
  } catch (error) {
    onError(toAppError(error));
    return () => {};
  }
}

/**
 * Creates a new user category.
 * Returns the generated category document ID.
 */
export async function createCategory(
  uid: string,
  input: CategoryInput,
): Promise<string> {
  try {
    const validated = categoryInputSchema.parse(input);
    const colRef = categoriesCol(uid);
    const newDocRef = doc(colRef);

    const data: Record<string, unknown> = {
      type: validated.type,
      icon: validated.icon.trim(),
      color: validated.color,
      archived: validated.archived,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (validated.name && validated.name.trim().length > 0) {
      data.name = validated.name.trim();
    }
    if (validated.systemKey && validated.systemKey.trim().length > 0) {
      data.systemKey = validated.systemKey.trim();
    }

    await setDoc(newDocRef, data);
    return newDocRef.id;
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Updates existing category fields (changing `type` is forbidden by Security Rules and API).
 */
export async function updateCategory(
  uid: string,
  categoryId: string,
  input: CategoryUpdateInput,
): Promise<void> {
  try {
    const ref = categoryDoc(uid, categoryId);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length > 0) {
        payload.name = trimmed;
      } else {
        payload.name = deleteField();
      }
    }

    if (input.icon !== undefined) {
      payload.icon = input.icon.trim();
    }

    if (input.color !== undefined) {
      payload.color = input.color;
    }

    if (input.archived !== undefined) {
      payload.archived = input.archived;
    }

    await updateDoc(ref, payload);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * Soft-deletes a category by setting `archived: true`.
 */
export async function archiveCategory(
  uid: string,
  categoryId: string,
): Promise<void> {
  return updateCategory(uid, categoryId, { archived: true });
}

/**
 * Restores an archived category by setting `archived: false`.
 */
export async function unarchiveCategory(
  uid: string,
  categoryId: string,
): Promise<void> {
  return updateCategory(uid, categoryId, { archived: false });
}
