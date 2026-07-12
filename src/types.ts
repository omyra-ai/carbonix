export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  description: string;
  detailedDescription: string;
  image: string;
  images: string[];
  specs: { label: string; value: string }[];
  featured?: boolean;
}

export interface Enquiry {
  id: string;
  productId: string;
  productName: string;
  productCategory: string;
  productPrice: number;
  productThumbnail: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  submittedAt: string;
  status: 'Pending' | 'Contacted';
}
