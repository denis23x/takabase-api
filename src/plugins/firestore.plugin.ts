/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getFirestore, DocumentReference, WriteResult } from 'firebase-admin/firestore';

const firestorePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('firestore', getFirestore(fastifyInstance.firebase));

  fastifyInstance.decorate('firestoreService', {
    addDocument: (collectionPath: string, documentData: any): Promise<DocumentReference> => {
      return fastifyInstance.firestore.collection(collectionPath).add(documentData);
    },
    getDocumentReference: (documentPath: string): DocumentReference => {
      return fastifyInstance.firestore.doc(documentPath);
    },
    updateDocument: (documentPath: string, documentData: any): Promise<WriteResult> => {
      return fastifyInstance.firestore.doc(documentPath).update(documentData);
    },
    deleteDocument: (documentPath: string): Promise<WriteResult> => {
      return fastifyInstance.firestore.doc(documentPath).delete();
    }
  });
});

export default firestorePlugin;
