import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, ExternalLink, Mail, Phone, RefreshCw, Search, Trash2, MessageSquare, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Enquiry } from '../types';

interface AdminPanelProps {
  onSelectProductById: (id: string) => void;
  onClose: () => void;
}

export default function AdminPanel({ onSelectProductById, onClose }: AdminPanelProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Contacted'>('All');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEnquiries = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/enquiries');
      if (response.ok) {
        const data = await response.json();
        setEnquiries(data);
        // Maintain selection if exists
        if (selectedEnquiry) {
          const updated = data.find((e: Enquiry) => e.id === selectedEnquiry.id);
          if (updated) setSelectedEnquiry(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load enquiries', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: 'Pending' | 'Contacted') => {
    try {
      const response = await fetch(`/api/enquiries/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Optimistic state update or refetch
        fetchEnquiries(true);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Filtered list
  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch =
      `${enq.firstName} ${enq.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      enq.productName.toLowerCase().includes(search.toLowerCase()) ||
      enq.email.toLowerCase().includes(search.toLowerCase()) ||
      enq.phone.includes(search);
    
    const matchesStatus = statusFilter === 'All' || enq.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
    >
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-text px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              Administrative Command Center
            </span>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Console Link</span>
            </div>
          </div>
          <h1 className="mt-2.5 font-sans text-3xl font-extrabold tracking-tight text-brand-text">
            Incoming Inquiries Dashboard
          </h1>
          <p className="mt-1 font-sans text-xs text-stone-400">
            View customer details, read specific comments, update follow-up statuses, and connect instantly.
          </p>
        </div>

        {/* Refresh and Close Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEnquiries(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2.5 text-xs font-bold text-stone-600 shadow-xs hover:border-brand-primary hover:text-brand-primary transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand-primary-hover transition-colors cursor-pointer"
          >
            Exit Portal
          </button>
        </div>
      </div>

      {/* Main CRM Content Workspace */}
      {isLoading ? (
        <div className="flex h-[50vh] flex-col items-center justify-center">
          <RefreshCw className="h-8 w-8 text-brand-primary animate-spin" />
          <p className="mt-4 font-sans text-xs text-stone-400">Parsing live enquiries database...</p>
        </div>
      ) : enquiries.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-brand-border bg-brand-card p-12 text-center">
          <div className="rounded-2xl bg-white p-4 shadow-sm text-brand-primary border border-brand-border">
            <ShieldAlert className="h-10 w-10 text-brand-primary" />
          </div>
          <h3 className="mt-6 font-sans text-base font-bold text-brand-text">No Enquiries Logged</h3>
          <p className="mt-2 font-sans text-xs text-stone-500 max-w-md leading-relaxed">
            The database memory is currently empty. To see this console operate in real-time, browse the Marketplace, open any product card, click <strong className="text-brand-primary font-bold">Enquire Now</strong>, fill out the form, and submit! The entry will dynamically propagate here.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-xl bg-brand-primary px-6 py-3 font-sans text-xs font-bold tracking-wide text-white hover:bg-brand-primary-hover transition-colors shadow-xs cursor-pointer"
          >
            Submit an Enquiry Now
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          
          {/* Left Column: List and Filters (Take 1 Column or 2 depending on width) */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            
            {/* Search and filter controls */}
            <div className="flex flex-col gap-3 rounded-2xl border border-brand-border bg-brand-card p-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Filter by name, item or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-brand-border bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-brand-text placeholder-stone-400 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary/20"
                />
              </div>

              {/* Toggle Filters */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-brand-neutral-light p-1">
                {(['All', 'Pending', 'Contacted'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-lg py-1.5 text-center font-sans text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer ${
                      statusFilter === filter
                        ? 'bg-brand-primary text-white shadow-xs'
                        : 'text-stone-500 hover:text-brand-text'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Inquiries list */}
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {filteredEnquiries.length === 0 ? (
                <p className="text-center py-8 font-sans text-xs text-stone-400">No matching items found.</p>
              ) : (
                filteredEnquiries.map((enq) => (
                  <button
                    key={enq.id}
                    onClick={() => setSelectedEnquiry(enq)}
                    className={`group text-left flex flex-col p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedEnquiry?.id === enq.id
                        ? 'bg-brand-text border-brand-text text-white shadow-md'
                        : 'bg-white border-brand-border hover:border-brand-primary/40 text-brand-text'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`font-mono text-[9px] uppercase tracking-wider font-semibold opacity-60 ${selectedEnquiry?.id === enq.id ? 'text-brand-neutral-light' : 'text-stone-400'}`}>
                        {new Date(enq.submittedAt).toLocaleDateString()} at {new Date(enq.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      
                      {/* Status indicator */}
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        enq.status === 'Contacted'
                          ? selectedEnquiry?.id === enq.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : selectedEnquiry?.id === enq.id ? 'bg-brand-primary/20 text-white border border-brand-primary/20' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {enq.status === 'Contacted' ? 'Contacted' : 'Pending'}
                      </span>
                    </div>

                    <h4 className="mt-2.5 font-sans text-sm font-extrabold truncate">
                      {enq.firstName} {enq.lastName}
                    </h4>

                    <p className={`mt-1 font-sans text-xs line-clamp-1 ${
                      selectedEnquiry?.id === enq.id ? 'text-brand-neutral-light/85' : 'text-stone-500'
                    }`}>
                      Enquired: {enq.productName}
                    </p>

                    <div className={`mt-3 flex items-center justify-between border-t pt-2.5 border-dashed w-full ${selectedEnquiry?.id === enq.id ? 'border-white/20' : 'border-brand-border'}`}>
                      <span className={`font-mono text-[10px] font-bold ${selectedEnquiry?.id === enq.id ? 'text-brand-primary' : 'text-brand-text'}`}>
                        ${enq.productPrice}
                      </span>
                      <span className={`font-sans text-[10px] underline opacity-80 group-hover:opacity-100 transition-opacity ${selectedEnquiry?.id === enq.id ? 'text-brand-primary' : 'text-stone-500'}`}>
                        Review Detail →
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

          </div>

          {/* Right Column: Expanded Enquiry Details Viewer (Takes 2 columns) */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedEnquiry ? (
                <motion.div
                  key={selectedEnquiry.id}
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm flex flex-col justify-between h-full"
                >
                  <div>
                    {/* ID & Date Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-brand-border pb-4 gap-3">
                      <div>
                        <span className="font-mono text-[9px] font-extrabold text-brand-primary">
                          ENQUIRY REF ID: {selectedEnquiry.id}
                        </span>
                        <h3 className="font-sans text-lg font-extrabold text-brand-text mt-0.5">
                          Purchase Consultation Details
                        </h3>
                      </div>

                      {/* Status quick toggle bar */}
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          Follow-up State:
                        </span>
                        <div className="flex rounded-xl bg-brand-neutral-light p-1 border border-brand-border">
                          <button
                            onClick={() => handleUpdateStatus(selectedEnquiry.id, 'Pending')}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                              selectedEnquiry.status === 'Pending'
                                ? 'bg-white text-brand-primary shadow-xs border border-brand-primary/20'
                                : 'text-stone-500 hover:text-brand-text'
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>Pending</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(selectedEnquiry.id, 'Contacted')}
                            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-all cursor-pointer ${
                              selectedEnquiry.status === 'Contacted'
                                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-100'
                                : 'text-stone-500 hover:text-brand-text'
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Contacted</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left: Customer & Product details */}
                      <div className="space-y-6">
                        {/* Customer Information Block */}
                        <div>
                          <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                            Customer Profile
                          </h4>
                          <div className="mt-3 space-y-3">
                            <div>
                              <span className="font-sans text-[10px] text-stone-400">First & Last Name</span>
                              <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.firstName} {selectedEnquiry.lastName}</p>
                            </div>
                            <div>
                              <span className="font-sans text-[10px] text-stone-400">Email Address</span>
                              <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.email}</p>
                            </div>
                            <div>
                              <span className="font-sans text-[10px] text-stone-400">Mobile Phone / WhatsApp</span>
                              <p className="font-sans text-sm font-bold text-brand-text">{selectedEnquiry.phone}</p>
                            </div>
                          </div>
                        </div>

                        {/* Associated Product Block */}
                        <div>
                          <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                            Enquired Product Piece
                          </h4>
                          <div className="mt-3 flex items-center gap-3.5 p-3 rounded-xl border border-brand-border bg-brand-card">
                            <img
                              src={selectedEnquiry.productThumbnail}
                              alt={selectedEnquiry.productName}
                              className="h-12 w-12 rounded-lg object-cover bg-brand-neutral-light"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-brand-primary font-bold">
                                {selectedEnquiry.productCategory}
                              </span>
                              <h5 className="truncate font-sans text-sm font-bold text-brand-text leading-tight">
                                {selectedEnquiry.productName}
                              </h5>
                              <span className="font-mono text-xs font-bold text-brand-primary">
                                ${selectedEnquiry.productPrice}
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                onSelectProductById(selectedEnquiry.productId);
                                onClose();
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-brand-border hover:bg-brand-neutral-light text-stone-500 hover:text-brand-primary transition-colors cursor-pointer"
                              title="Inspect Product Profile"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Message & Response logs */}
                      <div className="flex flex-col">
                        <h4 className="font-sans text-[11px] uppercase tracking-wider text-stone-400 font-bold border-b pb-1.5 border-brand-border/40">
                          Customer Message / Comments
                        </h4>
                        <div className="mt-3 flex-1 rounded-xl bg-brand-neutral-light p-4 border border-brand-border min-h-[140px] text-sm text-brand-text leading-relaxed italic whitespace-pre-wrap">
                          {selectedEnquiry.message ? `"${selectedEnquiry.message}"` : '"No supplementary message submitted. Customer requested callback on stock status."'}
                        </div>
                        <span className="font-mono text-[9px] text-right text-stone-400 mt-2">
                          Transmitted via Digital API on {new Date(selectedEnquiry.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Response Panel for Admin */}
                  <div className="mt-8 pt-6 border-t border-brand-border">
                    <h4 className="font-sans text-xs font-bold text-brand-text uppercase tracking-wider">
                      Initiate Client Response Call
                    </h4>
                    <p className="text-[11px] font-sans text-stone-400 mt-0.5">
                      Respond to customer's enquiry directly using their listed contacts via customized templated drafts.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {/* Email template */}
                      <a
                        href={`mailto:${selectedEnquiry.email}?subject=Reply to your enquiry for ${encodeURIComponent(selectedEnquiry.productName)}&body=Hello ${encodeURIComponent(selectedEnquiry.firstName)},%0D%0A%0D%0AThank you for submitting an enquiry on our Curated Marketplace for the ${encodeURIComponent(selectedEnquiry.productName)} ($${selectedEnquiry.productPrice}).%0D%0A%0D%0AI would be happy to assist you with any questions and coordinate shipping schedules...`}
                        className="flex items-center justify-center gap-2 rounded-xl border border-brand-border hover:border-brand-primary bg-white py-3 font-sans text-xs font-bold text-brand-text hover:text-brand-primary transition-colors shadow-xs"
                      >
                        <Mail className="h-4 w-4 text-brand-primary" />
                        <span>Email Client</span>
                      </a>

                      {/* WhatsApp response template */}
                      <a
                        href={`https://wa.me/${selectedEnquiry.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedEnquiry.firstName)},%20this%20is%20the%20Curated%20Marketplace%20admin.%20I%20am%20following%20up%20on%20your%20enquiry%20for%20the%20${encodeURIComponent(selectedEnquiry.productName)}.%20Let's%20discuss%20delivery%20details!`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 font-sans text-xs font-bold text-white transition-colors shadow-xs"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp Client</span>
                      </a>
                    </div>
                  </div>

                </motion.div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-brand-border bg-brand-card p-12 text-center min-h-[350px]">
                  <CheckCircle2 className="h-10 w-10 text-brand-primary/40" />
                  <h4 className="mt-4 font-sans text-sm font-bold text-stone-700">No Selection</h4>
                  <p className="mt-1 font-sans text-xs text-stone-400 max-w-xs">
                    Choose any specific customer enquiry card from the left-hand console panel list to view full specifications.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </motion.div>
  );
}
