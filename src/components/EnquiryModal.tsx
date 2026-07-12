import React, { useState } from 'react';
import { Check, Mail, Phone, Send, User, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface EnquiryModalProps {
  product: Product | null;
  onClose: () => void;
  onSuccessSubmit?: () => void;
}

export default function EnquiryModal({ product, onClose, onSuccessSubmit }: EnquiryModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !phone) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          productPrice: product.price,
          productThumbnail: product.image,
          firstName,
          lastName,
          email,
          phone,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
         setIsSuccess(true);
         if (onSuccessSubmit) {
           onSuccessSubmit();
         }
      } else {
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      setErrorMessage('Network error. Unable to forward enquiry at this moment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#2D2D2D]/40 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-brand-bg shadow-2xl border border-brand-border"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-stone-400 hover:bg-brand-neutral-light hover:text-brand-primary transition-colors z-20 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Header Details with Prefetched Product */}
              <div className="bg-brand-card p-6 border-b border-brand-border">
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wider text-brand-primary">
                  Submit Purchase Enquiry
                </span>
                <h3 className="font-sans text-xl font-extrabold text-brand-text mt-0.5">
                  Request Private Consultation
                </h3>
                
                {/* Auto-Fetched Product Card */}
                <div className="mt-4 flex gap-4 rounded-xl border border-brand-border bg-white p-3 shadow-xs">
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-brand-neutral-light">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-brand-primary font-extrabold">
                      {product.category}
                    </span>
                    <h4 className="truncate font-sans text-sm font-bold text-brand-text">
                      {product.name}
                    </h4>
                    <div className="flex justify-between items-baseline mt-1.5">
                      <span className="font-mono text-sm font-extrabold text-brand-text">
                        ${product.price}
                      </span>
                      <span className="font-mono text-[8px] uppercase text-stone-400 font-bold">
                        Auto-Fetched Details
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                {errorMessage && (
                  <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-100 text-xs font-semibold text-rose-700">
                    {errorMessage}
                  </div>
                )}

                {/* Name fields */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col">
                    <label className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                      First Name <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-brand-text placeholder-stone-300 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                      Last Name <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-brand-text placeholder-stone-300 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact fields */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col">
                    <label className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                      Email Address <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="johndoe@example.com"
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-brand-text placeholder-stone-300 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                      Phone Number <span className="text-brand-primary">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-brand-text placeholder-stone-300 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Message field */}
                <div className="flex flex-col">
                  <label className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1.5">
                    What would you like to ask or tell us? <span className="text-stone-400 font-semibold">(Optional)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask about materials, physical inspections, alternative dimensions, custom color configurations, or localized delivery details..."
                    className="w-full rounded-xl border border-brand-border bg-white p-3 text-sm font-semibold text-brand-text placeholder-stone-300 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="bg-brand-card border-t border-brand-border p-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-brand-border bg-white px-5 py-3 text-xs font-bold text-stone-600 hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2.5 rounded-xl bg-brand-primary px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-brand-primary-hover disabled:bg-stone-400 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Enquiry</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Submission Success State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center p-8 bg-brand-bg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm animate-bounce">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <h3 className="mt-4 font-sans text-xl font-extrabold text-brand-text">
                Enquiry Transmitted
              </h3>
              <p className="mt-2 font-sans text-xs text-stone-500 leading-relaxed max-w-sm">
                Your consultation request has been forwarded directly to the admin email address at <strong className="text-brand-text font-bold">matrixgyan88094@gmail.com</strong>.
              </p>

              {/* Submitted Data Summary Review */}
              <div className="w-full mt-6 rounded-2xl border border-brand-border bg-white p-4 text-left space-y-2.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-brand-primary">
                  Transmission Receipt Summary
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-stone-400 font-bold">Client:</span>
                    <p className="font-bold text-brand-text">{firstName} {lastName}</p>
                  </div>
                  <div>
                    <span className="text-stone-400 font-bold">Piece Enquired:</span>
                    <p className="font-bold text-brand-text truncate">{product.name}</p>
                  </div>
                  <div>
                    <span className="text-stone-400 font-bold">Email Contact:</span>
                    <p className="font-bold text-brand-text truncate">{email}</p>
                  </div>
                  <div>
                    <span className="text-stone-400 font-bold">Phone Contact:</span>
                    <p className="font-bold text-brand-text">{phone}</p>
                  </div>
                </div>
              </div>

              <p className="mt-6 font-sans text-xs text-stone-400 max-w-sm leading-normal">
                Our support desk will personally review your specific queries and reach out shortly via email or WhatsApp messaging.
              </p>

              <button
                onClick={onClose}
                className="w-full mt-6 rounded-xl bg-brand-primary py-3 font-sans text-sm font-bold tracking-wide text-white hover:bg-brand-primary-hover transition-colors shadow-xs cursor-pointer"
              >
                Return to Gallery
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
