/** @format */

export const partsFirebaseUidSchema: Record<string, any> = {
  $id: 'partsFirebaseUidSchema',
  type: 'string',
  pattern: '^[a-zA-Z0-9_-]{20,}$'
};
