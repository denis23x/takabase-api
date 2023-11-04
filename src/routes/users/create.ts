/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, User } from '../../database/client';
import { CreateUser } from '../../types/requests';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    schema: {
      tags: ['Users'],
      description: 'Creates a new User',
      body: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            pattern: '^\\S*$'
          },
          description: {
            type: 'string',
            nullable: true
          },
          avatar: {
            type: 'string',
            nullable: true
          },
          terms: {
            const: true
          },
          firebaseId: {
            type: 'string'
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
        required: ['name', 'terms', 'firebaseId'],
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
    handler: async function (request: FastifyRequest<CreateUser>, reply: FastifyReply): Promise<any> {
      const userCreateInput: Prisma.UserCreateInput = {
        ...request.body,
        settings: {
          create: {}
        }
      };

      const userCreateArgs: Prisma.UserCreateArgs = {
        select: request.server.prismaService.getUserSelect(),
        data: userCreateInput
      };

      await reply.server.prisma.user
        .create(userCreateArgs)
        .then((user: User) => {
          return reply.status(201).send({
            data: user,
            statusCode: 201
          });
        })
        .catch((error: Error) => {
          return reply.server.prismaService.setError(reply, error);
        });
    }
  });
}
