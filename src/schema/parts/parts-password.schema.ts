/** @format */

export const partsPasswordSchema: Record<string, any> = {
  $id: 'partsPasswordSchema',
  type: 'string',
  example: 'password123',
  minLength: 6,
  maxLength: 48,
  pattern: '^(?=.*[\\d!@#$%^&*]).+$'
};
