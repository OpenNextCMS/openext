/**
 * Content Personalization Engine.
 *
 * Generates personalized copy for the starter website from the wizard inputs.
 * This is 100% deterministic template interpolation — NO AI and NO network. The
 * same inputs always produce the same content, so generation is reproducible.
 *
 * The output bundle is consumed by the block factory (src/services/blockFactory.ts),
 * which maps each slice onto the content fields a given CMS block expects.
 */

export interface PersonalizeInput {
  businessName: string;
  businessCategory: string;
  businessDescription: string;
  targetAudience: string;
  location?: string;
  websiteType: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string;
}

export interface StatItem {
  value: string;
  label: string;
  icon: string;
}

export interface TestimonialItem {
  text: string;
  name: string;
  role: string;
}

export interface GalleryItem {
  title: string;
  subtitle: string;
  description: string;
}

export interface PersonalizedContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCTA: string;
  heroSecondaryCTA: string;

  sectionTitle: string;
  features: FeatureItem[];
  statistics: StatItem[];
  testimonials: TestimonialItem[];

  galleryTitle: string;
  galleryItems: GalleryItem[];

  categories: string[];
  products: { title: string; category: string; price: string }[];

  aboutTitle: string;
  aboutContent: string;

  contactHeading: string;
  contactDescription: string;
  contactCTA: string;
}

/* ------------------------- copy banks by bucket ------------------------- */

type CopyBucket =
  | 'agency'
  | 'saas'
  | 'ecommerce'
  | 'portfolio'
  | 'corporate'
  | 'restaurant'
  | 'realEstate'
  | 'healthcare'
  | 'education';

const CATEGORY_TO_COPY: Record<string, CopyBucket> = {
  'Marketing Agency': 'agency',
  'Software Company': 'saas',
  'AI Startup': 'saas',
  Developer: 'saas',
  Restaurant: 'restaurant',
  'Coffee Shop': 'restaurant',
  'Dental Clinic': 'healthcare',
  'Real Estate Agency': 'realEstate',
  'Construction Company': 'corporate',
  'Law Firm': 'corporate',
  'Consulting Firm': 'corporate',
  'Fitness Studio': 'healthcare',
  'Ecommerce Store': 'ecommerce',
  'Fashion Brand': 'ecommerce',
  'Personal Portfolio': 'portfolio',
  Photographer: 'portfolio',
  Designer: 'portfolio',
};

const WEBSITE_TYPE_TO_COPY: Record<string, CopyBucket> = {
  agency: 'agency',
  saas: 'saas',
  ecommerce: 'ecommerce',
  portfolio: 'portfolio',
  'personal-brand': 'portfolio',
  corporate: 'corporate',
  restaurant: 'restaurant',
  'real-estate': 'realEstate',
  healthcare: 'healthcare',
  education: 'education',
};

interface CopyBank {
  heroTitle: (n: string) => string;
  heroCTA: string;
  features: { title: string; description: string; icon: string }[];
  statistics: StatItem[];
  testimonials: { text: string; name: string; role: string }[];
  categories: string[];
  galleryTitle: string;
  productNouns: string[];
}

const COPY: Record<CopyBucket, CopyBank> = {
  agency: {
    heroTitle: () => 'Grow Your Brand With Strategy That Delivers',
    heroCTA: 'Start a Project',
    features: [
      { title: 'Brand Strategy', description: 'We craft positioning and messaging that make your brand impossible to ignore.', icon: 'target' },
      { title: 'Creative Design', description: 'Beautiful, conversion-focused design across every touchpoint your customers see.', icon: 'pen-tool' },
      { title: 'Performance Marketing', description: 'Data-driven campaigns that turn attention into measurable revenue.', icon: 'trending-up' },
      { title: 'Content Production', description: 'Story-led content that builds trust and keeps your audience coming back.', icon: 'sparkles' },
      { title: 'Social Media', description: 'Always-on social that grows community and amplifies every launch.', icon: 'heart' },
      { title: 'Analytics & Insights', description: 'Clear reporting so you always know what is working and why.', icon: 'globe' },
    ],
    statistics: [
      { value: '250+', label: 'Brands Launched', icon: 'rocket' },
      { value: '98%', label: 'Client Retention', icon: 'heart' },
      { value: '4.2x', label: 'Avg. ROI Delivered', icon: 'trending-up' },
    ],
    testimonials: [
      { text: 'They transformed how the market sees us. Leads doubled within the first quarter.', name: 'Sarah Chen', role: 'VP Marketing' },
      { text: 'A true partner — strategic, creative, and relentlessly focused on results.', name: 'Marcus Reid', role: 'Founder' },
    ],
    categories: ['Branding', 'Web Design', 'Marketing', 'Content'],
    galleryTitle: 'Selected Work',
    productNouns: ['Brand Sprint', 'Campaign Package', 'Website Build', 'Content Retainer'],
  },
  saas: {
    heroTitle: () => 'Ship Faster With One Powerful Platform',
    heroCTA: 'Get Started Free',
    features: [
      { title: 'Lightning Fast', description: 'Built for speed so your team moves quickly and ships with confidence.', icon: 'zap' },
      { title: 'Secure by Default', description: 'Enterprise-grade security and compliance baked in from day one.', icon: 'shield-check' },
      { title: 'Powerful Automation', description: 'Automate the busywork and let your team focus on what matters.', icon: 'cpu' },
      { title: 'Real-time Analytics', description: 'Live dashboards that turn raw data into clear, actionable insight.', icon: 'trending-up' },
      { title: 'Seamless Integrations', description: 'Connects with the tools you already use in just a few clicks.', icon: 'globe' },
      { title: 'World-class Support', description: 'A responsive team ready to help whenever you need it.', icon: 'heart' },
    ],
    statistics: [
      { value: '10K+', label: 'Active Teams', icon: 'users' },
      { value: '99.9%', label: 'Uptime SLA', icon: 'shield-check' },
      { value: '24/7', label: 'Support', icon: 'clock' },
    ],
    testimonials: [
      { text: 'It replaced four tools and saved us hours every single week. Indispensable.', name: 'Priya Nair', role: 'Head of Operations' },
      { text: 'Onboarding took minutes and the impact was immediate across the whole team.', name: 'David Park', role: 'CTO' },
    ],
    categories: ['Product', 'Integrations', 'Security', 'Pricing'],
    galleryTitle: 'Built for Modern Teams',
    productNouns: ['Starter Plan', 'Pro Plan', 'Team Plan', 'Enterprise'],
  },
  ecommerce: {
    heroTitle: () => 'Discover Products You Will Love',
    heroCTA: 'Shop Now',
    features: [
      { title: 'Free Shipping', description: 'Fast, free delivery on every order — no minimums, no surprises.', icon: 'rocket' },
      { title: 'Easy Returns', description: '30-day hassle-free returns so you can shop with total confidence.', icon: 'check' },
      { title: 'Secure Checkout', description: 'Your payment details are always protected and encrypted.', icon: 'shield-check' },
      { title: 'Curated Quality', description: 'Every item is hand-picked for quality you can feel.', icon: 'star' },
      { title: 'Rewards Program', description: 'Earn points on every purchase and unlock exclusive perks.', icon: 'heart' },
      { title: 'Always Here', description: 'Friendly support whenever you need a hand with your order.', icon: 'phone' },
    ],
    statistics: [
      { value: '50K+', label: 'Happy Customers', icon: 'heart' },
      { value: '4.9★', label: 'Average Rating', icon: 'star' },
      { value: '24h', label: 'Fast Dispatch', icon: 'rocket' },
    ],
    testimonials: [
      { text: 'Beautiful products, fast shipping, and packaging that feels like a gift. Obsessed.', name: 'Emma Wilson', role: 'Verified Buyer' },
      { text: 'The quality exceeded my expectations. I have already ordered three more times.', name: 'James Carter', role: 'Verified Buyer' },
    ],
    categories: ['New Arrivals', 'Best Sellers', 'Collections', 'Sale'],
    galleryTitle: 'Featured Collection',
    productNouns: ['Signature Piece', 'Everyday Essential', 'Limited Edition', 'Bestseller'],
  },
  portfolio: {
    heroTitle: (n: string) => `Hi, I'm ${n} — I Build Things People Love`,
    heroCTA: 'View My Work',
    features: [
      { title: 'Thoughtful Design', description: 'Every project starts with the people who will actually use it.', icon: 'pen-tool' },
      { title: 'Clean Execution', description: 'Pixel-perfect, performant work delivered on time and on brief.', icon: 'check' },
      { title: 'Clear Communication', description: 'You always know where things stand — no jargon, no surprises.', icon: 'heart' },
    ],
    statistics: [
      { value: '80+', label: 'Projects Shipped', icon: 'rocket' },
      { value: '12', label: 'Years Experience', icon: 'clock' },
      { value: '40+', label: 'Happy Clients', icon: 'heart' },
    ],
    testimonials: [
      { text: 'A rare blend of taste and craft. The final work was better than I imagined.', name: 'Olivia Brooks', role: 'Startup Founder' },
      { text: 'Reliable, talented, and genuinely a pleasure to collaborate with.', name: 'Noah Bennett', role: 'Creative Director' },
    ],
    categories: ['Design', 'Development', 'Branding', 'Consulting'],
    galleryTitle: 'Recent Projects',
    productNouns: ['Case Study', 'Project', 'Collaboration', 'Experiment'],
  },
  corporate: {
    heroTitle: () => 'Trusted Expertise For Lasting Results',
    heroCTA: 'Talk to Us',
    features: [
      { title: 'Proven Experience', description: 'Decades of expertise guiding organizations through change.', icon: 'award' },
      { title: 'Tailored Solutions', description: 'Strategies built around your goals, not off-the-shelf templates.', icon: 'target' },
      { title: 'Dedicated Team', description: 'Senior specialists who stay with you from kickoff to delivery.', icon: 'users' },
      { title: 'Measurable Impact', description: 'We define success up front and report against it transparently.', icon: 'trending-up' },
      { title: 'Global Reach', description: 'Local insight backed by a worldwide network of partners.', icon: 'globe' },
      { title: 'Long-term Partnership', description: 'We invest in relationships that compound in value over time.', icon: 'shield-check' },
    ],
    statistics: [
      { value: '500+', label: 'Clients Served', icon: 'users' },
      { value: '30+', label: 'Years of Trust', icon: 'award' },
      { value: '98%', label: 'Satisfaction', icon: 'heart' },
    ],
    testimonials: [
      { text: 'Their guidance was instrumental in our most important strategic decisions.', name: 'Robert Hale', role: 'CEO' },
      { text: 'Professional, rigorous, and always focused on our long-term success.', name: 'Linda Foster', role: 'COO' },
    ],
    categories: ['Consulting', 'Advisory', 'Implementation', 'Support'],
    galleryTitle: 'Case Studies',
    productNouns: ['Advisory Engagement', 'Strategy Workshop', 'Implementation', 'Retainer'],
  },
  restaurant: {
    heroTitle: () => 'Fresh Flavors, Made With Love',
    heroCTA: 'Reserve a Table',
    features: [
      { title: 'Seasonal Ingredients', description: 'We source the freshest local produce for every dish on the menu.', icon: 'sparkles' },
      { title: 'Crafted by Chefs', description: 'Every plate is prepared by our passionate, award-winning kitchen.', icon: 'award' },
      { title: 'Warm Atmosphere', description: 'A welcoming space designed for memorable moments together.', icon: 'heart' },
    ],
    statistics: [
      { value: '15+', label: 'Years Serving', icon: 'clock' },
      { value: '4.8★', label: 'Guest Rating', icon: 'star' },
      { value: '120+', label: 'Signature Dishes', icon: 'sparkles' },
    ],
    testimonials: [
      { text: 'The best meal we have had all year. Every course was a delight.', name: 'Sophia Martinez', role: 'Regular Guest' },
      { text: 'Incredible food and even better service. Already booking our return.', name: 'Daniel Kim', role: 'Food Blogger' },
    ],
    categories: ['Starters', 'Mains', 'Desserts', 'Drinks'],
    galleryTitle: 'From Our Kitchen',
    productNouns: ['Chef Special', 'House Favorite', 'Seasonal Dish', 'Tasting Menu'],
  },
  realEstate: {
    heroTitle: () => 'Find a Place You Will Love to Call Home',
    heroCTA: 'Browse Listings',
    features: [
      { title: 'Curated Listings', description: 'Hand-selected properties matched to your lifestyle and budget.', icon: 'star' },
      { title: 'Expert Agents', description: 'Local specialists who guide you through every step of the journey.', icon: 'users' },
      { title: 'Seamless Process', description: 'From first viewing to final keys, we make it effortless.', icon: 'check' },
    ],
    statistics: [
      { value: '1,200+', label: 'Homes Sold', icon: 'award' },
      { value: '$2B+', label: 'In Transactions', icon: 'trending-up' },
      { value: '20+', label: 'Years Local', icon: 'clock' },
    ],
    testimonials: [
      { text: 'They found us our dream home and made the whole process stress-free.', name: 'Grace Thompson', role: 'Home Buyer' },
      { text: 'Sold above asking in a week. Truly the experts in our market.', name: 'Henry Adams', role: 'Home Seller' },
    ],
    categories: ['Buy', 'Rent', 'Sell', 'Invest'],
    galleryTitle: 'Featured Properties',
    productNouns: ['Family Home', 'City Apartment', 'Luxury Villa', 'Investment Property'],
  },
  healthcare: {
    heroTitle: () => 'Compassionate Care You Can Trust',
    heroCTA: 'Book an Appointment',
    features: [
      { title: 'Expert Practitioners', description: 'Experienced, caring professionals dedicated to your wellbeing.', icon: 'heart' },
      { title: 'Modern Facilities', description: 'State-of-the-art equipment for accurate, comfortable care.', icon: 'shield-check' },
      { title: 'Personalized Plans', description: 'Treatment tailored to your unique needs and health goals.', icon: 'target' },
    ],
    statistics: [
      { value: '20K+', label: 'Patients Cared For', icon: 'heart' },
      { value: '4.9★', label: 'Patient Rating', icon: 'star' },
      { value: '15+', label: 'Specialists', icon: 'users' },
    ],
    testimonials: [
      { text: 'I felt genuinely cared for from the moment I walked in. Highly recommend.', name: 'Ava Robinson', role: 'Patient' },
      { text: 'Professional, gentle, and thorough. The best clinic experience I have had.', name: 'Liam Walsh', role: 'Patient' },
    ],
    categories: ['Services', 'Specialists', 'Wellness', 'Resources'],
    galleryTitle: 'Our Services',
    productNouns: ['Consultation', 'Wellness Plan', 'Specialist Visit', 'Health Check'],
  },
  education: {
    heroTitle: () => 'Learn Skills That Shape Your Future',
    heroCTA: 'Explore Courses',
    features: [
      { title: 'Expert Instructors', description: 'Learn from practitioners with real-world experience in their field.', icon: 'award' },
      { title: 'Flexible Learning', description: 'Study at your own pace, on any device, wherever you are.', icon: 'globe' },
      { title: 'Hands-on Projects', description: 'Build a portfolio with practical, job-ready coursework.', icon: 'pen-tool' },
    ],
    statistics: [
      { value: '30K+', label: 'Students Enrolled', icon: 'users' },
      { value: '95%', label: 'Completion Rate', icon: 'check' },
      { value: '200+', label: 'Courses', icon: 'star' },
    ],
    testimonials: [
      { text: 'The course changed my career. Practical, clear, and genuinely inspiring.', name: 'Mia Coleman', role: 'Graduate' },
      { text: 'Engaging instructors and a curriculum that actually prepares you for work.', name: 'Ethan Brooks', role: 'Student' },
    ],
    categories: ['Courses', 'Programs', 'Workshops', 'Resources'],
    galleryTitle: 'Popular Programs',
    productNouns: ['Beginner Course', 'Pro Track', 'Workshop', 'Certification'],
  },
};

function resolveBucket(category: string, websiteType: string): CopyBucket {
  return CATEGORY_TO_COPY[category] ?? WEBSITE_TYPE_TO_COPY[websiteType] ?? 'corporate';
}

/** Generate the personalized content bundle. Deterministic; no AI/network. */
export function personalizeContent(input: PersonalizeInput): PersonalizedContent {
  const name = (input.businessName || 'Your Business').trim();
  const bank = COPY[resolveBucket(input.businessCategory, input.websiteType)];
  const desc =
    (input.businessDescription || '').trim() ||
    `${name} delivers exceptional ${input.businessCategory.toLowerCase()} services.`;
  const audience = (input.targetAudience || '').trim();

  const heroSubtitle = audience
    ? `${desc} Built for ${audience.replace(/\.$/, '')}.`
    : desc;

  const galleryItems: GalleryItem[] = bank.productNouns.map((noun, i) => ({
    title: `${noun}`,
    subtitle: bank.categories[i % bank.categories.length],
    description: `A closer look at how ${name} approaches ${noun.toLowerCase()}.`,
  }));

  const basePrices = ['$29', '$49', '$79', '$129'];
  const products = bank.productNouns.map((noun, i) => ({
    title: noun,
    category: bank.categories[i % bank.categories.length],
    price: basePrices[i % basePrices.length],
  }));

  return {
    heroTitle: bank.heroTitle(name),
    heroSubtitle,
    heroCTA: bank.heroCTA,
    heroSecondaryCTA: 'Learn More',

    sectionTitle: `Why Choose ${name}`,
    features: bank.features,
    statistics: bank.statistics,
    testimonials: bank.testimonials,

    galleryTitle: bank.galleryTitle,
    galleryItems,

    categories: bank.categories,
    products,

    aboutTitle: `About ${name}`,
    aboutContent: `${desc}${audience ? ` We exist to serve ${audience.replace(/\.$/, '')}.` : ''} ${name} pairs deep expertise with a relentless focus on outcomes, partnering with you to turn ambitious goals into real, measurable results.`,

    contactHeading: 'Ready to Get Started?',
    contactDescription: `Let's talk about how ${name} can help you. Reach out and we'll get back to you within one business day.`,
    contactCTA: 'Contact Us',
  };
}
