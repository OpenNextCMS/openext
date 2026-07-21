const schema = {
  fields: [
    {
      key: 'items',
      label: 'Features',
      type: 'list',
      default: [
        {
          title: 'Best Quality',
          text: 'Fresh ingredients sourced daily from trusted local suppliers and spice merchants.',
        },
        {
          title: 'Traditional Recipes',
          text: 'Authentic family recipes prepared with care by our experienced chefs.',
        },
        {
          title: 'Warm Atmosphere',
          text: 'A welcoming space where every guest feels at home from the moment they arrive.',
        },
      ],
      itemFields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'text', label: 'Description', type: 'textarea' },
      ],
    },
  ],
};

export default schema;
