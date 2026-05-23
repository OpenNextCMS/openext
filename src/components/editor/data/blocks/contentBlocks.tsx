import React from 'react';
import {
  Type,
  Heading2,
  Hash,
  Activity,
  Clock,
  MousePointer2,
  Sparkles,
  Keyboard,
  CircleDot,
  SquareCheck,
  UserCircle,
  Minus,
  Loader2,
  ToggleRight,
  Table2,
  PanelTop,
  Image as ImageIcon,
  CreditCard,
  Waves,
  LayoutGrid,
} from 'lucide-react';
import { Block } from '@/types/index';
import { ReactNode } from 'react';

type BlockWithReactNodeIcon = Omit<Block, 'icon'> & {
  icon: ReactNode;
};

export const contactBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'contact-ui',
    label: 'Contact UI',
    type: 'contact',
    content: JSON.stringify({
      title: 'Feedback',
      description: 'Post-ironic portland shabby chic echo park, banjo fashion axe',
      buttonText: 'Submit Feedback',
      footerText: 'Chicharrones blog helvetica normcore iceland tousled brook viral artisan.',
      mapUrl: 'https://maps.google.com/maps?width=100%&height=600&hl=en&q=%C4%B0zmir+(My%20Business%20Name)&ie=UTF8&t=&z=14&iwloc=B&output=embed'
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Contact section with Maps and form',
    style: {
      width: '100%',
    },
  },
  {
    id: 'contact-simple',
    label: 'Contact Simple',
    type: 'contact-simple',
    content: JSON.stringify({
      title: 'Contact Us',
      description: 'Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify.',
      buttonText: 'Send Message',
      email: 'example@email.com',
      address: '49 Smith St.',
      city: 'Saint Cloud, MN 56301'
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Centered contact form with details',
    style: {
      width: '100%',
    },
  },
];

export const featuresBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'feature-trio',
    label: 'Feature Trio',
    type: 'feature-trio',
    content: JSON.stringify({
      mainTitle: 'Raw Denim Heirloom Man Braid\nSelfies Wayfarers',
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.' },
        { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard ugh iceland kickstarter tumblr live-edge tilde.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Three horizontal feature columns with icons',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-vertical',
    label: 'Feature Vertical',
    type: 'feature-vertical',
    content: JSON.stringify({
      mainTitle: 'Raw Denim Heirloom Man Braid',
      mainDescription: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.',
      buttonText: 'Action Button',
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
        { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug VHS try-hard.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Vertical feature grid with icons and header',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-side-image',
    label: 'Feature Side Image',
    type: 'feature-side-image',
    content: JSON.stringify({
      image: 'https://dummyimage.com/460x500',
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Side image with vertical features',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-horizontal',
    label: 'Feature Horizontal',
    type: 'feature-horizontal',
    content: JSON.stringify({
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Side-by-side feature cards with icons',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-boxed',
    label: 'Feature Boxed',
    type: 'feature-boxed',
    content: JSON.stringify({
      eyebrow: 'ROOF PARTY POLAROID',
      mainTitle: 'Master Cleanse Reliac Heirloom',
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'Neptune', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Boxed feature grid with icons and header',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-zigzag',
    label: 'Feature Zigzag',
    type: 'feature-zigzag',
    content: JSON.stringify({
      linkText: 'Learn More',
      buttonText: 'Action Button',
      features: [
        { title: 'Shooting Stars', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'The Catalyzer', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
        { title: 'The 400 Blows', description: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Vertical zigzag feature list with icons',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-checklist',
    label: 'Feature Checklist',
    type: 'feature-checklist',
    content: JSON.stringify({
      mainTitle: 'Raw Denim Heirloom Man Braid',
      mainDescription: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.',
      buttonText: 'Action Button',
      items: [
        'Authentic Cliche Forage',
        'Kinfolk Chips Snackwave',
        'Coloring Book Ethical',
        'Typewriter Polaroid Cray',
        'Pack Truffaut Blue',
        'The Catcher In The Rye',
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Checklist style feature list',
    style: {
      width: '100%',
    },
  },
  {
    id: 'feature-list',
    label: 'Feature List',
    type: 'feature-list',
    content: JSON.stringify({
      mainTitle: 'Raw Denim Heirloom Man Braid',
      mainDescription: 'Blue bottle crucifix vinyl post-ironic four dollar toast vegan taxidermy. Gastropub indxgo juice poutine, ramps microdosing banh mi pug.',
      buttonText: 'Action Button',
      categories: [
        { title: 'SHOOTING STARS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'THE 400 BLOWS', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'THE CATALYZER', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
        { title: 'NEPTUNE', links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link'] },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Categorized links with checkmarks',
    style: {
      width: '100%',
    },
  },
];

export const contentBlocks: BlockWithReactNodeIcon[] = [
  {
    id: 'text',
    label: 'Text Block',
    type: 'text',
    content: 'Demo Data for Text Block',
    icon: <Type className="h-4 w-4 mr-2 text-primary" />,
    description: 'Regular paragraph text',
    style: {
      padding: '25px 20px 25px 20px',
      margin: '5px 2px 5px 2px',
      border: '5px solid rgb(6, 28, 70)',
      boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      textShadow: '3px 3px 6px rgba(0,0,0,0.7)',
      transition: 'all 0.2s ease-in-out',
      display: 'flex',
      justifyContent: 'flex-start',
      textAlign: 'right',
      backgroundColor: 'rgb(228, 27, 64)',
      textTransform: 'lowercase',
    },
  },
  {
    id: 'heading',
    label: 'Heading Block',
    type: 'text',
    content: 'Heading Block',
    icon: <Heading2 className="h-4 w-4 mr-2 text-primary" />,
    description: 'Section heading',
    style: {
      padding: '50px 50px 75px 100px',
      margin: '5px 2px 5px 2px',
      border: '3px dashed rgb(255, 0, 0)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
      transition: 'all 0.2s ease-in-out',
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: 'rgb(203, 180, 180)',
      fontFamily: 'Arial',
      fontSize: '24px',
      fontWeight: '600',
      fontStyle: 'italic',
      lineHeight: '1',
      letterSpacing: '1px',
      textAlign: 'center',
      textTransform: 'uppercase',
      textDecoration: 'underline',
      position: 'relative',
      top: '10px',
      right: '0px',
      bottom: '0px',
      left: '0px',
      zIndex: '2',
    },
  },
  {
    id: 'stats',
    label: 'Stats Block',
    type: 'stats',
    content: JSON.stringify({ value: '200+', label: 'Project Delivered' }),
    icon: <Hash className="h-4 w-4 mr-2 text-primary" />,
    description: 'Statistical counter with label',
    style: {
      backgroundColor: '#1f2937',
      padding: '20px',
      borderRadius: '8px',
    },
  },
  {
    id: 'progress',
    label: 'Progress Bar',
    type: 'progress',
    content: JSON.stringify({ label: 'Delivery Rate', percentage: 100 }),
    icon: <Activity className="h-4 w-4 mr-2 text-primary" />,
    description: 'Animated progress bar with percentage',
    style: {
      marginBottom: '10px',
    },
  },
  {
    id: 'countdown',
    label: 'Countdown Timer',
    type: 'countdown',
    content: JSON.stringify({ days: '0', hours: '00', minutes: '00', seconds: '00' }),
    icon: <Clock className="h-4 w-4 mr-2 text-primary" />,
    description: 'Timer with days, hours, mins, secs',
    style: {
      padding: '20px',
    },
  },
  {
    id: 'button',
    label: 'Button',
    type: 'button',
    content: 'Click Me',
    icon: <MousePointer2 className="h-4 w-4 mr-2 text-primary" />,
    description: 'Call to action button',
    style: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: '4px',
      padding: '8px 16px',
      fontWeight: '500',
    },
  },
  {
    id: 'icon',
    label: 'Icon Block',
    type: 'icon',
    content: 'sparkles',
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Standalone decorative or feature icon',
    style: {
      color: '#ffffff',
      width: '96px',
      height: '96px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  {
    id: 'input',
    label: 'Input Box',
    type: 'input',
    content: JSON.stringify({
      label: 'Your Name',
      placeholder: 'Enter your name',
      name: 'your_name',
      inputType: 'text',
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginBottom: '6px',
        textAlign: 'left',
      },
    }),
    icon: <Keyboard className="h-4 w-4 mr-2 text-primary" />,
    description: 'Input field for website visitor text',
    style: {
      width: '100%',
      padding: '12px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'radio',
    label: 'Radio Button',
    type: 'radio',
    content: JSON.stringify({
      label: 'Radio option',
      name: 'radio_group',
      value: 'radio_option',
      checked: false,
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '8px',
        textAlign: 'left',
      },
    }),
    icon: <CircleDot className="h-4 w-4 mr-2 text-primary" />,
    description: 'Single radio option for website visitor selection',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'checkbox',
    label: 'Check Button',
    type: 'checkbox',
    content: JSON.stringify({
      label: 'I agree',
      name: 'agreement',
      value: 'yes',
      checked: false,
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '8px',
        textAlign: 'left',
      },
    }),
    icon: <SquareCheck className="h-4 w-4 mr-2 text-primary" />,
    description: 'Checkbox field for website visitor confirmation',
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#111827',
      fontSize: '16px',
      lineHeight: '1.4',
    },
  },
  {
    id: 'avatar',
    label: 'Avatar',
    type: 'avatar',
    content: JSON.stringify({
      src: '',
      alt: 'User avatar',
      fallback: 'AT',
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI avatar',
    style: {
      width: '48px',
      height: '48px',
    },
  },
  {
    id: 'separator',
    label: 'Separator',
    type: 'separator',
    content: JSON.stringify({
      orientation: 'horizontal',
    }),
    icon: <Minus className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI separator line',
    style: {
      width: '100%',
      height: '1px',
    },
  },
  {
    id: 'skeleton',
    label: 'Skeleton',
    type: 'skeleton',
    content: JSON.stringify({
      label: '',
    }),
    icon: <Loader2 className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI loading placeholder',
    style: {
      width: '100%',
      height: '48px',
    },
  },
  {
    id: 'switch',
    label: 'Switch',
    type: 'switch',
    content: JSON.stringify({
      label: 'Enable option',
      name: 'enable_option',
      checked: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginLeft: '10px',
      },
    }),
    icon: <ToggleRight className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI switch control',
    style: {
      display: 'flex',
      alignItems: 'center',
    },
  },
  {
    id: 'textarea',
    label: 'Textarea',
    type: 'textarea',
    content: JSON.stringify({
      label: 'Message',
      placeholder: 'Enter your message',
      name: 'message',
      value: '',
      required: false,
      labelStyle: {
        color: '#111827',
        fontSize: '14px',
        fontWeight: '500',
        lineHeight: '1.4',
        marginBottom: '6px',
      },
    }),
    icon: <Type className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI textarea input',
    style: {
      width: '100%',
      minHeight: '120px',
    },
  },
  {
    id: 'table',
    label: 'Table',
    type: 'table',
    content: JSON.stringify({
      caption: 'Service overview',
      headers: ['Service', 'Timeline', 'Status'],
      rows: [
        ['Website', '2 weeks', 'Active'],
        ['Mobile App', '4 weeks', 'Planned'],
      ],
    }),
    icon: <Table2 className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI table',
    style: {
      width: '100%',
    },
  },
  {
    id: 'tabs',
    label: 'Tabs',
    type: 'tabs',
    content: JSON.stringify({
      defaultValue: 'overview',
      tabs: [
        { value: 'overview', label: 'Overview', content: 'Overview content goes here.' },
        { value: 'details', label: 'Details', content: 'Details content goes here.' },
      ],
    }),
    icon: <PanelTop className="h-4 w-4 mr-2 text-primary" />,
    description: 'Reusable UI tabs',
    style: {
      width: '100%',
    },
  },
  {
    id: 'image',
    label: 'Image Block',
    type: 'image',
    content: JSON.stringify({
      src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
      alt: 'Office workspace',
      caption: '',
    }),
    icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" />,
    description: 'Responsive image with alt text and optional caption',
    style: {
      width: '100%',
      height: '220px',
      borderRadius: '8px',
    },
  },
  {
    id: 'card',
    label: 'Card Block',
    type: 'card',
    content: JSON.stringify({
      image:
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      eyebrow: 'Platform',
      title: 'Web Development',
      body: 'Build responsive sections, service cards, and rich content blocks with reusable editor elements.',
      buttonText: 'Read More',
    }),
    icon: <CreditCard className="h-4 w-4 mr-2 text-primary" />,
    description: 'Image, title, text, and call-to-action card',
    style: {
      backgroundColor: '#ffffff',
      color: '#111827',
      borderRadius: '8px',
    },
  },
  {
    id: 'shape-divider',
    label: 'Shape Divider',
    type: 'shape-divider',
    content: JSON.stringify({
      shape: 'wave',
      color: '#ffffff',
      height: 120,
      flip: false,
    }),
    icon: <Waves className="h-4 w-4 mr-2 text-primary" />,
    description: 'Wave, curve, or tilted section divider',
    style: {
      width: '100%',
    },
  },
  {
    id: 'statistics-main',
    label: 'Statistics Main',
    type: 'statistics-main',
    content: JSON.stringify({
      stats: [
        { value: '2.7K', label: 'Users' },
        { value: '1.8K', label: 'Subscribes' },
        { value: '35', label: 'Downloads' },
        { value: '4', label: 'Products' },
      ]
    }),
    icon: <Hash className="h-4 w-4 mr-2 text-primary" />,
    description: 'Grid of four statistics with labels',
    style: {
      width: '100%',
    },
  },
  {
    id: 'statistics-side-image',
    label: 'Statistics Side Image',
    type: 'statistics-side-image',
    content: JSON.stringify({
      title: 'Moon hashtag pop-up try-hard offal truffaut',
      description: 'Pour-over craft beer pug drinking vinegar live-edge gastropub, keytar neutra sustainable fingerstache kickstarter.',
      image: 'https://dummyimage.com/600x300',
      stats: [
        { value: '2.7K', label: 'Users' },
        { value: '1.8K', label: 'Subscribes' },
        { value: '35', label: 'Downloads' },
        { value: '4', label: 'Products' },
      ]
    }),
    icon: <Hash className="h-4 w-4 mr-2 text-primary" />,
    description: 'Statistics grid with header and side image',
    style: {
      width: '100%',
    },
  },
  {
    id: 'statistics-boxed',
    label: 'Statistics Boxed',
    type: 'statistics-boxed',
    content: JSON.stringify({
      mainTitle: 'Master Cleanse Reliac Heirloom',
      mainDescription: "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.",
      stats: [
        { value: '2.7K', label: 'Downloads', icon: 'cloud-download' },
        { value: '1.3K', label: 'Users', icon: 'users' },
        { value: '74', label: 'Files', icon: 'file-text' },
        { value: '46', label: 'Places', icon: 'map-pin' },
      ]
    }),
    icon: <Hash className="h-4 w-4 mr-2 text-primary" />,
    description: 'Boxed statistics grid with icons and header',
    style: {
      width: '100%',
    },
  },
  {
    id: 'testimonial-main',
    label: 'Testimonial Main',
    type: 'testimonial-main',
    content: JSON.stringify({
      mainTitle: 'Testimonials',
      testimonials: [
        { 
          text: "Synth chartreuse iPhone lomo cray raw denim brunch everyday carry neutra before they sold out fixie 90's microdosing. Tacos pinterest fanny pack venmo, post-ironic heirloom try-hard pabst authentic iceland.", 
          name: "Holden Caulfield", 
          role: "UI DEVELOPER",
          image: "https://dummyimage.com/106x106"
        },
        { 
          text: "Synth chartreuse iPhone lomo cray raw denim brunch everyday carry neutra before they sold out fixie 90's microdosing. Tacos pinterest fanny pack venmo, post-ironic heirloom try-hard pabst authentic iceland.", 
          name: "Alper Kamu", 
          role: "DESIGNER",
          image: "https://dummyimage.com/107x107"
        },
      ]
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Section with customer testimonials',
    style: {
      width: '100%',
    },
  },
  {
    id: 'testimonial-single',
    label: 'Testimonial Single',
    type: 'testimonial-single',
    content: JSON.stringify({
      text: "Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware. Man bun next level coloring book skateboard four loko knausgaard.",
      name: "HOLDEN CAULFIELD",
      role: "Senior Product Designer"
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Focused single person testimonial',
    style: {
      width: '100%',
    },
  },
  {
    id: 'testimonial-single-large',
    label: 'Testimonial Large',
    type: 'testimonial-single-large',
    content: JSON.stringify({
      text: "Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware. Man bun next level coloring book skateboard four loko knausgaard. Kitsch keffiyeh master cleanse direct trade indigo juice before they sold out gentrify plaid gastropub normcore XOXO 90's pickled cindigo jean shorts. Slow-carb next level shoindigoitch ethical authentic, yr scenester sriracha forage franzen organic drinking vinegar.",
      name: "HOLDEN CAULFIELD",
      role: "Senior Product Designer"
    }),
    icon: <UserCircle className="h-4 w-4 mr-2 text-primary" />,
    description: 'Large center-aligned single testimonial',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-features',
    label: 'Content Features',
    type: 'content-features',
    content: JSON.stringify({
      eyebrow: 'ROOF PARTY POLAROID',
      title: 'Master Cleanse Reliac Heirloom',
      description: "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.",
      buttonText: 'Get Started',
      linkText: 'Learn More',
      features: [
        { title: 'Shooting Stars', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { title: 'The Catalyzer', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { title: 'Neptune', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { title: 'Melanchole', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
      ]
    }),
    icon: <Sparkles className="h-4 w-4 mr-2 text-primary" />,
    description: 'Feature grid with descriptions',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-gallery',
    label: 'Content Gallery',
    type: 'content-gallery',
    content: JSON.stringify({
      mainTitle: 'Pitchfork Kickstarter Taxidermy',
      mainDescription: "Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table. Franzen you probably haven't heard of them man bun deep jianbing selfies heirloom prism food truck ugh squid celiac humblebrag.",
      items: [
        { image: 'https://dummyimage.com/720x400', subtitle: 'SUBTITLE', title: 'Chichen Itza', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { image: 'https://dummyimage.com/721x401', subtitle: 'SUBTITLE', title: 'Colosseum Roma', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { image: 'https://dummyimage.com/722x402', subtitle: 'SUBTITLE', title: 'Great Pyramid of Giza', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
        { image: 'https://dummyimage.com/723x403', subtitle: 'SUBTITLE', title: 'San Francisco', description: 'Fingerstache flexitarian street art 8-bit waistcoat. Distillery hexagon disrupt edison bulbche.' },
      ]
    }),
    icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" />,
    description: 'Grid of cards with images',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-icons',
    label: 'Content Icons',
    type: 'content-icons',
    content: JSON.stringify({
      title: 'Pitchfork Kickstarter Taxidermy',
      description: 'Whatever cardigan tote bag tumblr hexagon brooklyn asymmetrical gentrify, subway tile poke farm-to-table.',
      buttonText: 'Get Started',
      features: [
        { title: 'Shooting Stars', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'activity' },
        { title: 'The Catalyzer', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'sparkles' },
        { title: 'Neptune', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'user' },
        { title: 'Melanchole', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'flag' },
        { title: 'Bunker', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'moon' },
        { title: 'Ramona Falls', description: 'Fingerstache flexitarian street art 8-bit waist co, subway tile poke farm.', icon: 'shield' },
      ]
    }),
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Feature grid with icons',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-categories',
    label: 'Content Categories',
    type: 'content-categories',
    content: JSON.stringify({
      title: 'Pitchfork Kickstarter Taxidermy',
      description: 'Locavore cardigan small batch roof party blue bottle blog meggings sartorial jean shorts kickstarter migas sriracha church-key synth succulents. Actually taiyaki neutra, distillery gastropub pok pok ugh.',
      linkText: 'Learn More',
      categoryHeading: 'CATEGORIES',
      links: ['First Link', 'Second Link', 'Third Link', 'Fourth Link', 'Fifth Link', 'Sixth Link', 'Seventh Link', 'Eighth Link']
    }),
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Description with a list of links',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-detail',
    label: 'Content Detail',
    type: 'content-detail',
    content: JSON.stringify({
      heroImage: 'https://dummyimage.com/1200x500',
      authorName: 'Phoebe Caulfield',
      authorBio: 'Raclette knausgaard hella meggs normcore williamsburg enamel pin sartorial venmo tbh hot chicken gentrify portland.',
      authorImage: '',
      mainText: "Meggings portland fingerstache lyft, post-ironic fixie man bun banh mi umami everyday carry hexagon locavore direct trade art party. Locavore small batch listicle gastropub farm-to-table lumbersexual salvia messenger bag. Coloring book flannel truffaut craft beer drinking vinegar sartorial, disrupt fashion axe normcore meh butcher. Portland 90's scenester vexillologist forage post-ironic asymmetrical, chartreuse disrupt butcher paleo intelligentsia pabst before they sold out four loko. 3 wolf moon brooklyn.",
      linkText: 'Learn More'
    }),
    icon: <ImageIcon className="h-4 w-4 mr-2 text-primary" />,
    description: 'Hero image with author and text',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-split',
    label: 'Content Split',
    type: 'content-split',
    content: JSON.stringify({
      left: {
        image: 'https://dummyimage.com/1201x501',
        title: 'Buy YouTube Videos',
        description: 'Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.',
        buttonText: 'Button'
      },
      right: {
        image: 'https://dummyimage.com/1202x502',
        title: 'The Catalyzer',
        description: 'Williamsburg occupy sustainable snackwave gochujang. Pinterest cornhole brunch, slow-carb neutra irony.',
        buttonText: 'Button'
      }
    }),
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Side-by-side content cards',
    style: {
      width: '100%',
    },
  },
  {
    id: 'content-trio',
    label: 'Content Trio',
    type: 'content-trio',
    content: JSON.stringify({
      mainTitle: 'Space The Final Frontier',
      mainDescription: 'Street art subway tile salvia four dollar toast bitters selfies quinoa yuccie synth meditation iPhone intelligentsia prism tofu. Viral gochujang bitters dreamcatcher.',
      linkText: 'Learn More',
      items: [
        { image: 'https://dummyimage.com/1203x503', title: 'Shooting Stars', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
        { image: 'https://dummyimage.com/1204x504', title: 'The Catalyzer', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
        { image: 'https://dummyimage.com/1205x505', title: 'The 400 Blows', description: 'Swag shoivdigoitch literally meditation subway tile tumblr cold-pressed. Gastropub street art beard dreamcatcher neutra, ethical XOXO lumbersexual.' },
      ]
    }),
    icon: <LayoutGrid className="h-4 w-4 mr-2 text-primary" />,
    description: 'Header with three content columns',
    style: {
      width: '100%',
    },
  },
];
