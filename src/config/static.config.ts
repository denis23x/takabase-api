/** @format */

import { FastifyStaticOptions } from '@fastify/static';
import * as path from 'path';
import * as process from 'process';

// https://github.com/fastify/fastify-static

export const staticConfig: FastifyStaticOptions = {
  root: path.join(process.cwd(), 'upload'),
  prefix: '/upload/'
};
