/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category, PrismaClient } from '../../database/client';
import type { CategoryUpdateDto } from '../../types/dto/category/category-update';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SearchIndex } from 'algoliasearch';
import type { GetObjectsResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'PUT',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Updates a category',
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
            $ref: 'partsCategoryDescriptionSchema#'
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
      let requestRollback: any = undefined;

      // prettier-ignore
      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<Category> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // Define the arguments for updating category
            const categoryUpdateArgs: Prisma.CategoryUpdateArgs = {
              select: {
                ...request.server.prismaPlugin.getCategorySelect(),
                user: {
                  select: {
                    ...request.server.prismaPlugin.getCategorySelect(),
                    firebaseUid: true
                  }
                }
              },
              where: {
                id: categoryId,
                userFirebaseUid
              },
              data: request.body
            };

            // Update the category
            const category: Category = await prismaClient.category.update(categoryUpdateArgs);

            // Check if there are results in the fetched category index objects
            if (categoryIndexObjects.results.length) {
              //! Define rollback action for Algolia update category object
              requestRollback.categoryIndexObjects = async (): Promise<void> => {
                await categoryIndex.partialUpdateObjects([...categoryIndexObjects.results]);
              };

              // Update object in Algolia category index object
              await categoryIndex.partialUpdateObjects([{
                ...request.server.helperPlugin.mapObjectValuesToNull(category),
                objectID: String(category.id),
                updatedAt: category.updatedAt,
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(category.updatedAt),
              }]);
            }

            // Return the category
            return category;
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
