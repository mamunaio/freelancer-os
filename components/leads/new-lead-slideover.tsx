"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Globe, User, DollarSign, Building2, Link, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";

const leadFormSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  contactPerson: z.string().min(2, "Contact person is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  websiteUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  industryNiche: z.string().min(2, "Industry niche is required"),
  pipelineValue: z.number().min(0, "Pipeline value must be positive").default(0),
  status: z.enum(["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]),
  nextFollowUpDate: z.string().optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

interface NewLeadSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormValues) => Promise<void>;
}

export function NewLeadSlideOver({ isOpen, onClose, onSubmit }: NewLeadSlideOverProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      status: "NEW",
      pipelineValue: 0,
    },
  });

  const handleFormSubmit = async (data: LeadFormValues) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Failed to add lead:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-[hsl(var(--border))]/50 bg-gradient-to-b from-[hsl(var(--surface-1))]/90 to-[hsl(var(--surface-2))]/95 p-6 shadow-2xl backdrop-blur-xl md:p-8"
          >
            <div className="flex h-full flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-[hsl(var(--foreground))]">
                    Sourcing B2B Prospect
                  </h2>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    Quickly capture leads and agency pitches from Google Search results.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={handleSubmit(handleFormSubmit)}
                className="flex-1 overflow-y-auto py-6 space-y-5 pr-1 scrollbar-thin"
              >
                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Web Agency"
                    {...register("companyName")}
                    className={cn(
                      "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                      errors.companyName && "border-red-500/80"
                    )}
                  />
                  {errors.companyName && (
                    <span className="text-[11px] text-red-500">{errors.companyName.message}</span>
                  )}
                </div>

                {/* Contact Person */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe (Director)"
                    {...register("contactPerson")}
                    className={cn(
                      "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                      errors.contactPerson && "border-red-500/80"
                    )}
                  />
                  {errors.contactPerson && (
                    <span className="text-[11px] text-red-500">{errors.contactPerson.message}</span>
                  )}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" /> Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. partner@acme.com"
                    {...register("email")}
                    className={cn(
                      "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                      errors.email && "border-red-500/80"
                    )}
                  />
                  {errors.email && (
                    <span className="text-[11px] text-red-500">{errors.email.message}</span>
                  )}
                </div>

                {/* Website URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" /> Website Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. https://www.acme.com"
                    {...register("websiteUrl")}
                    className={cn(
                      "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                      errors.websiteUrl && "border-red-500/80"
                    )}
                  />
                  {errors.websiteUrl && (
                    <span className="text-[11px] text-red-500">{errors.websiteUrl.message}</span>
                  )}
                </div>

                {/* Industry / Niche */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5" /> Industry / Niche
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SaaS, Local HVAC, Dental Clinic"
                    {...register("industryNiche")}
                    className={cn(
                      "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                      errors.industryNiche && "border-red-500/80"
                    )}
                  />
                  {errors.industryNiche && (
                    <span className="text-[11px] text-red-500">{errors.industryNiche.message}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Estimated Project Budget */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" /> Pitch Value ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      {...register("pipelineValue", { valueAsNumber: true })}
                      className={cn(
                        "w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]",
                        errors.pipelineValue && "border-red-500/80"
                      )}
                    />
                    {errors.pipelineValue && (
                      <span className="text-[11px] text-red-500">{errors.pipelineValue.message}</span>
                    )}
                  </div>

                  {/* Stage */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                      Status Stage
                    </label>
                    <select
                      {...register("status")}
                      className="w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                    >
                      <option value="NEW">New Lead</option>
                      <option value="CONTACTED">Contacted</option>
                      <option value="PROPOSAL_SENT">Proposal Sent</option>
                      <option value="NEGOTIATION">Negotiation</option>
                      <option value="WON">Won (Deal Closed)</option>
                      <option value="LOST">Lost</option>
                    </select>
                  </div>
                </div>

                {/* Follow up Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Next Follow Up Date
                  </label>
                  <input
                    type="date"
                    {...register("nextFollowUpDate")}
                    className="w-full h-10 rounded-lg border border-[hsl(var(--border))]/80 bg-[hsl(var(--background))]/50 px-3 text-sm focus:border-[hsl(var(--primary))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                  />
                </div>
              </form>

              {/* Footer CTA */}
              <div className="border-t border-[hsl(var(--border))]/50 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-xs font-semibold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit(handleFormSubmit)}
                  disabled={isSubmitting}
                  className="flex-1 h-10 rounded-lg bg-[hsl(var(--primary))] text-xs font-semibold text-white shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Sourcing..." : "Add B2B Lead"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
