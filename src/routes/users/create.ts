/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PrismaClient, User } from '../../database/client';
import { UserCreateDto } from '../../types/dto/user/user-create';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { DocumentReference, WriteResult } from 'firebase-admin/lib/firestore';
import { customAlphabet } from 'nanoid';
import { alphanumeric } from 'nanoid-dictionary';
import { animals, colors, uniqueNamesGenerator } from 'unique-names-generator';
import { SaveObjectResponse } from '@algolia/client-search';
import { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
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
            $ref: 'partsUserNameSchema#'
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
      const userIndex: SearchIndex = request.server.algolia.initIndex('user');

      // Make unique name before start transaction (if not provided in body)
      if (!request.body?.name) {
        // Generate a unique UID with 8 alphanumeric characters and convert it to lowercase
        const userNameUid: string = customAlphabet(alphanumeric, 8)().toLowerCase();
        const userNameSeparator: string = '-';

        // Generate a name by combining words from the 'colors' and 'animals' dictionaries
        const userNameGenerated: string = uniqueNamesGenerator({
          dictionaries: [colors, animals],
          separator: userNameSeparator,
          length: 2
        });

        request.body = {
          ...request.body,
          name: [userNameGenerated, userNameUid].join(userNameSeparator)
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

            // Get the reference to the user document
            const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(userPath);

            // Firestore user document data
            const userDocumentCreateData: any = {
              appearance: {
                dropdownBackdrop: false,
                language: 'en-US',
                markdownMonospace: true,
                pageRedirectHome: false,
                pageScrollToTop: false,
                pageScrollInfinite: false,
                theme: 'auto',
                themeBackground: 'cosy-creatures',
                themePrism: 'auto',
                windowButtonPosition: 'left'
              }
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
