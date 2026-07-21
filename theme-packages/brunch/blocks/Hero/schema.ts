const schema = {
  fields: [
    { key: 'title', label: 'Title', type: 'text', default: 'Brunch' },
    { key: 'titleEmphasis', label: 'Title emphasis (italic)', type: 'text', default: 'Full Website' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', default: 'Indian Cuisine' },
    { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Read More' },
    { key: 'ctaHref', label: 'Button link', type: 'url', default: '#menu' },
    {
      key: 'backgroundImage',
      label: 'Background image',
      type: 'image',
      default:
        'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1920&q=80',
    },
  ],
};

export default schema;
