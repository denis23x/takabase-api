/** @format */

export const partsSitemapSchema: Record<string, any> = {
  $id: 'partsSitemapSchema',
  type: 'string',
  enum: ['localhost', 'development', 'production'],
  example: 'localhost'
};
