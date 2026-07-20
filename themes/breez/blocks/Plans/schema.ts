const schema = {
  fields: [
    { key: 'title', label: 'Section title', type: 'text', default: 'Our Plans' },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      default:
        'Choose a membership that fits your rhythm. Cancel anytime on monthly, or save with a yearly practice commitment.',
    },
    { key: 'backgroundColor', label: 'Content background', type: 'color', default: '#ffffff' },
    { key: 'panelBackgroundColor', label: 'Plans panel background', type: 'color', default: '#e4f3ee' },
    { key: 'headingColor', label: 'Heading color', type: 'color', default: '#2b3142' },
    { key: 'fontColor', label: 'Body font color', type: 'color', default: '#6b7288' },
    { key: 'cardBackgroundColor', label: 'Plan card background', type: 'color', default: '#2b3142' },
    { key: 'cardFontColor', label: 'Plan card font color', type: 'color', default: '#ffffff' },
    {
      key: 'plans',
      label: 'Pricing plans',
      type: 'list',
      default: [
        {
          label: 'Monthly Plan',
          description: 'Flexible access with new classes every week. Cancel anytime.',
          price: '$29',
          ctaLabel: 'Get Now',
          ctaHref: '#monthly',
        },
        {
          label: 'Yearly Plan',
          description: 'Best value for dedicated practice. Limited-time savings.',
          price: '$250',
          ctaLabel: 'Get Now',
          ctaHref: '#yearly',
        },
      ],
      itemFields: [
        { key: 'label', label: 'Plan name', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'ctaLabel', label: 'Button label', type: 'text' },
        { key: 'ctaHref', label: 'Button link', type: 'url' },
      ],
    },
  ],
};

export default schema;
