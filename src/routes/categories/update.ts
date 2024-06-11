/** @format */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma, Category, PrismaClient } from '../../database/client';
import { CategoryUpdateDto } from '../../types/dto/category/category-update';
import { ResponseError } from '../../types/crud/response/response-error.schema';
import { SearchIndex } from 'algoliasearch';
import { GetObjectsResponse, SaveObjectResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Updates a Category',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      params: {
        type: 'object',
        properties: {
          id: {
            $ref: 'partsIdSchema#'
          }
        }
      },
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
        }
      },
      response: {
        '200': {
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
    handler: async function (request: FastifyRequest<CategoryUpdateDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const categoryId: number = Number(request.params.id);
      const categoryIndex: SearchIndex = request.server.algolia.initIndex('category');
      const categoryIndexObjects: GetObjectsResponse<any> = await categoryIndex.getObjects([String(categoryId)]);

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

            // Check if there are results in the fetched category index objects
            if (categoryIndexObjects.results.length) {
              // Update object in Algolia category index
              // @ts-ignore
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const categoryIndexObject: SaveObjectResponse = await categoryIndex.partialUpdateObjects([{
                objectID: String(categoryId),
                name: request.body.name,
                description: request.body.description
              }]);

              //! Define rollback action for Algolia update category object
              requestRollback.categoryIndexObjects = async (): Promise<void> => {
                await categoryIndex.partialUpdateObjects([...categoryIndexObjects.results]);
              };
            }

            // Define the arguments for updating category
            const categoryUpdateArgs: Prisma.CategoryUpdateArgs = {
              select: request.server.prismaPlugin.getCategorySelect(),
              where: {
                id: categoryId,
                userFirebaseUid
              },
              data: request.body
            };

            // Update category
            return prismaClient.category.update(categoryUpdateArgs)
          }).then((category: Category) => {
            // Send success response with deleted category
            return reply.status(200).send({
              data: category,
              statusCode: 200
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
