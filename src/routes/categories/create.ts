/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Prisma, Category, PrismaClient } from '../../database/client';
import type { CategoryCreateDto } from '../../types/dto/category/category-create';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { SaveObjectResponse } from '@algolia/client-search';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Creates a new category',
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
            $ref: 'partsCategoryDescriptionSchema#'
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

            // Define the arguments for creating a new category
            const categoryCreateArgs: Prisma.CategoryCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getCategorySelect(),
                user: {
                  select: {
                    id: true,
                    avatar: true,
                    name: true,
                    firebaseUid: true
                  }
                }
              },
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
            const category: Category & Record<string, any> = await prismaClient.category.create(categoryCreateArgs);

            //! Define rollback action for delete category row
            requestRollback.category = async (): Promise<void> => {
              // Define arguments to delete category
              const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
                where: {
                  id: category.id,
                  userFirebaseUid
                }
              };

              // Delete category
              await prismaClient.category.delete(categoryDeleteArgs);
            }

            // Create new object in Algolia category index
            const categoryIndexObject: SaveObjectResponse = await request.server.algolia.saveObject({
              indexName: 'category',
              body: {
                ...request.server.helperPlugin.mapObjectValuesToNull(category),
                objectID: String(category.id),
                updatedAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(category.updatedAt),
                createdAtUnixTimestamp: request.server.dayjsPlugin.getUnixTimestamp(category.createdAt),
                user: {
                  id: category.user.id,
                  avatar: category.user.avatar,
                  name: category.user.name,
                  firebaseUid: category.user.firebaseUid,
                },
              }
            });

            //! Define rollback action for Algolia delete category object
            requestRollback.categoryIndexObjects = async (): Promise<void> => {
              await request.server.algolia.deleteObject({
                indexName: 'category',
                objectID: categoryIndexObject.objectID
              });
            };

            // Return the category
            return category;
          }).then((category: Category) => {
            // Send success response with created category
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
