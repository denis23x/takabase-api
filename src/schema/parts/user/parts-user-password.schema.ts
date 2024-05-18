/** @format */

export const partsUserPasswordSchema: Record<string, any> = {
  $id: 'partsUserPasswordSchema',
  type: 'string',
  example: 'password123',
  minLength: 6,
  maxLength: 48,
  pattern: '^(?=.*[\\d\\W]).{6,48}$'
};
