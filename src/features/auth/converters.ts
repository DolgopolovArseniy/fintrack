import type { FirestoreDataConverter } from 'firebase/firestore';
import { createConverter } from '@/lib/firestore/createConverter';
import { userProfileSchema, type UserProfile } from './schemas';

export const userProfileConverter: FirestoreDataConverter<UserProfile> =
  createConverter(userProfileSchema);
