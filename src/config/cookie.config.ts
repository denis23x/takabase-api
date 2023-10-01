/** @format */

import { FastifyCookieOptions } from '@fastify/cookie';

// https://github.com/fastify/fastify-cookie

export const cookieConfig: FastifyCookieOptions = {
  secret: 'my-secret',
  parseOptions: {}
};
