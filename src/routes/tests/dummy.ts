/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'dummy',
    schema: {
      tags: ['Tests'],
      description: 'Test endpoint no special purpose',
      response: {
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<any>, reply: FastifyReply): Promise<any> {
      const docPath: string = 'users/1BXmxiwTwWfxHfJq4Cch9eVrBR83';
      const docReference: DocumentReference = request.server.firestore.getDocReference(docPath);

      await docReference.get().then((documentSnapshot: DocumentSnapshot) => {
        console.log(documentSnapshot.data());
      });

      return reply.status(200).send({
        data: {
          message: 'Hi'
        },
        statusCode: 200
      });
    }
  });
}
