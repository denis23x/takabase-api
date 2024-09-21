/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, PostPassword } from '../../database/client';
import type { QuerystringScope } from '../../types/crud/querystring/querystring-scope';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'GET',
    url: ':id',
    onRequest: fastify.verifyIdTokenOptional,
    schema: {
      tags: ['Posts-Password'],
      description: 'Get a single post protected by password',
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          password: {
            $ref: 'partsPasswordSchema#'
          },
          scope: {
            $ref: 'partsScopeSchema#'
          }
        }
      },
      response: {
        '200': {
          type: 'object',
          properties: {
            data: {
              $ref: 'postPasswordSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId & QuerystringScope>, reply: FastifyReply): Promise<any> {
      // Extract post information from the request object
      const postId: number = Number(request.params.id);

      // Extract information from the request query
      const password: string = request.query.password;

      // Define the arguments for find a post
      const postPasswordFindUniqueArgs: Prisma.PostPasswordFindUniqueArgs = {
        select: {
          ...request.server.prismaPlugin.getPostPasswordSelect(),
          markdown: true,
          user: {
            select: request.server.prismaPlugin.getUserSelect()
          }
        },
        where: {
          id: postId
        }
      };

      // Check if a password is provided
      if (password) {
        postPasswordFindUniqueArgs.where.password = password;
        postPasswordFindUniqueArgs.select.password = false;
      } else {
        // If no password is provided, check if the request has a user
        if (request.user) {
          postPasswordFindUniqueArgs.where.userFirebaseUid = request.user.uid;
          postPasswordFindUniqueArgs.select.password = true;
        } else {
          // If there is no user and no password, return null
          return reply.status(200).send({
            data: null,
            statusCode: 200
          });
        }
      }

      // Find the post
      await request.server.prisma.postPassword
        .findUnique(postPasswordFindUniqueArgs)
        .then((postPassword: PostPassword | null) => {
          if (!postPassword && password) {
            // Return error
            return reply.status(403).send({
              error: 'Forbidden',
              message: 'Access denied',
              statusCode: 403
            });
          } else {
            // Return the post
            return reply.status(200).send({
              data: postPassword,
              statusCode: 200
            });
          }
        })
        .catch((error: Error) => {
          const responseError: ResponseError = reply.server.prismaPlugin.getErrorPrisma(error) as ResponseError;

          return reply.status(responseError.statusCode).send(responseError);
        });
    }
  });
}
