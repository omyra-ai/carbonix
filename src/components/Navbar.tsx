import React from 'react';
import { Heart, Search, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Product } from '../types';

interface NavbarProps {
  wishlist: Product[];
  onRemoveFromWishlist: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isAdminOpen: boolean;
  onToggleAdmin: () => void;
  onGoHome: () => void;
}

export default function Navbar({
  wishlist,
  onRemoveFromWishlist,
  onSelectProduct,
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  isAdminOpen,
  onToggleAdmin,
  onGoHome,
}: NavbarProps) {
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-brand-border bg-brand-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <div id="brand-logo" className="flex items-center gap-2">
          <button
            onClick={() => {
              onGoHome();
              if (isAdminOpen) onToggleAdmin();
            }}
            className="flex items-center gap-2.5 text-left transition-transform hover:scale-[1.01]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm transition-transform hover:rotate-3">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="font-sans text-xl font-extrabold tracking-tight text-brand-text">CURATED</span>
              <p className="font-mono text-[9px] uppercase tracking-widest text-brand-primary font-bold">Marketplace</p>
            </div>
          </button>
        </div>

        {/* Categories (Desktop) */}
        <nav id="desktop-nav" className="hidden lg:flex items-center gap-8">
          <button
            onClick={() => {
              onSelectCategory('');
              onGoHome();
              if (isAdminOpen) onToggleAdmin();
            }}
            className={`font-sans text-sm font-semibold tracking-wide transition-colors pb-1 ${
              activeCategory === '' ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-stone-500 hover:text-brand-text'
            }`}
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => {
                onSelectCategory(category);
                onGoHome();
                if (isAdminOpen) onToggleAdmin();
              }}
              className={`font-sans text-sm font-semibold tracking-wide transition-colors pb-1 ${
                activeCategory === category ? 'text-brand-primary border-b-2 border-brand-primary' : 'text-stone-500 hover:text-brand-text'
              }`}
            >
              {category}
            </button>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div id="nav-actions" className="flex items-center gap-4">
          
          {/* Dynamic Search */}
          <div className="relative flex items-center">
            <AnimatePresence>
              {(isSearchExpanded || searchQuery) && (
                <motion.input
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 180, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  type="text"
                  placeholder="Search curated pieces..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="rounded-full border border-brand-border bg-white px-4 py-1.5 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                />
              )}
            </AnimatePresence>
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              className="p-2 text-stone-500 hover:text-brand-text transition-colors"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Wishlist Button */}
          <button
            id="wishlist-trigger"
            onClick={() => setIsWishlistOpen(true)}
            className="relative p-2 text-stone-500 hover:text-brand-text transition-colors"
            title="Wishlist"
          >
            <Heart className={`h-5 w-5 transition-transform active:scale-125 ${wishlist.length > 0 ? 'fill-brand-primary text-brand-primary' : ''}`} />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-primary font-mono text-[9px] font-bold text-white ring-2 ring-brand-bg animate-pulse">
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Admin Panel Toggle */}
          <button
            id="admin-toggle"
            onClick={onToggleAdmin}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 border transition-all ${
              isAdminOpen
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm hover:bg-brand-primary-hover'
                : 'bg-white text-stone-600 border-brand-border hover:border-brand-primary hover:text-brand-primary'
            }`}
            title="Admin Portal"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline font-sans text-xs font-semibold tracking-wide">
              {isAdminOpen ? 'Storefront' : 'Admin Portal'}
            </span>
          </button>
        </div>
      </div>

      {/* Slide-out Wishlist Drawer */}
      <AnimatePresence>
        {isWishlistOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWishlistOpen(false)}
              className="fixed inset-0 z-50 bg-[#2D2D2D]/40 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col bg-brand-bg shadow-2xl border-l border-brand-border"
            >
              <div className="flex h-20 items-center justify-between border-b border-brand-border px-6">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-brand-primary fill-brand-primary" />
                  <h3 className="font-sans text-lg font-bold text-brand-text">Your Wishlist</h3>
                  <span className="rounded-full bg-brand-neutral-light px-2.5 py-0.5 font-mono text-xs font-semibold text-brand-primary">
                    {wishlist.length}
                  </span>
                </div>
                <button
                  onClick={() => setIsWishlistOpen(false)}
                  className="rounded-full p-2 text-stone-400 hover:bg-brand-neutral-light hover:text-brand-text transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Wishlist Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {wishlist.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <Heart className="h-12 w-12 text-brand-border" />
                    <h4 className="mt-4 font-sans text-sm font-semibold text-stone-700">Your wishlist is empty</h4>
                    <p className="mt-2 font-sans text-xs text-stone-400 max-w-xs leading-relaxed">
                      Explore our collections and tap the heart icon on designs you love to keep track of them here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wishlist.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-4 rounded-xl border border-brand-border p-3 hover:border-brand-primary/30 transition-all group bg-white"
                      >
                        <div className="h-16 w-16 overflow-hidden rounded-lg bg-brand-neutral-light">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-[9px] uppercase tracking-wider text-brand-primary font-bold">
                            {item.category}
                          </span>
                          <h4 className="truncate font-sans text-sm font-bold text-brand-text">
                            {item.name}
                          </h4>
                          <span className="font-mono text-xs font-bold text-brand-text">
                            ${item.price}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => {
                              onSelectProduct(item);
                              setIsWishlistOpen(false);
                            }}
                            className="rounded-lg bg-brand-text px-3 py-1 font-sans text-[10px] font-semibold tracking-wide text-white hover:bg-brand-primary transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => onRemoveFromWishlist(item)}
                            className="flex items-center justify-center rounded-lg p-1 text-stone-400 hover:text-brand-primary hover:bg-brand-neutral-light transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="border-t border-brand-border p-6 bg-brand-card">
                <button
                  onClick={() => setIsWishlistOpen(false)}
                  className="w-full rounded-xl bg-brand-primary py-3 text-center font-sans text-sm font-semibold tracking-wide text-white shadow-sm hover:bg-brand-primary-hover transition-all active:scale-[0.98] cursor-pointer"
                >
                  Continue Exploring
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
