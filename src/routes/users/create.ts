/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PrismaClient, User } from '../../database/client';
import type { UserCreateDto } from '../../types/dto/user/user-create';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { DocumentReference } from 'firebase-admin/lib/firestore';
import type { SaveObjectResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    preValidation: fastify.verifyUsername,
    schema: {
      tags: ['Users'],
      description: 'Creates a new user',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      body: {
        type: 'object',
        properties: {
          name: {
            $ref: 'partsUsernameSchema#'
          }
        },
        nullable: true
      },
      response: {
        '201': {
          type: 'object',
          properties: {
            data: {
              $ref: 'userSchema#'
            },
            statusCode: {
              type: 'number'
            }
          }
        },
        '4xx': {
          $ref: 'responseErrorSchema#'
        },
        '5xx': {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<UserCreateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;
      const userPath: string = ['users', userFirebaseUid].join('/');
      const username: string | undefined = request.body?.name;

      // Check if name already exists
      if (username) {
        // Define the arguments for find user
        const userFindUniqueArgs: Prisma.UserFindUniqueArgs = {
          where: {
            name: username
          }
        };

        // Find the user
        const user: User = await request.server.prisma.user.findUnique(userFindUniqueArgs);

        if (user) {
          // Send error response with existing user
          return reply.status(400).send({
            message: 'The name "' + username + '" is already in use',
            error: 'Bad request',
            statusCode: 400
          });
        }
      } else {
        // Make unique name before start transaction
        const username: string = ['newbie', request.server.helperPlugin.generateUid(8)].join('-').toLowerCase();

        request.body = {
          ...request.body,
          name: username
        };
      }

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<User> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Define the arguments for create user
            const userCreateArgs: Prisma.UserCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getUserSelect(),
                firebaseUid: true,
                description: true
              },
              data: {
                name: request.body.name,
                firebaseUid: userFirebaseUid,
                terms: true,
              }
            };

            // Create the user
            const user: User = await prismaClient.user.create(userCreateArgs);

            //! Define rollback action for delete user row
            requestRollback.user = async (): Promise<void> => {
              // Define arguments to delete user
              const userDeleteArgs: Prisma.UserDeleteArgs = {
                where: {
                  firebaseUid: userFirebaseUid
                }
              };

              // Delete user
              await prismaClient.user.delete(userDeleteArgs);
            };

            // Define the arguments for update Firebase user auth record
            await request.server.auth.updateUser(userFirebaseUid, {
              displayName: request.body.name,
              photoURL: null
            });

            //! Delete user Auth record
            requestRollback.userRecord = async (): Promise<void> => {
              await request.server.auth.deleteUser(userFirebaseUid);
            }

            // Get the reference to the user document
            const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(userPath);

            // Firestore user document data
            const userDocumentCreateData: any = {
              userId: user.id,
              appearance: await request.server.remoteConfigPlugin.getAppearance()
            }

            // Create Firestore user document
            await userDocumentReference
              .create(userDocumentCreateData)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error));

            //! Define rollback action for delete Firestore user document
            requestRollback.userDocument = async (): Promise<void> => {
              await userDocumentReference.delete();
            };

            // Create new object in Algolia user index
            const userIndexObject: SaveObjectResponse = await request.server.algolia.saveObject({
              indexName: 'user',
              body: {
                ...request.server.helperPlugin.mapObjectValuesToNull(user),
                objectID: String(user.firebaseUid),
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(user.updatedAt),
                createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(user.createdAt),
              }
            });

            //! Define rollback action for Algolia delete user object
            requestRollback.userIndexObjects = async (): Promise<void> => {
              await request.server.algolia.deleteObject({
                indexName: 'user',
                objectID: userIndexObject.objectID
              });
            };

            // Return the user
            return user;
          }).then((user: User) => {
            // Send success response with created user
            return reply.status(200).send({
              data: user,
              statusCode: 200
            });
          })

          // Exit retry loop if transaction is successful
          break;
        } catch (error: any) {
          // Increment retry counter
          requestRetries++;

          //! Define rollback actions and handle errors
          const responseError: ResponseError | null = await reply.server.prismaPlugin.setErrorTransaction(error, requestRetries >= MAX_RETRIES, requestRollback);

          if (responseError) {
            return reply.status(responseError.statusCode).send(responseError);
          }
        }
      }
    }
  });
}
