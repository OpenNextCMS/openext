const schema = {
  fields: [
    {
      key: 'items',
      label: 'Stat cards',
      type: 'list',
      default: [
        { icon: '⚡', value: '10k+', label: 'Active teams' },
        { icon: '🚀', value: '99.9%', label: 'Uptime' },
        { icon: '⭐', value: '4.9/5', label: 'Average rating' },
        { icon: '🌍', value: '40+', label: 'Countries served' }
      ],
      itemFields: [
        { key: 'icon', label: 'Icon (emoji or short glyph)', type: 'text' },
        { key: 'value', label: 'Value', type: 'text' },
        { key: 'label', label: 'Label', type: 'text' }
      ]
    }
  ]
};

export default schema;
