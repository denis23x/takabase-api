/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { AuthorizationLoginDto } from '../../types/dto/authorization/authorization-login';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { ResponseError } from '../../types/crud/response/response-error.schema';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: 'login',
    schema: {
      tags: ['Authorization'],
      description: 'Creates a new Token',
      body: {
        type: 'object',
        properties: {
          email: {
            $ref: 'partsUserEmailSchema#'
          },
          firebaseUid: {
            $ref: 'partsFirebaseUidSchema#'
          }
        },
        required: ['email', 'firebaseUid'],
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              allOf: [
                {
                  type: 'object',
                  properties: {
                    bearer: {
                      type: 'string'
                    }
                  }
                },
                {
                  $ref: 'userSchema#'
                }
              ]
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
    handler: async function (request: FastifyRequest<AuthorizationLoginDto>, reply: FastifyReply): Promise<any> {
      // Extract email and firebaseUid from request body
      const { email, firebaseUid }: Record<string, string> = request.body;

      // Get user record from Auth service
      const userRecord: UserRecord = await request.server.auth
        .getUserByEmail(email)
        .catch((error: any) => request.server.helperPlugin.throwError('auth/get-user-failed', error, request));

      // Check if the retrieved user's UID matches the provided firebaseUid
      if (userRecord.uid !== firebaseUid) {
        const responseError: Partial<ResponseError> = {
          error: 'Not Found',
          statusCode: 404
        };

        // If not found, return a 404 error
        return reply.status(responseError.statusCode).send(responseError);
      }

      // Define arguments to find a unique user based on firebaseUid
      const userFindUniqueOrThrowArgs: Prisma.UserFindUniqueOrThrowArgs = {
        select: {
          ...request.server.prismaPlugin.getUserSelect(),
          firebaseUid: true,
          description: true
        },
        where: {
          firebaseUid
        }
      };

      // Find the user based on the provided firebaseUid
      await reply.server.prisma.user.findUniqueOrThrow(userFindUniqueOrThrowArgs).then((user: User) => {
        // Prepare user data for response
        const signUser: Partial<User> = {
          id: user.id,
          firebaseUid: user.firebaseUid
        };

        // Prevent firebaseUid expose
        delete user.firebaseUid;

        // Send user data along with a bearer token for authentication
        return reply.status(200).send({
          data: {
            ...user,
            bearer: reply.server.authenticateHandler.signUser(signUser)
          },
          statusCode: 200
        });
      });
    }
  });
}
