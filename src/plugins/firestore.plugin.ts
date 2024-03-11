/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getFirestore, Firestore, DocumentReference } from 'firebase-admin/firestore';

const firestorePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('firestore', {
    getFirestore: (): Firestore => getFirestore(fastifyInstance.firebase.getApp()),
    getDocReference: (documentPath: string): DocumentReference => {
      return fastifyInstance.firestore.getFirestore().doc(documentPath);
    }
  });
});

export default firestorePlugin;
