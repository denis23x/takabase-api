/** @format */

export const partsFirebaseUidSchema: Record<string, any> = {
  $id: 'partsFirebaseUidSchema',
  type: 'string',
  pattern: '^[A-Za-z0-9_-]{28}$'
};
