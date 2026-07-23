const schema = {
  fields: [
    { key: 'title', label: 'Title', type: 'text', default: 'Ready to jump in?' },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      default: 'Start your free trial today. No credit card required.'
    },
    { key: 'buttonLabel', label: 'Button text', type: 'text', default: 'Start free trial' },
    { key: 'buttonHref', label: 'Button link', type: 'url', default: '#get-started' },
    { key: 'accent', label: 'Accent color', type: 'color', default: '#7c5cff' }
  ]
};

export default schema;
