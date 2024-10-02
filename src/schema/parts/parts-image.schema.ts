/** @format */

// prettier-ignore
export const partsImageSchema: Record<string, any> = {
  $id: 'partsImageSchema',
  type: 'string',
  nullable: true,
  example: 'https://localhost:4200/seed/10.webp',
  pattern: '^https?:\\/\\/[^\\/]+\\/(post-covers|post-images|post-password-covers|post-password-images|post-private-covers|post-private-images|user-avatars|seed|temp)\\/.+\\.webp$'
};
