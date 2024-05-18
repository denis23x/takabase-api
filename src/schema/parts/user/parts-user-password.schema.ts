/** @format */

export const partsUserPasswordSchema: Record<string, any> = {
  $id: 'partsUserPasswordSchema',
  type: 'string',
  default: 'password123',
  minLength: 6,
  maxLength: 48,
  pattern: '^(?=.*[\\d\\W]).{6,48}$'
};
