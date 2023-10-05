/** @format */

import { CookieSerializeOptions, FastifyCookieOptions } from '@fastify/cookie';

// https://github.com/fastify/fastify-cookie

export const cookieConfig: FastifyCookieOptions = {
  secret: process.env.COOKIE_SECRET
};

export const cookieConfigResponse: Record<string, CookieSerializeOptions> = {
  development: {
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
    signed: true,
    secure: false,
    httpOnly: true,
    sameSite: false
  },
  production: {
    domain: process.env.COOKIE_DOMAIN,
    path: '/',
    signed: true,
    secure: true,
    httpOnly: true,
    sameSite: true
  }
};
