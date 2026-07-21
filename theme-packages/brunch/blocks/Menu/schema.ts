const schema = {
  fields: [
    { key: 'heading', label: 'Heading', type: 'text', default: 'Discover' },
    { key: 'headingEmphasis', label: 'Heading emphasis', type: 'text', default: 'our new menu' },
    {
      key: 'circleImage',
      label: 'Circle image',
      type: 'image',
      default:
        'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=400&q=80',
    },
    {
      key: 'items',
      label: 'Menu items',
      type: 'list',
      default: [
        {
          name: 'Veg Samosa',
          description: 'Crispy pastry filled with spiced potatoes and peas.',
          price: '$8',
          image:
            'https://images.unsplash.com/photo-1601050690597-df0565f70950?auto=format&fit=crop&w=120&q=80',
        },
        {
          name: 'Chicken Tikka',
          description: 'Marinated chicken grilled in tandoor with aromatic spices.',
          price: '$16',
          image:
            'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=120&q=80',
        },
        {
          name: 'Lamb Biryani',
          description: 'Fragrant basmati rice layered with tender lamb and saffron.',
          price: '$22',
          image:
            'https://images.unsplash.com/photo-1563379091339-03246963d29a?auto=format&fit=crop&w=120&q=80',
        },
        {
          name: 'Butter Chicken',
          description: 'Creamy tomato curry with tender tandoori chicken pieces.',
          price: '$18',
          image:
            'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=120&q=80',
        },
      ],
      itemFields: [
        { key: 'name', label: 'Dish name', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'price', label: 'Price', type: 'text' },
        { key: 'image', label: 'Thumbnail', type: 'image' },
      ],
    },
  ],
};

export default schema;
