"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Save,
  Eye,
  Type,
  Image as ImageIcon,
  Calendar,
  DollarSign,
  GripVertical,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/i18n/routing";

type BlockType = "text" | "image" | "timeline" | "pricing";

interface ProposalBlock {
  id: string;
  type: BlockType;
  order: number;
  content: Record<string, unknown>;
}

interface Props {
  locale: Locale;
  proposalId?: string;
  initialTitle?: string;
  initialBlocks?: ProposalBlock[];
}

/**
 * Smart Proposal Builder — Notion-style block-based editor.
 *
 * Features:
 * - Distraction-free full-screen editing
 * - Dynamic block system (text, image, timeline, pricing)
 * - Floating "+" menu to add blocks
 * - Framer Motion animations
 * - Auto-save indicator
 * - Pre-filled agency template
 */
export function ProposalBuilder({
  locale,
  proposalId,
  initialTitle = "",
  initialBlocks = [],
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle || "Untitled Proposal");
  const [blocks, setBlocks] = useState<ProposalBlock[]>(
    initialBlocks.length > 0 ? initialBlocks : getDefaultTemplate(),
  );
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Auto-save simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, blocks]);

  function handleAutoSave() {
    setIsSaving(true);
    // TODO: Implement actual save logic
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
  }

  function addBlock(type: BlockType, afterBlockId?: string) {
    const newBlock: ProposalBlock = {
      id: `block-${Date.now()}`,
      type,
      order: blocks.length,
      content: getDefaultBlockContent(type),
    };

    if (afterBlockId) {
      const index = blocks.findIndex((b) => b.id === afterBlockId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })));
    } else {
      setBlocks([...blocks, newBlock]);
    }

    setShowBlockMenu(false);
    setActiveBlockId(newBlock.id);
  }

  function updateBlock(blockId: string, content: Record<string, unknown>) {
    setBlocks(
      blocks.map((b) => (b.id === blockId ? { ...b, content } : b)),
    );
  }

  function deleteBlock(blockId: string) {
    setBlocks(blocks.filter((b) => b.id !== blockId));
  }

  function handleSave() {
    // TODO: Implement save logic
    console.log("Saving proposal:", { title, blocks });
    router.push(`/${locale}/proposals`);
  }

  function handleDiscard() {
    if (confirm("Discard changes?")) {
      router.push(`/${locale}/proposals`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-[hsl(var(--background))] to-[hsl(var(--surface-1))]">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--surface-1))]/80 px-6 py-4 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Discard
          </Button>
          {isSaving ? (
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Auto-saving...
            </div>
          ) : lastSaved ? (
            <div className="text-xs text-[hsl(var(--muted-foreground))]">
              Saved {formatTime(lastSaved)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            size="sm"
            className="gap-2 shadow-lg shadow-[hsl(var(--primary))]/20"
          >
            <Save className="h-4 w-4" />
            Save & Continue
          </Button>
        </div>
      </nav>

      {/* Editor Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-8 py-12">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Proposal"
            className="mb-8 w-full border-0 bg-transparent text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]/40 focus:outline-none"
          />

          {/* Blocks */}
          <AnimatePresence mode="popLayout">
            {blocks.map((block, index) => (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="group relative mb-4"
              >
                {/* Block Controls */}
                <div className="absolute -left-12 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="flex h-6 w-6 items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface-2))] hover:text-[hsl(var(--foreground))]"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBlock(block.id)}
                    className="flex h-6 w-6 items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive))]/10 hover:text-[hsl(var(--destructive))]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Block Content */}
                <BlockRenderer
                  block={block}
                  isActive={activeBlockId === block.id}
                  onUpdate={(content) => updateBlock(block.id, content)}
                  onFocus={() => setActiveBlockId(block.id)}
                />

                {/* Add Block Button (between blocks) */}
                <div className="relative -mb-2 mt-2 flex justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBlockId(block.id);
                      setShowBlockMenu(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] text-[hsl(var(--muted-foreground))] shadow-lg transition-all hover:scale-110 hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add First Block */}
          {blocks.length === 0 && (
            <button
              type="button"
              onClick={() => setShowBlockMenu(true)}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--surface-1))]/50 px-6 py-12 text-[hsl(var(--muted-foreground))] transition-all hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]"
            >
              <Plus className="h-5 w-5" />
              Add your first block
            </button>
          )}
        </div>
      </div>

      {/* Floating Block Menu */}
      <AnimatePresence>
        {showBlockMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
              onClick={() => setShowBlockMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-1))] p-4 shadow-2xl"
            >
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                Add Block
              </h3>
              <div className="grid gap-2">
                <BlockMenuItem
                  icon={Type}
                  label="Text Block"
                  description="Rich text content"
                  onClick={() => addBlock("text", activeBlockId ?? undefined)}
                />
                <BlockMenuItem
                  icon={ImageIcon}
                  label="Image / Banner"
                  description="Visual content"
                  onClick={() => addBlock("image", activeBlockId ?? undefined)}
                />
                <BlockMenuItem
                  icon={Calendar}
                  label="Timeline"
                  description="Project milestones"
                  onClick={() => addBlock("timeline", activeBlockId ?? undefined)}
                />
                <BlockMenuItem
                  icon={DollarSign}
                  label="Pricing Table"
                  description="Investment breakdown"
                  onClick={() => addBlock("pricing", activeBlockId ?? undefined)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function BlockMenuItem({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))]/50 p-4 text-left transition-all hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5 hover:shadow-lg"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary))]/60">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="font-semibold text-[hsl(var(--foreground))]">{label}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          {description}
        </p>
      </div>
    </button>
  );
}

function BlockRenderer({
  block,
  isActive,
  onUpdate,
  onFocus,
}: {
  block: ProposalBlock;
  isActive: boolean;
  onUpdate: (content: Record<string, unknown>) => void;
  onFocus: () => void;
}) {
  switch (block.type) {
    case "text":
      return (
        <div
          className={`rounded-xl border bg-[hsl(var(--surface-1))]/50 p-6 backdrop-blur-sm transition-all ${
            isActive
              ? "border-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary))]/10"
              : "border-[hsl(var(--border))]/50"
          }`}
        >
          <Input
            value={String(block.content.heading ?? "")}
            onChange={(e) =>
              onUpdate({ ...block.content, heading: e.target.value })
            }
            onFocus={onFocus}
            placeholder="Heading"
            className="mb-3 border-0 bg-transparent text-2xl font-bold"
          />
          <Textarea
            value={String(block.content.body ?? "")}
            onChange={(e) =>
              onUpdate({ ...block.content, body: e.target.value })
            }
            onFocus={onFocus}
            placeholder="Start writing..."
            rows={6}
            className="border-0 bg-transparent text-[hsl(var(--muted-foreground))] resize-none"
          />
        </div>
      );

    case "image":
      return (
        <div
          className={`rounded-xl border bg-[hsl(var(--surface-1))]/50 p-6 backdrop-blur-sm transition-all ${
            isActive
              ? "border-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary))]/10"
              : "border-[hsl(var(--border))]/50"
          }`}
        >
          <Input
            value={String(block.content.url ?? "")}
            onChange={(e) =>
              onUpdate({ ...block.content, url: e.target.value })
            }
            onFocus={onFocus}
            placeholder="Image URL"
            className="mb-3"
          />
          <Input
            value={String(block.content.caption ?? "")}
            onChange={(e) =>
              onUpdate({ ...block.content, caption: e.target.value })
            }
            onFocus={onFocus}
            placeholder="Caption (optional)"
          />
        </div>
      );

    case "timeline":
      return (
        <div
          className={`rounded-xl border bg-[hsl(var(--surface-1))]/50 p-6 backdrop-blur-sm transition-all ${
            isActive
              ? "border-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary))]/10"
              : "border-[hsl(var(--border))]/50"
          }`}
        >
          <h3 className="mb-4 text-lg font-semibold">Project Timeline</h3>
          <Textarea
            value={String(block.content.milestones ?? "")}
            onChange={(e) =>
              onUpdate({ ...block.content, milestones: e.target.value })
            }
            onFocus={onFocus}
            placeholder="Week 1: Discovery & Planning&#10;Week 2-4: Design & Development&#10;Week 5: Testing & Launch"
            rows={6}
          />
        </div>
      );

    case "pricing":
      return (
        <div
          className={`rounded-xl border bg-[hsl(var(--surface-1))]/50 p-6 backdrop-blur-sm transition-all ${
            isActive
              ? "border-[hsl(var(--primary))] shadow-lg shadow-[hsl(var(--primary))]/10"
              : "border-[hsl(var(--border))]/50"
          }`}
        >
          <h3 className="mb-4 text-lg font-semibold">Investment Breakdown</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={String(block.content.item1 ?? "")}
                onChange={(e) =>
                  onUpdate({ ...block.content, item1: e.target.value })
                }
                onFocus={onFocus}
                placeholder="Service name"
              />
              <Input
                value={String(block.content.price1 ?? "")}
                onChange={(e) =>
                  onUpdate({ ...block.content, price1: e.target.value })
                }
                onFocus={onFocus}
                placeholder="$0"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={String(block.content.item2 ?? "")}
                onChange={(e) =>
                  onUpdate({ ...block.content, item2: e.target.value })
                }
                onFocus={onFocus}
                placeholder="Service name"
              />
              <Input
                value={String(block.content.price2 ?? "")}
                onChange={(e) =>
                  onUpdate({ ...block.content, price2: e.target.value })
                }
                onFocus={onFocus}
                placeholder="$0"
              />
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

function getDefaultTemplate(): ProposalBlock[] {
  return [
    {
      id: "block-1",
      type: "text",
      order: 0,
      content: {
        heading: "Executive Summary",
        body: "We're excited to present this comprehensive proposal for your digital transformation. Our team specializes in building high-performance web applications and implementing cutting-edge SEO strategies that drive measurable results.",
      },
    },
    {
      id: "block-2",
      type: "text",
      order: 1,
      content: {
        heading: "Technical Architecture",
        body: "Next.js 15 with App Router\nLaravel 11 API Backend\nPostgreSQL Database\nRedis Caching Layer\nAWS Infrastructure (EC2, S3, CloudFront)\nCI/CD with GitHub Actions",
      },
    },
    {
      id: "block-3",
      type: "text",
      order: 2,
      content: {
        heading: "Answer Engine Optimization (AEO) & Technical SEO",
        body: "Schema Markup Implementation\nCore Web Vitals Optimization\nStructured Data for AI Engines\nSemantic HTML & Accessibility\nMobile-First Responsive Design\nPage Speed Optimization (Target: <2s LCP)",
      },
    },
    {
      id: "block-4",
      type: "timeline",
      order: 3,
      content: {
        milestones:
          "Week 1-2: Discovery, Requirements & Architecture\nWeek 3-6: Design System & UI Development\nWeek 7-10: Backend API & Database\nWeek 11-12: Integration & Testing\nWeek 13: SEO Implementation & Launch\nWeek 14+: Monitoring & Optimization",
      },
    },
    {
      id: "block-5",
      type: "pricing",
      order: 4,
      content: {
        item1: "Web Application Development",
        price1: "$25,000",
        item2: "Technical SEO & AEO Setup",
        price2: "$8,000",
      },
    },
  ];
}

function getDefaultBlockContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "text":
      return { heading: "", body: "" };
    case "image":
      return { url: "", caption: "" };
    case "timeline":
      return { milestones: "" };
    case "pricing":
      return { item1: "", price1: "", item2: "", price2: "" };
    default:
      return {};
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
