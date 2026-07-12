import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, HelpCircle, ShieldCheck, ShoppingBag, Sparkles, Lock, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Product } from './types';
import { PRODUCTS as STATIC_PRODUCTS } from './data/products';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import ProductDetails from './components/ProductDetails';
import EnquiryModal from './components/EnquiryModal';
import AdminPanel from './components/AdminPanel';

export default function App() {
  // States
  const [productsList, setProductsList] = useState<Product[]>(STATIC_PRODUCTS);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [enquiryProduct, setEnquiryProduct] = useState<Product | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Custom Routing Alias states
  const [currentAlias, setCurrentAlias] = useState<string>('admin');
  const [showAlias404, setShowAlias404] = useState<boolean>(false);

  // Fetch dynamic products and active routing alias from server
  const loadDynamicData = async () => {
    try {
      // 1. Load active products
      const prodRes = await fetch('/api/products');
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData) && prodData.length > 0) {
          setProductsList(prodData);
        }
      }
    } catch (e) {
      console.error('Failed to fetch dynamic products, falling back to preloaded list.');
    }

    try {
      // 2. Load custom administrative path settings
      const aliasRes = await fetch('/api/admin/alias');
      let activeAlias = 'admin';
      if (aliasRes.ok) {
        const aliasData = await aliasRes.json();
        if (aliasData.alias) {
          activeAlias = aliasData.alias.toLowerCase().trim();
          setCurrentAlias(activeAlias);
        }
      }

      // 3. Resolve path to determine view
      const pathToken = window.location.pathname.replace(/^\/|\/$/g, '').toLowerCase().trim();
      if (pathToken === activeAlias) {
        setIsAdminOpen(true);
      } else if (pathToken === 'admin' && activeAlias !== 'admin') {
        // User tries default /admin but administrator has moved it to custom alias e.g. /liza
        setShowAlias404(true);
      } else if (pathToken.length > 0 && pathToken !== activeAlias) {
        // Any other unmatched administrative attempts
        setShowAlias404(true);
      }
    } catch (e) {
      console.error('Handshake failed resolving routing configuration.');
    }
  };

  useEffect(() => {
    loadDynamicData();
  }, []);

  // Sync wishlist from local storage whenever product list updates
  useEffect(() => {
    const savedWishlist = localStorage.getItem('curated_wishlist');
    if (savedWishlist) {
      try {
        const ids = JSON.parse(savedWishlist) as string[];
        const filtered = productsList.filter((p) => ids.includes(p.id));
        setWishlist(filtered);
      } catch (e) {
        console.error('Failed to parse saved wishlist', e);
      }
    }
  }, [productsList]);

  // Save wishlist to local storage on change
  const saveWishlist = (updatedList: Product[]) => {
    setWishlist(updatedList);
    const ids = updatedList.map((p) => p.id);
    localStorage.setItem('curated_wishlist', JSON.stringify(ids));
  };

  // Toggle wishlist item
  const handleToggleWishlist = (product: Product) => {
    const isAlreadyWishlisted = wishlist.some((p) => p.id === product.id);
    if (isAlreadyWishlisted) {
      const updated = wishlist.filter((p) => p.id !== product.id);
      saveWishlist(updated);
    } else {
      const updated = [...wishlist, product];
      saveWishlist(updated);
    }
  };

  // Remove specifically from drawer list
  const handleRemoveFromWishlist = (product: Product) => {
    const updated = wishlist.filter((p) => p.id !== product.id);
    saveWishlist(updated);
  };

  // Helper properties derived from current products state
  const categories = Array.from(new Set(productsList.map((p) => p.category))) as string[];

  // Filtered products list
  const filteredProducts = productsList.filter((p) => {
    const matchesCategory = activeCategory === '' || p.category === activeCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  /* ============================================================================
     RENDER FLOW A: SECURITY 404 ROUTE LOCKOUT BLOCK
     ============================================================================ */

  if (showAlias404) {
    return (
      <div id="security-404-canvas" className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-brand-border rounded-3xl p-8 shadow-xl text-center relative overflow-hidden">
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-brand-primary/5 blur-3xl" />
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-brand-primary/10 blur-3xl" />

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-text text-brand-primary shadow-md mx-auto">
            <ShieldAlert className="h-6 w-6 text-brand-primary" />
          </div>

          <h1 className="mt-6 font-sans text-2xl font-black text-brand-text uppercase tracking-tight">
            Node Deactivated
          </h1>
          <p className="mt-3 font-sans text-xs text-stone-500 leading-relaxed">
            The requested administration console route is offline or has been cryptographically reassigned to a different routing token. Accessing this endpoint is unauthorized.
          </p>

          <div className="mt-8 pt-6 border-t border-brand-border flex flex-col gap-3">
            <button
              onClick={() => {
                setShowAlias404(false);
                window.history.pushState({}, '', '/');
              }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-text hover:bg-brand-primary py-3 font-sans text-xs font-bold text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 text-brand-primary" />
              <span>RETURN TO MARKETPLACE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ============================================================================
     RENDER FLOW B: REGULAR APP CATALOG & COMMAND DECK
     ============================================================================ */

  return (
    <div id="app-root" className="min-h-screen bg-brand-bg font-sans text-brand-text selection:bg-brand-primary selection:text-white">
      {/* Banner Notice about order model */}
      <div id="notice-bar" className="bg-brand-text py-2.5 text-center px-4">
        <p className="font-sans text-[10px] font-extrabold uppercase tracking-widest text-brand-neutral-light flex items-center justify-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-primary fill-brand-primary" />
          <span>Exclusive Bespoke Shopping Model: Inquiry-Based Purchasing Only — No Impersonal Checkouts</span>
        </p>
      </div>

      {/* Navigation Bar */}
      <Navbar
        wishlist={wishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        onSelectProduct={(p) => {
          setSelectedProduct(p);
          setIsAdminOpen(false);
        }}
        categories={categories}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isAdminOpen={isAdminOpen}
        onToggleAdmin={() => {
          if (!isAdminOpen) {
            // Push active administrative URL to path smoothly
            window.history.pushState({}, '', `/${currentAlias}`);
            setIsAdminOpen(true);
          } else {
            // Clear route alias upon exit
            window.history.pushState({}, '', '/');
            setIsAdminOpen(false);
          }
        }}
        onGoHome={() => setSelectedProduct(null)}
      />

      <main className="pb-24">
        <AnimatePresence mode="wait">
          {isAdminOpen ? (
            /* ADMIN VIEW CONSOLE */
            <motion.div key="admin-view">
              <AdminPanel
                onSelectProductById={(id) => {
                  const found = productsList.find((p) => p.id === id);
                  if (found) {
                    setSelectedProduct(found);
                  }
                }}
                onClose={() => {
                  setIsAdminOpen(false);
                  window.history.pushState({}, '', '/');
                }}
                onProductCatalogChanged={loadDynamicData}
              />
            </motion.div>
          ) : selectedProduct ? (
            /* DETAILED SINGLE PRODUCT SECTION */
            <motion.div key={`details-${selectedProduct.id}`}>
              <ProductDetails
                product={selectedProduct}
                isWishlisted={wishlist.some((p) => p.id === selectedProduct.id)}
                onToggleWishlist={handleToggleWishlist}
                onBack={() => setSelectedProduct(null)}
                onOpenEnquiry={(p) => setEnquiryProduct(p)}
              />
            </motion.div>
          ) : (
            /* HOME GRID & CATALOGUE */
            <motion.div
              key="storefront"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Editorial Hero Area */}
              <section id="hero" className="relative overflow-hidden bg-brand-card py-16 sm:py-20 lg:py-24 border-b border-brand-border">
                <div className="absolute inset-0 z-0 opacity-40">
                  <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
                  <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-brand-primary/5 blur-3xl" />
                </div>

                <div className="relative z-10 mx-auto max-w-4xl text-center px-4 sm:px-6 lg:px-8">
                  <span className="font-mono text-xs font-extrabold uppercase tracking-[0.2em] text-brand-primary">
                    Curated Artifacts
                  </span>
                  <h1 className="mt-4 font-sans text-4xl font-black tracking-tight text-brand-text sm:text-5xl lg:text-6xl uppercase">
                    The Art of Living
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl font-sans text-sm md:text-base leading-relaxed text-stone-600">
                    Discover design pieces carefully selected for modern physical workspaces, bodies, and spaces. We reject automated impersonal transactions. Explore fine details and connect directly with our studio to acquire.
                  </p>

                  {/* Informational feature items */}
                  <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xs p-4 text-left border border-brand-border">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white">
                        <Heart className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-sans text-xs font-bold text-brand-text uppercase tracking-wide">Wishlist Collection</h4>
                        <p className="font-sans text-[11px] text-stone-400 mt-0.5">Collect the pieces you admire.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xs p-4 text-left border border-brand-border">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white">
                        <ShoppingBag className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-sans text-xs font-bold text-brand-text uppercase tracking-wide">Direct WhatsApp</h4>
                        <p className="font-sans text-[11px] text-stone-400 mt-0.5">Instant chat with all specs prefilled.</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-xs p-4 text-left border border-brand-border">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-primary text-white">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-sans text-xs font-bold text-brand-text uppercase tracking-wide">Digital Consultation</h4>
                        <p className="font-sans text-[11px] text-stone-400 mt-0.5">Custom quotation via admin mail.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Product Catalog Section */}
              <section id="catalogue" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Active Filter Indicators */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 border-brand-border">
                  <div>
                    <h2 className="font-sans text-xl font-bold tracking-tight text-brand-text uppercase">
                      {activeCategory ? `${activeCategory} Collection` : 'All Curated Pieces'}
                    </h2>
                    <p className="font-sans text-xs text-stone-400">
                      Displaying {filteredProducts.length} unique designs
                    </p>
                  </div>

                  {/* Category filters inside body too */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setActiveCategory('')}
                      className={`rounded-lg px-3.5 py-1.5 font-sans text-xs font-bold transition-all cursor-pointer ${
                        activeCategory === ''
                          ? 'bg-brand-primary text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-brand-border hover:border-brand-primary/40'
                      }`}
                    >
                      All
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-lg px-3.5 py-1.5 font-sans text-xs font-bold transition-all cursor-pointer ${
                          activeCategory === cat
                            ? 'bg-brand-primary text-white shadow-xs'
                            : 'bg-white text-stone-600 border border-brand-border hover:border-brand-primary/40'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid */}
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="font-sans text-sm font-bold text-brand-text">No matching pieces found</p>
                    <p className="font-sans text-xs text-stone-400 mt-1">Try adjusting your categories filter or clear your search input.</p>
                    <button
                      onClick={() => {
                        setActiveCategory('');
                        setSearchQuery('');
                      }}
                      className="mt-4 rounded-xl bg-brand-primary px-4 py-2 font-sans text-xs font-bold text-white hover:bg-brand-primary-hover transition-colors cursor-pointer"
                    >
                      Reset Catalogue
                    </button>
                  </div>
                ) : (
                  <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    {filteredProducts.map((product) => (
                      <div key={product.id}>
                        <ProductCard
                          product={product}
                          isWishlisted={wishlist.some((p) => p.id === product.id)}
                          onToggleWishlist={handleToggleWishlist}
                          onSelectProduct={setSelectedProduct}
                          onOpenEnquiry={setEnquiryProduct}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer area */}
      <footer id="app-footer" className="border-t border-brand-border bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-stone-50 shadow-sm">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <span className="font-sans text-sm font-extrabold tracking-tight text-brand-text uppercase">CURATED MARKETPLACE</span>
          </div>
          <p className="mt-3 font-sans text-xs text-stone-500 leading-relaxed max-w-md mx-auto">
            A premium demonstration of bespoke product forwarders. Direct WhatsApp linkages and automatic metadata enquiry routing built with full integrity.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4 text-stone-300">
            <span className="font-mono text-[10px] tracking-wider text-stone-400">© 2026 CURATED STUDIO INC.</span>
            <span className="h-1.5 w-1.5 rounded-full bg-brand-border" />
            <button
              onClick={() => {
                window.history.pushState({}, '', `/${currentAlias}`);
                setIsAdminOpen(true);
              }}
              className="font-sans text-[10px] font-bold text-stone-500 hover:text-brand-primary hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-brand-primary" />
              <span>Admin Console ({currentAlias === 'admin' ? '/admin' : `/${currentAlias}`})</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Enquiry Form Modal */}
      <EnquiryModal
        product={enquiryProduct}
        onClose={() => setEnquiryProduct(null)}
        onSuccessSubmit={() => {
          // Silent background sync
          loadDynamicData();
        }}
      />
    </div>
  );
}
