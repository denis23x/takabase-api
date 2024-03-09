/** @format */

import fp from 'fastify-plugin';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { Storage, Bucket, MoveResponse, File, GetFilesResponse } from '@google-cloud/storage';
import { storageConfig } from '../config/storage.config';
import { GetFilesOptions } from '@google-cloud/storage/build/cjs/src/bucket';

const storagePlugin: FastifyPluginAsync = fp(async function (fastifyInstance: FastifyInstance) {
  fastifyInstance.decorate('storage', new Storage({ projectId: storageConfig.projectId }));

  // prettier-ignore
  fastifyInstance.decorate('storageService', {
    getBucket: (bucketUrl: string = storageConfig.bucket): Bucket => {
      return fastifyInstance.storage.bucket(bucketUrl);
    },
    getBucketImageListTempTransfer: (postFirebaseId: string, imageListUrl: string[]): Promise<string[]> => {
      const postBucketPath: string = ['posts', postFirebaseId].join('/');

      return Promise.all(
        imageListUrl.map(async (imageUrl: string): Promise<string> => {
          const source: string = decodeURIComponent(imageUrl);
          const destination: string = decodeURIComponent(source.replace('temp', postBucketPath));

          return fastifyInstance.storageService
            .getBucket()
            .file(source)
            .move(destination)
            .then((moveResponse: MoveResponse) => moveResponse.shift() as File)
            .then((file: File) => String(file.id));
        })
      );
    },
    getBucketImageListPost: async (userFirebaseId: string, postFirebaseId: string): Promise<string[]> => {
      const options: GetFilesOptions = {
        prefix: decodeURIComponent(['users', userFirebaseId, 'posts', postFirebaseId].join('/') + '/'),
        delimiter: '/'
      };

      return fastifyInstance.storageService
        .getBucket()
        .getFiles(options)
        .then((getFilesResponse: GetFilesResponse) => {
          return getFilesResponse
            .map((fileList: any) => (fileList.shift() as File)?.name)
            .filter((fileList: any) => !!fileList)
        });
    },
    getBucketImageListPostDelete: async (userFirebaseId: string, postFirebaseId: string): Promise<string[]> => {
      return fastifyInstance.storageService
        .getBucketImageListPost(userFirebaseId, postFirebaseId)
        .then(async (imageListPost: string[]) => {
          await Promise.all(imageListPost.map((imageUrl: string) => {
            return fastifyInstance.storageService.getBucket().file(imageUrl).delete();
          }));

          return imageListPost;
        });
    },
    getBucketImageListPostUpdate: async (userFirebaseId: string, postFirebaseId: string, imageListUrl: string[]): Promise<string[]> => {
      return fastifyInstance.storageService
        .getBucketImageListPost(userFirebaseId, postFirebaseId)
        .then(async (imageListPost: string[]) => {
          const imageListMarkdown: string[] = imageListUrl.map((imageUrl: string) => decodeURIComponent(imageUrl));
          const imageListDelete: string[] = imageListPost.filter((markdownImage: string) => !imageListMarkdown.includes(markdownImage));

          await Promise.all(imageListDelete.map((imageUrl: string) => {
            return fastifyInstance.storageService.getBucket().file(imageUrl).delete();
          }));

          return imageListDelete;
        });
    },
    getBucketImageListSubstringUrl: (markdownImageList: string[]): string[] => {
      return markdownImageList.map((markdownImageUrl: string) => {
        const url: URL = new URL(markdownImageUrl);
        const pathname: string = url.pathname;
        const index: number = pathname.indexOf('users');

        return pathname.substring(index);
      });
    },
    getMarkdownImageList: (markdown: string): string[] => {
      const markdownImageRegExp: RegExp = /!\[(.*?)]\((.*?)\)/g;
      const markdownImageList: RegExpMatchArray | null = markdown.match(markdownImageRegExp);

      if (markdownImageList?.length) {
        return markdownImageList
          .map((markdownImageUrl: string) => {
            const markdownImageUrlRegExp: RegExp = /(?<=\().+?(?=\))/i;
            const markdownImageUrlList: RegExpMatchArray | null = markdownImageUrl.match(markdownImageUrlRegExp);

            if (markdownImageUrlList?.length) {
              return markdownImageUrlList.shift() as string;
            } else {
              return '';
            }
          })
          .filter((markdownImageUrl: string) => !!markdownImageUrl);
      }

      return [];
    },
    getMarkdownImageListFirebaseBucket: (markdownImageList: string[]): string[] => {
      return markdownImageList
        .filter((markdownImageUrl: string) => markdownImageUrl.startsWith('https://firebasestorage.googleapis.com'))
        .filter((markdownImageUrl: string) => markdownImageUrl.includes(storageConfig.bucket));
    },
    getMarkdownImageListTemp: (markdownImageList: string[]): string[] => {
      const markdownImageListTemp: string[] = fastifyInstance.storageService
        .getMarkdownImageListFirebaseBucket(markdownImageList)
        .filter((markdownImageUrl: string) => markdownImageUrl.includes('temp'))

      return fastifyInstance.storageService.getBucketImageListSubstringUrl(markdownImageListTemp);
    },
    getMarkdownImageListPost: (markdownImageList: string[]): string[] => {
      const markdownImageListPost: string[] = fastifyInstance.storageService
        .getMarkdownImageListFirebaseBucket(markdownImageList)
        .filter((markdownImageUrl: string) => markdownImageUrl.includes('users'))
        .filter((markdownImageUrl: string) => markdownImageUrl.includes('posts'));

      return fastifyInstance.storageService.getBucketImageListSubstringUrl(markdownImageListPost);
    },
    getMarkdownImageListRewrite: (markdown: string, tempList: string[], postList: string[]): string => {
      let markdownNew: string = markdown;

      for (let i: number = 0; i < tempList.length; i++) {
        const tempPath: string = tempList[i];
        const postPath: string = postList[i];

        markdownNew = markdownNew.replace(tempPath, postPath);
      }

      return markdownNew;
    }
  });
});

export default storagePlugin;
