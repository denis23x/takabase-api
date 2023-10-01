/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, User } from '../../database/client';
import { POSTUser } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.authenticate,
    schema: {
      tags: ['Users'],
      description: 'Creates a new User',
      security: [
        {
          Authorization: ['token']
        }
      ],
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          terms: {
            type: 'boolean'
          },
          facebookId: {
            type: 'string',
            nullable: true
          },
          githubId: {
            type: 'string',
            nullable: true
          },
          googleId: {
            type: 'string',
            nullable: true
          }
        },
        required: ['name', 'email', 'terms']
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
    handler: async function (request: FastifyRequest<POSTUser>, reply: FastifyReply): Promise<any> {
      const userCreateInput: Prisma.UserCreateInput = request.body;

      const userCreateArgs: Prisma.UserCreateArgs = {
        select: request.server.prismaService.getUserSelect(),
        data: {
          ...userCreateInput,
          settings: {
            create: {}
          }
        }
      };

      return request.server.prisma.user
        .create(userCreateArgs)
        .then((user: User) => {
          return reply.status(201).send({
            data: user,
            statusCode: 201
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.getResponseError(reply, error);
        });
    }
  });
}
