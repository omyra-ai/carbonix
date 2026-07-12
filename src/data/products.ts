import { Product } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    name: 'Aether Mechanical Keyboard',
    category: 'Workspace',
    price: 249,
    rating: 4.9,
    reviewsCount: 42,
    description: 'An elegant, tactile mechanical keyboard crafted with an anodized aluminum case and custom dampened linear switches.',
    detailedDescription: 'Engineered for both aesthetic perfectionists and professional typists, the Aether features a seamless 75% layout, hot-swappable custom linear switches, and premium double-shot PBT keycaps. Precision-milled aluminum chassis with solid walnut accent strip on the crown. It connects via an exquisite custom braided USB-C cable or low-latency dual-band wireless.',
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Form Factor', value: '75% Compact layout' },
      { label: 'Switch Type', value: 'Aether Linear Cream (Pre-lubed)' },
      { label: 'Case Material', value: 'Anodized 6063 Aluminum & Walnut' },
      { label: 'Connectivity', value: 'Wired USB-C, 2.4Ghz, & Bluetooth 5.1' },
      { label: 'Backlight', value: 'Subtle warm-white LED (Under-glow)' }
    ],
    featured: true
  },
  {
    id: 'prod_2',
    name: 'Horizon Minimalist Watch',
    category: 'Wearables',
    price: 389,
    rating: 4.8,
    reviewsCount: 28,
    description: 'A striking luxury timepiece combining Swiss movement precision with a hyper-minimalist titanium sandblasted dial.',
    detailedDescription: 'The Horizon timepiece challenges the complexity of modern watches. Built around a Swiss quartz caliber movement, it is housed in a medical-grade titanium casing that is both featherlight and scratch-resistant. Features a double-domed anti-reflective sapphire crystal face and a premium, vegetable-tanned full-grain Italian leather strap that ages beautifully with time.',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Movement', value: 'Swiss Ronda Quartz Caliber' },
      { label: 'Case Diameter', value: '40mm' },
      { label: 'Case Material', value: 'Grade 5 Titanium' },
      { label: 'Glass', value: 'Double-domed Sapphire Crystal' },
      { label: 'Strap', value: '20mm Italian Full-grain Leather (Quick release)' },
      { label: 'Water Resistance', value: '5 ATM (50 Meters)' }
    ],
    featured: true
  },
  {
    id: 'prod_3',
    name: 'Aura Matte Ceramic Lamp',
    category: 'Home Decor',
    price: 180,
    rating: 4.7,
    reviewsCount: 34,
    description: 'A hand-thrown raw stoneware table lamp casting a deeply cozy ambient light through a warm linen woven shade.',
    detailedDescription: 'Designed to elevate your bedtime routine, the Aura Lamp is hand-thrown by master artisans in small batches. The base features a matte, textured oatmeal ceramic finish that showcases beautiful raw mineral speckles. Paired with a premium Belgian linen tapered drum shade, it filters harsh light into an exceptionally cozy, warm glowing aura.',
    image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Height', value: '18 inches (45.7 cm)' },
      { label: 'Base Material', value: 'Artisanal Hand-thrown Stoneware' },
      { label: 'Shade', value: '100% Belgian Linen' },
      { label: 'Bulb Requirement', value: 'E26 Max 60W (Includes warm LED smart bulb)' },
      { label: 'Cord', value: '6ft Braided Khaki Fabric with Dimmer Switch' }
    ]
  },
  {
    id: 'prod_4',
    name: 'Nomad Leather Weekender',
    category: 'Style',
    price: 495,
    rating: 4.9,
    reviewsCount: 19,
    description: 'A rugged yet refined duffle bag handcrafted from oil-waxed pull-up leather, spacious enough for a three-day escape.',
    detailedDescription: 'The Nomad Leather Weekender is the ultimate travel companion for discerning travelers. Crafted using 5oz full-grain pull-up leather, this bag will develop an exquisite, personalized patina. Features heavyweight solid brass hardware, YKK Excella zippers, water-resistant canvas lining, a dedicated padded 16" laptop slot, and a ventilated shoe compartment.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Dimensions', value: '21" L x 11.5" W x 10" H' },
      { label: 'Volume', value: '40 Liters' },
      { label: 'Leather Type', value: 'Oil-waxed Full-Grain Pull-Up Leather' },
      { label: 'Hardware', value: 'Solid Sand-cast Brass' },
      { label: 'Lining', value: '12oz Water-resistant Cotton Duck Canvas' }
    ],
    featured: true
  },
  {
    id: 'prod_5',
    name: 'Sonos Audiophile Over-Ear',
    category: 'Audio',
    price: 549,
    rating: 4.9,
    reviewsCount: 56,
    description: 'Reference-grade wireless active noise-cancelling headphones featuring custom-tuned 40mm dynamic drivers.',
    detailedDescription: 'Immerse yourself in acoustic perfection. The Sonos Over-Ear is designed with a state-of-the-art hybrid ANC processor that isolates you from the outside world without coloring your music. Utilizing planar-magnetic-inspired custom voice coils, it delivers crystalline highs, warm organic mids, and distortion-free sub-bass. The memory-foam ear cups are wrapped in premium lambskin leather for all-day comfort.',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Driver Size', value: '40mm Custom Dynamic Transducers' },
      { label: 'Frequency Response', value: '4Hz - 40,000Hz' },
      { label: 'Battery Life', value: 'Up to 30 hours (ANC Active)' },
      { label: 'Charging', value: 'USB-C Fast Charging (5 min = 3 hrs)' },
      { label: 'Audio Codecs', value: 'LDAC, AAC, aptX Adaptive, SBC' }
    ]
  },
  {
    id: 'prod_6',
    name: 'Lumina Smart Diffuser',
    category: 'Wellness',
    price: 110,
    rating: 4.6,
    reviewsCount: 15,
    description: 'An ultrasonic cold-mist aromatherapy diffuser clad in hand-carved white ash wood and opaque frosted glass.',
    detailedDescription: 'The Lumina Diffuser infuses your space with calm and clean scent profiles. Housing a proprietary high-frequency ultrasonic plate, it disperses pure essential oils in a fine mist without burning or heating, preserving their therapeutic compounds. Includes a subtle glowing ring that pulses slowly to guide mindful breathing exercises.',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519669556878-63bdad8a1a49?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Water Capacity', value: '180 ml' },
      { label: 'Coverage Area', value: 'Up to 500 sq ft' },
      { label: 'Base Wood', value: 'FSC-Certified Premium White Ash' },
      { label: 'Mist Modes', value: 'Continuous (4 hours) / Intermittent (8 hours)' },
      { label: 'Dimensions', value: '3.6" Diameter x 7.2" Height' }
    ]
  },
  {
    id: 'prod_7',
    name: 'Mono Double-Walled Espresso Cup',
    category: 'Kitchen',
    price: 45,
    rating: 4.8,
    reviewsCount: 22,
    description: 'A pair of ultra-lightweight borosilicate glass cups that keep espresso hot while staying completely cool to the touch.',
    detailedDescription: 'Sip your morning double shot in ultimate sophistication. Designed in Scandinavia, the Mono glass is mouth-blown from food-grade borosilicate glass. The double-walled vacuum insulation keeps liquids at the perfect temperature while preventing condensation on the exterior. Features an ergonomic lip contour and a subtle internal aesthetic refraction.',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Capacity', value: '90ml (3.0 fl oz) each' },
      { label: 'Quantity', value: 'Set of 2' },
      { label: 'Material', value: 'Mouth-blown Borosilicate Glass' },
      { label: 'Care', value: 'Dishwasher & Microwave safe' }
    ]
  },
  {
    id: 'prod_8',
    name: 'Zen Solid Walnut Monitor Stand',
    category: 'Workspace',
    price: 135,
    rating: 4.8,
    reviewsCount: 31,
    description: 'A beautiful, solid black walnut desk shelf designed to elevate your display and keep your workspace perfectly organized.',
    detailedDescription: 'Reclaim your workspace peace. Handcrafted from single-sourced sustainable American Black Walnut, the Zen Shelf brings warmth and architectural clean lines to any desk setup. Standing on durable steel legs finished with smooth merino wool pads, it lifts your monitor to eye level for optimal posture while creating a dedicated cubby underneath to stow away your mechanical keyboard or notebook.',
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80'
    ],
    specs: [
      { label: 'Dimensions', value: '41" L x 9" W x 4.2" H' },
      { label: 'Weight Capacity', value: 'Up to 80 lbs (36 kg)' },
      { label: 'Wood Finish', value: 'Natural Linseed & Beeswax blend' },
      { label: 'Leg Material', value: 'Powder-coated Matte Black Carbon Steel' },
      { label: 'Protection', value: '100% Merino Wool Felt pad bottoms' }
    ]
  }
];
