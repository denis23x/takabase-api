/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, PrismaClient, User } from '../../database/client';
import { UserCreateDto } from '../../types/dto/user/user-create';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { DocumentReference, WriteResult } from 'firebase-admin/lib/firestore';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['Users'],
      description: 'Creates a new User',
      body: {
        type: 'object',
        allOf: [
          {
            type: 'object',
            properties: {
              terms: {
                type: 'boolean',
                const: true
              },
              appearance: {
                type: 'object'
              }
            }
          },
          {
            $ref: 'partsUserNameSchema#'
          },
          {
            $ref: 'partsUserEmailSchema#'
          },
          {
            $ref: 'partsUserPasswordSchema#'
          }
        ],
        required: ['name', 'email', 'password', 'terms'],
        additionalProperties: false
      },
      response: {
        201: {
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
        400: {
          $ref: 'responseErrorSchema#'
        },
        500: {
          $ref: 'responseErrorSchema#'
        }
      }
    },
    handler: async function (request: FastifyRequest<UserCreateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

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

            // Create Auth user record
            const userFirebaseRecord: UserRecord = await request.server.auth
              .createUser({
                email: request.body.email,
                emailVerified: false,
                password: request.body.password,
                displayName: request.body.name,
                disabled: false
              })
              .catch((error: any) => request.server.helperPlugin.throwError('auth/create-user-failed', error, request));

            //! Define rollback action for delete Auth user record
            requestRollback.userRecord = async (): Promise<void> => {
              await request.server.auth.deleteUser(userFirebaseRecord.uid);
            };

            // Define arguments to create post
            const userCreateArgs: Prisma.UserCreateArgs = {
              select: request.server.prismaPlugin.getUserSelect(),
              data: {
                name: request.body.name,
                terms: request.body.terms,
                firebaseUid: userFirebaseRecord.uid
              }
            };

            // Create the user
            const user: User = await prismaClient.user.create(userCreateArgs);
            const userPath: string = ['users', userFirebaseRecord.uid].join('/');

            //! Define rollback action for delete user
            requestRollback.user = async (): Promise<void> => {
              // Define arguments to delete user
              const userDeleteArgs: Prisma.UserDeleteArgs = {
                select: request.server.prismaPlugin.getUserSelect(),
                where: {
                  id: user.id
                }
              };

              await prismaClient.user.delete(userDeleteArgs);
            };

            // Get the reference to the user document
            const userDocumentReference: DocumentReference = request.server.firestorePlugin.getDocumentReference(userPath);

            // Firestore user document data
            const userDocumentCreateData: any = {
              userId: user.id,
              appearance: request.body.appearance
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

            // Return user
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
