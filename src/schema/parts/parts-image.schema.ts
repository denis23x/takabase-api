/** @format */

export const partsImageSchema: Record<string, any> = {
  $id: 'partsImageSchema',
  type: 'string',
  nullable: true,
  example: 'https://localhost:4200/seed/10.webp',
  pattern: '^https?:\\/\\/[^\\/]+\\/(avatars|covers|images|seed|temp)\\/[a-zA-Z0-9]{2,}\\.webp$'
};
