import React from 'react';
import { Heart, MessageSquare, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  onOpenEnquiry: (product: Product) => void;
}

export default function ProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  onSelectProduct,
  onOpenEnquiry,
}: ProductCardProps) {
  
  const handleWhatsAppEnquiry = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening product details
    
    const adminPhone = '15550199'; // Default demonstration admin number
    const messageText = `Hello! I am highly interested in making an enquiry for:

📦 PRODUCT SPECIFICS:
- Name: ${product.name}
- Category: ${product.category}
- Price: $${product.price}
- Brief: ${product.description}
- Photo Link: ${product.image}

Please provide information on availability, pricing negotiations, and courier shipping times. Thank you!`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedText}`;
    
    // Redirect to WhatsApp
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      id={`product-card-${product.id}`}
      onClick={() => onSelectProduct(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-border bg-white p-3 shadow-xs hover:shadow-md hover:border-brand-primary/35 transition-all cursor-pointer"
    >
      {/* Product Image Section */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-brand-neutral-light">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Wishlist Button (Heart) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product);
          }}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs shadow-sm hover:scale-110 active:scale-95 transition-all text-stone-500 hover:text-brand-primary"
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart
            className={`h-4 w-4 transition-all ${
              isWishlisted ? 'fill-brand-primary text-brand-primary scale-110' : 'text-stone-600'
            }`}
          />
        </button>

        {/* Category Tag */}
        <span className="absolute left-3 top-3 rounded-md bg-brand-primary px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-sm">
          {product.category}
        </span>
      </div>

      {/* Info Section */}
      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div>
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            <div className="flex text-brand-primary">
              {'★'.repeat(Math.round(product.rating))}
              <span className="text-stone-300">{'★'.repeat(5 - Math.round(product.rating))}</span>
            </div>
            <span className="font-mono text-[11px] font-bold text-stone-500">
              ({product.reviewsCount})
            </span>
          </div>

          {/* Name & Title */}
          <h3 className="mt-2 font-sans text-base font-extrabold text-brand-text group-hover:text-brand-primary transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Intro Description */}
          <p className="mt-1 font-sans text-xs text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Actions Row */}
        <div className="mt-4 pt-3 border-t border-brand-border">
          <div className="flex items-baseline justify-between mb-3">
            <span className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold">
              Price
            </span>
            <span className="font-mono text-lg font-bold text-brand-text">
              ${product.price}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* WhatsApp enquiry */}
            <button
              onClick={handleWhatsAppEnquiry}
              className="flex items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50 py-2.5 font-sans text-xs font-bold text-emerald-700 transition-colors active:scale-[0.98] cursor-pointer"
              title="Enquire on WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            {/* Form enquiry */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenEnquiry(product);
              }}
              className="flex items-center justify-center gap-1 rounded-lg bg-brand-primary hover:bg-brand-primary-hover py-2.5 font-sans text-xs font-bold text-white transition-colors active:scale-[0.98] cursor-pointer shadow-sm shadow-brand-primary/10"
              title="Send Digital Enquiry Form"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Enquire Now</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
