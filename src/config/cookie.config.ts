/** @format */

import { CookieSerializeOptions, FastifyCookieOptions } from '@fastify/cookie';

// https://github.com/fastify/fastify-cookie

export const cookieConfig: FastifyCookieOptions = {
  secret: String(process.env.COOKIE_SECRET)
};

export const cookieConfigResponse: Record<string, CookieSerializeOptions> = {
  development: {
    domain: String(process.env.COOKIE_DOMAIN),
    path: '/',
    signed: true,
    secure: false,
    httpOnly: true,
    sameSite: 'none'
  },
  production: {
    domain: String(process.env.COOKIE_DOMAIN),
    path: '/',
    signed: true,
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }
};
