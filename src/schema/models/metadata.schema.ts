/** @format */

export const metadataSchema: Record<string, any> = {
  $id: 'metadataSchema',
  type: 'object',
  properties: {
    title: {
      type: 'string'
    },
    author: {
      type: 'string'
    },
    theme_color: {
      type: 'string'
    },
    description: {
      type: 'string'
    },
    favicon: {
      type: 'string'
    },
    canonical_url: {
      type: 'string'
    },
    open_graph: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: {
                type: 'string'
              },
              alt: {
                type: 'string'
              },
              type: {
                type: 'string'
              }
            }
          },
          example: []
        },
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        url: {
          type: 'string'
        },
        locale: {
          type: 'string'
        },
        site_name: {
          type: 'string'
        }
      }
    },
    twitter_card: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: {
                type: 'string'
              },
              alt: {
                type: 'string'
              }
            }
          },
          example: []
        },
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        },
        card: {
          type: 'string'
        },
        url: {
          type: 'string'
        }
      }
    }
  }
};
