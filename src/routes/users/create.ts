/** @format */

import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PrismaClient, User } from '../../database/client';
import type { UserCreateDto } from '../../types/dto/user/user-create';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { DocumentReference, WriteResult } from 'firebase-admin/lib/firestore';
import type { SaveObjectResponse } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    preValidation: fastify.verifyUsername,
    schema: {
      tags: ['Users'],
      description: 'Creates a new User',
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
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');

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
        const usernameUid: string = customAlphabet(alphanumeric, 8)().toLowerCase();
        const usernameSeparator: string = '-';

        // Generate a name by combining words from the 'colors' and 'animals' dictionaries
        const usernameGenerated: string = uniqueNamesGenerator({
          dictionaries: [colors, animals],
          separator: usernameSeparator,
          length: 2
        });

        request.body = {
          ...request.body,
          name: [usernameGenerated, usernameUid].join(usernameSeparator)
        };
      }

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
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
                  id: user.id,
                  firebaseUid: userFirebaseUid
                }
              };

              // Delete user
              await prismaClient.user.delete(userDeleteArgs);
            };

            // Get the reference to the user document
            const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(userPath);

            // Firestore user document data
            const userDocumentCreateData: any = {
              userId: user.id,
              appearance: await request.server.remoteConfigPlugin.getAppearance()
            }

            // Create Firestore user document
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const userDocumentCreate: WriteResult = await userDocumentReference
              .create(userDocumentCreateData)
              .catch((error: any) => request.server.helperPlugin.throwError('firestore/update-document-failed', error, request));

            //! Define rollback action for delete Firestore user document
            requestRollback.userDocument = async (): Promise<void> => {
              await userDocumentReference.delete();
            };

            // Create new object in Algolia user index
            const userIndexObject: SaveObjectResponse = await userIndex.saveObject({
              ...request.server.helperPlugin.mapObjectValuesToNull(user),
              objectID: String(user.id),
              updatedAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(user.updatedAt),
              createdAtUnixTimestamp: request.server.algoliaPlugin.getUnixTimestamp(user.createdAt),
            });

            //! Define rollback action for Algolia delete user object
            requestRollback.userIndexObjects = async (): Promise<void> => {
              await userIndex.deleteObjects([userIndexObject.objectID]);
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
