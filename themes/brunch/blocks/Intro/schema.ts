const schema = {
  fields: [
    {
      key: 'heading',
      label: 'Heading',
      type: 'text',
      default: 'Indian traditional flavours',
    },
    {
      key: 'body',
      label: 'Body text',
      type: 'textarea',
      default:
        'Experience authentic spices, time-honoured recipes, and the warmth of Indian hospitality. Every dish tells a story of tradition passed down through generations.',
    },
    {
      key: 'insetImage',
      label: 'Inset image',
      type: 'image',
      default:
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=300&q=80',
    },
  ],
};

export default schema;
