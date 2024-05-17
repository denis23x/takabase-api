/** @format */

export const categoryUpsertSchema: Record<string, any> = {
  $id: 'categoryUpsertSchema',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      default: 'Vivamus odio.',
      minLength: 4,
      maxLength: 48
    },
    description: {
      type: 'string',
      default: 'Dolor sit amet, co.',
      nullable: true,
      minLength: 16,
      maxLength: 192
    }
  }
};
