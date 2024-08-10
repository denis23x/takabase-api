/** @format */

import fp from 'fastify-plugin';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';

const firestorePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  const firestore: Firestore = getFirestore(fastifyInstance.firebase());

  fastifyInstance.decorate('firestore', firestore);

  fastifyInstance.decorate('firestorePlugin', {
    addDocument: (collectionPath: string, documentData: any): Promise<DocumentReference> => {
      return fastifyInstance.firestore.collection(collectionPath).add(documentData);
    },
    getDocumentReference: (documentPath: string): DocumentReference => {
      return fastifyInstance.firestore.doc(documentPath);
    }
  });
});

export default firestorePlugin;
