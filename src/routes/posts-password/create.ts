/** @format */

import { parse } from 'path';
import { storageConfig } from '../../config/storage.config';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PostPassword, Prisma, PrismaClient } from '../../database/client';
import type { ResponseError } from '../../types/crud/response/response-error.schema';
import type { PostCreateDto } from '../../types/dto/post/post-create';

export default async function (fastify: FastifyInstance): Promise<void> {
  fastify.route({
    method: 'POST',
    url: '',
    onRequest: fastify.verifyIdToken,
    schema: {
      tags: ['Posts-Password'],
      description: 'Creates a new post protected by password',
      security: [
        {
          swaggerBearerAuth: []
        }
      ],
      body: {
        type: 'object',
        properties: {
          name: {
            $ref: 'partsPostNameSchema#'
          },
          description: {
            $ref: 'partsPostDescriptionSchema#'
          },
          markdown: {
            $ref: 'partsPostMarkdownSchema#'
          },
          cover: {
            $ref: 'partsImageSchema#'
          },
          password: {
            $ref: 'partsPasswordSchema#'
          }
        },
        required: ['name', 'description', 'markdown', 'password']
      },
      response: {
        '201': {
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
    // prettier-ignore
    handler: async function (request: FastifyRequest<PostCreateDto>, reply: FastifyReply): Promise<void> {
      // Maximum number of transaction retries
      const MAX_RETRIES: number = 3;

      // Extract the user firebaseUid from the authenticated user
      const userFirebaseUid: string = request.user.uid;

      // Extract post information from the request object
      const postCover: string | null = request.body.cover;
      const postMarkdown: string = request.body.markdown;

      // Get the list of images in the post markdown body
      const bodyMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBody(postMarkdown);
      const tempMarkdownImageList: string[] = request.server.markdownPlugin.getImageListFromBucket(bodyMarkdownImageList);

      // Counter for transaction retries
      let requestRetries: number = 0;
      let requestRollback: any = undefined;

      while (requestRetries < MAX_RETRIES) {
        try {
          // Start transaction using Prisma's $transaction method https://www.prisma.io/docs/orm/prisma-client/queries/transactions
          await request.server.prisma.$transaction(async (prismaClient: PrismaClient): Promise<PostPassword> => {
            // Re-initialize requestRollback object
            requestRollback = {};

            // If there is a cover provided
            if (postCover) {
              // Get the cover relative /temp URL
              const tempCoverList: string[] = request.server.markdownPlugin.getImageListFromBucket([postCover]);

              // Checking to avoid unnecessary move when changing post type
              if (tempCoverList.some((tempCover: string) => !tempCover.startsWith(storageConfig.paths.PASSWORD_COVERS))) {
                // Move the /temp cover to the /covers
                const postCoverList: string[] = await request.server.storagePlugin
                  .setImageListMove(tempCoverList, storageConfig.paths.PASSWORD_COVERS)
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

                //! Define rollback action for cover to move it to the /temp back
                requestRollback.postCoverList = async (): Promise<void> => {
                  // Get the original destination for rollback
                  await request.server.storagePlugin.setImageListMove(postCoverList, tempCoverList.map((tempCover: string) => parse(tempCover).dir).shift());
                };

                // Replace the cover URL in the request body with the new URL
                request.body.cover = postCover.replace(tempCoverList.shift(), postCoverList.shift());
              }
            }

            // If there are /temp markdown images
            if (tempMarkdownImageList.length) {
              // Checking to avoid unnecessary move when changing post type
              if (tempMarkdownImageList.some((tempMarkdownImage: string) => !tempMarkdownImage.startsWith(storageConfig.paths.PASSWORD_IMAGES))) {
                // Move the /temp markdown images to the /images
                const postMarkdownImageList: string[] = await request.server.storagePlugin
                  .setImageListMove(tempMarkdownImageList, storageConfig.paths.PASSWORD_IMAGES)
                  .catch((error: any) => request.server.helperPlugin.throwError('storage/file-move-failed', error));

                //! Define rollback action for moving markdown images to the /temp back
                requestRollback.postMarkdownImageList = async (): Promise<void> => {
                  // Get the original destination for rollback
                  await request.server.storagePlugin.setImageListMove(postMarkdownImageList, tempMarkdownImageList.map((tempImage: string) => parse(tempImage).dir).shift());
                };

                // Replace the markdown body with the new URL images list
                request.body.markdown = request.server.markdownPlugin.getImageListReplace(postMarkdown, bodyMarkdownImageList, postMarkdownImageList);
              }
            }

            // Define the arguments for create post
            const postPasswordCreateArgs: Prisma.PostPasswordCreateArgs = {
              select: {
                ...request.server.prismaPlugin.getPostPasswordSelect(),
                markdown: true
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

            // Create the post
            const postPassword: PostPassword & Record<string, any> = await prismaClient.postPassword.create(postPasswordCreateArgs);

            //! Define rollback action for delete post row
            requestRollback.postPassword = async (): Promise<void> => {
              // Define arguments to delete post
              const postPasswordDeleteArgs: Prisma.PostPasswordDeleteArgs = {
                where: {
                  id: postPassword.id,
                  userFirebaseUid
                }
              };

              // Delete post
              await prismaClient.postPassword.delete(postPasswordDeleteArgs);
            }

            // Return the post
            return postPassword;
          }).then((postPassword: PostPassword) => {
            // Send success response with created post
            return reply.status(201).send({
              data: postPassword,
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
