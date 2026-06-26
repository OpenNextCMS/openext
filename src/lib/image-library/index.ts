/**
 * Categorized image library for the Website Setup Wizard.
 *
 * Curated Unsplash CDN URLs grouped by business "bucket". The generator pulls
 * deterministically (indexed by block position) so re-running produces the same
 * site. Selected images populate Hero, Feature, Gallery and Product blocks.
 *
 * URLs use Unsplash's image CDN with sizing params (`w`, `q`, `auto=format`)
 * so they load fast and need no local assets.
 */

export type ImageBucket =
  | 'saas'
  | 'agency'
  | 'ecommerce'
  | 'restaurant'
  | 'healthcare'
  | 'realEstate'
  | 'portfolio'
  | 'corporate'
  | 'education'
  | 'fitness';

export interface ImageSet {
  hero: string[];
  feature: string[];
  gallery: string[];
  product: string[];
}

const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

export const IMAGE_LIBRARY: Record<ImageBucket, ImageSet> = {
  saas: {
    hero: [u('1551434678-e076c223a692'), u('1531403009284-440f080d1e12'), u('1460925895917-afdab827c52f')],
    feature: [u('1517245386807-bb43f82c33c4'), u('1542744173-8e7e53415bb0'), u('1504384308090-c894fdcc538d')],
    gallery: [u('1551288049-bebda4e38f71'), u('1556761175-5973dc0f32e7'), u('1551434678-e076c223a692')],
    product: [u('1517336714731-489689fd1ca8'), u('1593642632823-8f785ba67e45'), u('1498050108023-c5249f4df085')],
  },
  agency: {
    hero: [u('1552664730-d307ca884978'), u('1522071820081-009f0129c71c'), u('1542744173-8e7e53415bb0')],
    feature: [u('1556761175-5973dc0f32e7'), u('1521737604893-d14cc237f11d'), u('1600880292203-757bb62b4baf')],
    gallery: [u('1531538606174-0f90ff5dce83'), u('1517048676732-d65bc937f952'), u('1522202176988-66273c2fd55f')],
    product: [u('1460925895917-afdab827c52f'), u('1611224923853-80b023f02d71'), u('1551434678-e076c223a692')],
  },
  ecommerce: {
    hero: [u('1556742049-0cfed4f6a45d'), u('1483985988355-763728e1935b'), u('1441986300917-64674bd600d8')],
    feature: [u('1472851294608-062f824d29cc'), u('1607082348824-0a96f2a4b9da'), u('1556905055-8f358a7a47b2')],
    gallery: [u('1490481651871-ab68de25d43d'), u('1445205170230-053b83016050'), u('1525507119028-ed4c629a60a3')],
    product: [u('1542291026-7eec264c27ff'), u('1523275335684-37898b6baf30'), u('1505740420928-5e560c06d30e')],
  },
  restaurant: {
    hero: [u('1517248135467-4c7edcad34c4'), u('1414235077428-338989a2e8c0'), u('1555396273-367ea4eb4db5')],
    feature: [u('1504674900247-0877df9cc836'), u('1466637574441-749b8f19452f'), u('1540189549336-e6e99c3679fe')],
    gallery: [u('1559339352-11d035aa65de'), u('1565299624946-b28f40a0ae38'), u('1551782450-a2132b4ba21d')],
    product: [u('1565958011703-44f9829ba187'), u('1568901346375-23c9450c58cd'), u('1571091718767-18b5b1457add')],
  },
  healthcare: {
    hero: [u('1576091160550-2173dba999ef'), u('1505751172876-fa1923c5c528'), u('1538108149393-fbbd81895907')],
    feature: [u('1579684385127-1ef15d508118'), u('1551601651-2a8555f1a136'), u('1582750433449-648ed127bb54')],
    gallery: [u('1631217868264-e5b90bb7e133'), u('1530497610245-94d3c16cda28'), u('1519494026892-80bbd2d6fd0d')],
    product: [u('1587854692152-cbe660dbde88'), u('1576091160399-112ba8d25d1d'), u('1559757148-5c350d0d3c56')],
  },
  realEstate: {
    hero: [u('1560518883-ce09059eeffa'), u('1564013799919-ab600027ffc6'), u('1512917774080-9991f1c4c750')],
    feature: [u('1570129477492-45c003edd2be'), u('1600585154340-be6161a56a0c'), u('1600596542815-ffad4c1539a9')],
    gallery: [u('1600607687939-ce8a6c25118c'), u('1600566753086-00f18fb6b3ea'), u('1493809842364-78817add7ffb')],
    product: [u('1605276374104-dee2a0ed3cd6'), u('1568605114967-8130f3a36994'), u('1576941089067-2de3c901e126')],
  },
  portfolio: {
    hero: [u('1499951360447-b19be8fe80f5'), u('1467232004584-a241de8bcf5d'), u('1506744038136-46273834b3fb')],
    feature: [u('1558655146-9f40138edfeb'), u('1561070791-2526d30994b5'), u('1517694712202-14dd9538aa97')],
    gallery: [u('1545235617-9465d2a55698'), u('1507842217343-583bb7270b66'), u('1497366216548-37526070297c')],
    product: [u('1502945015378-0e284ca1a5be'), u('1500964757637-c85e8a162699'), u('1519681393784-d120267933ba')],
  },
  corporate: {
    hero: [u('1486406146926-c627a92ad1ab'), u('1497215728101-856f4ea42174'), u('1454165804606-c3d57bc86b40')],
    feature: [u('1521737604893-d14cc237f11d'), u('1600880292089-90a7e086ee0c'), u('1542744095-291d1f67b221')],
    gallery: [u('1531973576160-7125cd663d86'), u('1600891964599-f61ba0e24092'), u('1497366811353-6870744d04b2')],
    product: [u('1554469384-e58fac16e23a'), u('1556761175-b413da4baf72'), u('1573164713988-8665fc963095')],
  },
  education: {
    hero: [u('1523050854058-8df90110c9f1'), u('1503676260728-1c00da094a0b'), u('1513258496099-48168024aec0')],
    feature: [u('1522202176988-66273c2fd55f'), u('1488190211105-8b0e65b80b4e'), u('1427504494785-3a9ca7044f45')],
    gallery: [u('1509062522246-3755977927d7'), u('1497633762265-9d179a990aa6'), u('1434030216411-0b793f4b4173')],
    product: [u('1456513080510-7bf3a84b82f8'), u('1532012197267-da84d127e765'), u('1524995997946-a1c2e315a42f')],
  },
  fitness: {
    hero: [u('1534438327276-14e5300c3a48'), u('1571019613454-1cb2f99b2d8b'), u('1538805060514-97d9cc17730c')],
    feature: [u('1517836357463-d25dfeac3438'), u('1574680096145-d05b474e2155'), u('1518611012118-696072aa579a')],
    gallery: [u('1540497077202-7c8a3999166f'), u('1571902943202-507ec2618e8f'), u('1599058917212-d750089bc07e')],
    product: [u('1581009146145-b5ef050c2e1e'), u('1526506118085-60ce8714f8c5'), u('1583454110551-21f2fa2afe61')],
  },
};

/** Map the 17 business categories to an image bucket. */
const CATEGORY_TO_BUCKET: Record<string, ImageBucket> = {
  'Marketing Agency': 'agency',
  'Software Company': 'saas',
  'AI Startup': 'saas',
  Restaurant: 'restaurant',
  'Coffee Shop': 'restaurant',
  'Dental Clinic': 'healthcare',
  'Real Estate Agency': 'realEstate',
  'Construction Company': 'corporate',
  'Law Firm': 'corporate',
  'Consulting Firm': 'corporate',
  'Fitness Studio': 'fitness',
  'Ecommerce Store': 'ecommerce',
  'Fashion Brand': 'ecommerce',
  'Personal Portfolio': 'portfolio',
  Photographer: 'portfolio',
  Designer: 'portfolio',
  Developer: 'saas',
};

/** Map website types to a bucket (fallback when category is unknown). */
const WEBSITE_TYPE_TO_BUCKET: Record<string, ImageBucket> = {
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

/**
 * Resolve the image set for a business. Prefers the specific business category,
 * then the website type, then a safe default (corporate).
 */
export function getImagesForBusiness(
  businessCategory: string,
  websiteType: string
): ImageSet {
  const bucket =
    CATEGORY_TO_BUCKET[businessCategory] ??
    WEBSITE_TYPE_TO_BUCKET[websiteType] ??
    'corporate';
  return IMAGE_LIBRARY[bucket];
}

/** Deterministic pick from a list by index (wraps around). */
export function pickImage(list: string[], index: number): string {
  if (!list.length) return '';
  return list[index % list.length];
}
