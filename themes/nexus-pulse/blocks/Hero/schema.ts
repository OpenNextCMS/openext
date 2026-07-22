const schema = {
  fields: [
    { key: 'badge', label: 'Badge text', type: 'text', default: 'Now in public beta' },
    {
      key: 'title',
      label: 'Title (plain part)',
      type: 'text',
      default: 'Build products your users'
    },
    {
      key: 'highlight',
      label: 'Title (highlighted part)',
      type: 'text',
      default: 'actually love'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      default: 'Nexus Pulse gives your team the tools to ship faster, iterate smarter, and delight every single user.'
    },
    { key: 'accent', label: 'Accent color', type: 'color', default: '#7c5cff' },
    { key: 'accent2', label: 'Accent color 2', type: 'color', default: '#38bdf8' },
    { key: 'showPrimaryCta', label: 'Show primary button', type: 'boolean', default: true },
    { key: 'primaryCtaLabel', label: 'Primary button text', type: 'text', default: 'Get Started' },
    { key: 'primaryCtaHref', label: 'Primary button link', type: 'url', default: '#get-started' },
    { key: 'showSecondaryCta', label: 'Show secondary button', type: 'boolean', default: true },
    { key: 'secondaryCtaLabel', label: 'Secondary button text', type: 'text', default: 'Watch demo' },
    { key: 'secondaryCtaHref', label: 'Secondary button link', type: 'url', default: '#demo' },
    { key: 'backgroundImage', label: 'Background image (optional)', type: 'image', default: '' }
  ]
};

export default schema;
