/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category, PrismaClient } from '../../database/client';
import { CategoryCreateDto } from '../../types/dto/category/category-create';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { SaveObjectResponse } from '@algolia/client-search';
import { SearchIndex } from 'algoliasearch';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Creates a new Category',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      body: {
        type: 'object',
        properties: {
          name: {
            $ref: 'partsCategoryNameSchema#'
          },
          description: {
            oneOf: [
              {
                type: 'null'
              },
              {
                $ref: 'partsCategoryDescriptionSchema#'
              }
            ]
          }
        },
        required: ['name']
      },
      response: {
        '201': {
          type: 'object',
          properties: {
            data: {
              $ref: 'categorySchema#'
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
    handler: async function (request: FastifyRequest<CategoryCreateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Define Algolia category index
      const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');

      // Counter for transaction retries
      let requestRetries: number = 0;

      // Object to store rollback actions in case of transaction failure
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Category> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Define the arguments for creating a new category
            const categoryCreateArgs: Prisma.CategoryCreateArgs = {
              select: request.server.prismaPlugin.getCategorySelect(),
              data: {
                ...request.body,
                user: {
                  connect: {
                    firebaseUid: userFirebaseUid
                  }
                }
              }
            };

            // Create a new category
            const category: Category = await prismaClient.category.create(categoryCreateArgs);

            // Create new object in Algolia category index
            const categoryIndexObject: SaveObjectResponse = await categoryIndex.saveObject({
              objectID: category.id,
              id: category.id,
              name: category.name,
              description: category.description || null,
              userFirebaseUid
            });

            //! Define rollback action for Algolia delete category object
            requestRollback.categoryIndexObjects = async (): Promise<void> => {
              await categoryIndex.deleteObjects([categoryIndexObject.objectID]);
            };

            return category;
          }).then((category: Category) => {
            // Send success response with deleted category
            return reply.status(201).send({
              data: category,
              statusCode: 201
            });
          });

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
