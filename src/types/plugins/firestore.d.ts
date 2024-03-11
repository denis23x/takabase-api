/** @format */

import { Firestore } from 'firebase-admin/firestore';
import { DocumentReference } from 'firebase-admin/lib/firestore';

declare module 'fastify' {
  interface FastifyInstance {
    firestore: {
      getFirestore: () => Firestore;
      getDocReference: (documentPath: string) => DocumentReference;
    };
  }
}

export {};
