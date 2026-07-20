const schema = {
  fields: [
    {
      key: 'title',
      label: 'Headline',
      type: 'text',
      default: 'Meditate Together Online',
    },
    {
      key: 'paragraph1',
      label: 'First paragraph',
      type: 'textarea',
      default:
        'Share stillness with people around the world. Join live group sits, guided journeys, and community check-ins that make mindfulness feel less solitary.',
    },
    {
      key: 'paragraph2',
      label: 'Second paragraph',
      type: 'textarea',
      default:
        'Whether you are beginning or deepening your practice, Breez keeps you connected — with gentle structure, warm guidance, and space to breathe.',
    },
    { key: 'backgroundColor', label: 'Content background', type: 'color', default: '#ffffff' },
    { key: 'imagePanelColor', label: 'Image panel background', type: 'color', default: '#f4a894' },
    { key: 'headingColor', label: 'Heading color', type: 'color', default: '#2b3142' },
    { key: 'fontColor', label: 'Body font color', type: 'color', default: '#6b7288' },
    { key: 'buttonColor', label: 'Button background', type: 'color', default: '#2b3142' },
    { key: 'buttonTextColor', label: 'Button text color', type: 'color', default: '#ffffff' },
    { key: 'ctaLabel', label: 'Button label', type: 'text', default: 'Start Now' },
    { key: 'ctaHref', label: 'Button link', type: 'url', default: '#together' },
    {
      key: 'image',
      label: 'Portrait image',
      type: 'image',
      default:
        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=900&q=80',
    },
  ],
};

export default schema;
