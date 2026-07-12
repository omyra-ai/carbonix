import React from 'react';
import { ArrowLeft, Heart, MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Product } from '../types';

interface ProductDetailsProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (product: Product) => void;
  onBack: () => void;
  onOpenEnquiry: (product: Product) => void;
}

export default function ProductDetails({
  product,
  isWishlisted,
  onToggleWishlist,
  onBack,
  onOpenEnquiry,
}: ProductDetailsProps) {
  const [activeImage, setActiveImage] = useState(product.image);

  const handleWhatsAppEnquiry = () => {
    const adminPhone = '15550199'; // Default demonstration admin number
    const messageText = `Hello! I am highly interested in making an enquiry for:

📦 PRODUCT SPECIFICS:
- Name: ${product.name}
- Category: ${product.category}
- Price: $${product.price}
- Brief: ${product.description}
- Detailed Bio: ${product.detailedDescription}
- Photo Link: ${product.image}

Please let me know if it's currently in stock and how we can finalize this purchase enquiry. Thank you!`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${adminPhone}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      id="product-details-container"
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Back Button */}
      <button
        onClick={onBack}
        className="group flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-bold text-stone-600 shadow-xs hover:border-brand-primary hover:text-brand-primary transition-all active:scale-[0.98] cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-brand-primary" />
        <span>Back to Curations</span>
      </button>

      {/* Main Grid */}
      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-2">
        
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-brand-border bg-brand-neutral-light shadow-sm">
            <img
              src={activeImage}
              alt={product.name}
              className="h-full w-full object-cover transition-all duration-500"
              referrerPolicy="no-referrer"
            />
            
            {/* Wishlist toggle badge */}
            <button
              onClick={() => onToggleWishlist(product)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 backdrop-blur-xs shadow-md hover:scale-105 active:scale-95 transition-all text-stone-500 hover:text-brand-primary cursor-pointer"
            >
              <Heart
                className={`h-5 w-5 transition-transform duration-300 ${
                  isWishlisted ? 'fill-brand-primary text-brand-primary scale-110' : 'text-stone-700'
                }`}
              />
            </button>
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 bg-brand-neutral-light transition-all cursor-pointer ${
                    activeImage === img ? 'border-brand-primary scale-[0.98]' : 'border-brand-border hover:border-brand-primary/40'
                  }`}
                >
                  <img src={img} alt={`${product.name} alternate view ${idx + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Specifications & Purchasing Triggers */}
        <div className="flex flex-col justify-between">
          <div>
            {/* Category tag */}
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-brand-primary">
              {product.category}
            </span>

            {/* Title */}
            <h1 className="mt-2 font-sans text-3xl font-extrabold tracking-tight text-brand-text sm:text-4xl">
              {product.name}
            </h1>

            {/* Rating / Review Info */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex text-brand-primary text-lg">
                {'★'.repeat(Math.round(product.rating))}
                <span className="text-stone-300">{'★'.repeat(5 - Math.round(product.rating))}</span>
              </div>
              <span className="font-sans text-sm font-semibold text-stone-500">
                {product.rating} Rating ({product.reviewsCount} verified inquiries)
              </span>
            </div>

            {/* Price */}
            <div className="mt-6 flex items-baseline gap-3 rounded-2xl bg-brand-card p-5 border border-brand-border">
              <span className="font-sans text-xs uppercase tracking-wider text-stone-500 font-bold">
                Curated Price value:
              </span>
              <span className="font-mono text-3xl font-black text-brand-primary">
                ${product.price}
              </span>
              <span className="font-sans text-xs text-stone-400 ml-1">
                (Inclusive of courier delivery setup)
              </span>
            </div>

            {/* Long Descriptions */}
            <div className="mt-8">
              <h3 className="font-sans text-sm font-bold text-brand-text uppercase tracking-wider border-b border-brand-border pb-1">
                About the Piece
              </h3>
              <p className="mt-3 font-sans text-sm text-stone-600 leading-relaxed">
                {product.detailedDescription || product.description}
              </p>
            </div>

            {/* Specifications Bento-Grid / Table */}
            <div className="mt-8 border-t border-brand-border pt-8">
              <h3 className="font-sans text-sm font-bold text-brand-text uppercase tracking-wider mb-4">
                Technical Specifications
              </h3>
              <div className="grid grid-cols-1 gap-y-3.5 sm:grid-cols-2 sm:gap-x-8">
                {product.specs.map((spec, index) => (
                  <div
                    key={index}
                    className="flex flex-col py-2 border-b border-brand-border/40"
                  >
                    <span className="font-sans text-xs text-stone-400 font-bold">
                      {spec.label}
                    </span>
                    <span className="mt-1 font-sans text-sm font-semibold text-brand-text">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enquiry Call To Action (Bottom section) */}
          <div className="mt-10 rounded-2xl border-2 border-brand-primary bg-brand-text p-6 text-stone-100 shadow-md">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-brand-primary/20 p-2.5 text-brand-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-sans text-sm font-bold tracking-wide uppercase text-white">
                  Exclusive Order-By-Enquiry System
                </h4>
                <p className="mt-1 font-sans text-xs text-brand-neutral-light/85 leading-relaxed">
                  We don't support automated impersonal checkouts. Each of our high-end products is processed with direct custom engagement. Submit an enquiry below and the admin will personally reach back with customized pricing, courier schedules, and payment setups.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* WhatsApp Enquiry */}
              <button
                onClick={handleWhatsAppEnquiry}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-500 px-5 py-3.5 font-sans text-sm font-bold text-white shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Submit WhatsApp Enquiry</span>
              </button>

              {/* Form Enquiry */}
              <button
                onClick={() => onOpenEnquiry(product)}
                className="flex items-center justify-center gap-2.5 rounded-xl bg-brand-primary text-white hover:bg-brand-primary-hover px-5 py-3.5 font-sans text-sm font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <Send className="h-4 w-4 text-white" />
                <span>Request Digital Callback</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
