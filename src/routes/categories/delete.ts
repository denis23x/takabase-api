/** @format */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Category, Post, Prisma, PrismaClient } from '../../database/client';
import type { CategoryDeleteDto } from '../../types/dto/category/category-delete';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { GetObjectsResponse } from '@algolia/client-search';
import type { ParamsId } from '../../types/crud/params/params-id';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'DELETE',
    url: ':id',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Categories'],
      description: 'Removes the category',
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
      querystring: {
        type: 'object',
        properties: {
          categoryId: {
            $ref: 'partsIdSchema#'
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
    handler: async function (request: FastifyRequest<ParamsId & CategoryDeleteDto>, reply: FastifyReply): Promise<any> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract category and post related information from the request object
      const categoryId: number = Number(request.params.id);
      const categoryIdNext: number = Number(request.query.categoryId);

      // Check if there are results in the fetched category index objects
      const categoryIndexObject: Record<string, unknown> = await request.server.algolia.getObject({
        indexName: 'category',
        objectID: String(categoryId)
      });

      // Preparing for queue
      let postListDelete: Post[] = [];

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

            //! Define rollback action for Algolia delete category object
            requestRollback.categoryIndexObjects = async (): Promise<void> => {
              await request.server.algolia.saveObject({
                indexName: 'category',
                body: categoryIndexObject
              });
            };

            // Delete Algolia category index object
            await request.server.algolia.deleteObject({
              indexName: 'category',
              objectID: String(categoryId)
            });

            // If there is a categoryIdNext provided
            if (categoryIdNext) {
              // Define arguments to update category related posts
              const postUpdateManyArgs: Prisma.PostUpdateManyArgs = {
                where: {
                  userFirebaseUid,
                  categoryId
                },
                data: {
                  categoryId: categoryIdNext
                }
              };

              // Update category related posts
              await prismaClient.post.updateMany(postUpdateManyArgs);
            } else {
              // Define arguments to find posts associated with the category
              const postFindManyArgs: Prisma.PostFindManyArgs = {
                select: {
                  id: true,
                  cover: true,
                  markdown: true
                },
                where: {
                  userFirebaseUid,
                  categoryId
                }
              };

              // Retrieve the list of posts associated with the category
              postListDelete = await request.server.prisma.post.findMany(postFindManyArgs);

              // Initialize the Algolia search index for category related posts objects
              const postIndexObjects: GetObjectsResponse<any> = await request.server.algolia.getObjects({
                requests: postListDelete.map((post: Post) => ({
                  indexName: 'post',
                  objectID: String(post.id)
                }))
              });

              // Check if there are results in the fetched post index objects
              if (postIndexObjects?.results.length) {
                //! Define rollback action for Algolia delete category related post objects
                requestRollback.postIndexObjects = async (): Promise<void> => {
                  await request.server.algolia.batch({
                    indexName: 'post',
                    batchWriteParams: {
                      requests: postIndexObjects.results.map((postIndexObject: any) => ({
                        action: 'addObject',
                        body: postIndexObject
                      }))
                    }
                  });
                };

                // Delete Algolia category posts index objects
                await request.server.algolia.batch({
                  indexName: 'post',
                  batchWriteParams: {
                    requests: postIndexObjects.results.map((postIndexObject: any) => ({
                      action: 'deleteObject',
                      body: postIndexObject
                    }))
                  }
                });
              }
            }

            // Define arguments to delete category
            const categoryDeleteArgs: Prisma.CategoryDeleteArgs = {
              where: {
                id: categoryId,
                userFirebaseUid
              }
            };

            // Delete category
            return prismaClient.category.delete(categoryDeleteArgs);
          }).then((category: Category) => {
            // If there is NOT a move operation
            postListDelete.forEach((post: Post) => {
              // Extract post information from the request object
              const postCover: string | null = post.cover;
              const postMarkdown: string = post.markdown;

              // Get the list of images in the post markdown body
              const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
              const postMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList);

              // If there is a cover
              if (postCover) {
                //! Queue append
                request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(request.server.markdownPlugin.getImageListFromBucket([postCover])));
              }

              // If there are post markdown images
              if (postMarkdownImageList.length) {
                //! Queue append
                request.server.lavinMQPlugin.setImageListMoveToTemp(JSON.stringify(postMarkdownImageList));
              }
            });

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
