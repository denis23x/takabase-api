/** @format */

export const partsUserNameSchema: Record<string, any> = {
  $id: 'partsUserNameSchema',
  type: 'string',
  minLength: 4,
  maxLength: 32,
  pattern: '^(?!@)\\S{4,32}$'
};
