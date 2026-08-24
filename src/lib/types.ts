import { z } from "zod";

// Every "enum" in this project is a plain string column (SQLite has no native
// enum type) validated at the application boundary with these. Keep this file
// as the single source of truth for valid values — never compare against a
// string literal elsewhere without importing from here.

export const TASK_STATUSES = [
  "draft",
  "clarifying",
  "ready",
  "queued",
  "working",
  "review",
  "revision",
  "scheduled",
  "approved",
  "cancelled",
  "failed",
] as const;
export const TaskStatus = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TASK_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const TaskPriority = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof TaskPriority>;

export const SCHEDULE_TYPES = ["one_off", "daily", "weekly", "custom"] as const;
export const ScheduleType = z.enum(SCHEDULE_TYPES);
export type ScheduleType = z.infer<typeof ScheduleType>;

export const TASK_RUN_STATUSES = [
  "scheduled",
  "working",
  "review",
  "approved",
  "failed",
  "cancelled",
] as const;
export const TaskRunStatus = z.enum(TASK_RUN_STATUSES);
export type TaskRunStatus = z.infer<typeof TaskRunStatus>;

export const APPROVAL_DECISIONS = ["approved", "revision_requested", "cancelled"] as const;
export const ApprovalDecision = z.enum(APPROVAL_DECISIONS);
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const AGENT_JOB_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export const AgentJobStatus = z.enum(AGENT_JOB_STATUSES);
export type AgentJobStatus = z.infer<typeof AgentJobStatus>;

export const TAG_KINDS = ["free", "project", "market", "company", "topic", "campaign", "product"] as const;
export const TagKind = z.enum(TAG_KINDS);
export type TagKind = z.infer<typeof TagKind>;

export const AGENT_KEYS = [
  "market-researcher",
  "sales-assistant",
  "marketing-assistant",
  "mail-checker",
  "file-organizer",
  "insight-sparring-partner",
  "meeting-mark",
] as const;
export const AgentKey = z.enum(AGENT_KEYS);
export type AgentKey = z.infer<typeof AgentKey>;

// Source citation shape used by market-researcher, insight-sparring-partner, etc.
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(),
  accessedAt: z.string().optional(),
  excerpt: z.string().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

// Structured lead shape produced by market-researcher (spec §6).
export const LeadResultSchema = z.object({
  companyName: z.string(),
  domain: z.string(),
  website: z.string().optional(),
  country: z.string().optional(),
  industry: z.string().optional(),
  employeeRange: z.string().optional(),
  revenueRange: z.string().optional(),
  businessSummary: z.string().optional(),
  whyFit: z.string().optional(),
  opportunityHypothesis: z.string().optional(),
  recommendedPersona: z.string().optional(),
  icpScore: z.number().min(0).max(100).optional(),
  confidence: z.enum(["low", "medium", "high"]).optional(),
  sources: z.array(SourceSchema).default([]),
});
export type LeadResult = z.infer<typeof LeadResultSchema>;

// Deliverable envelope every agent report conforms to (spec §19).
export const ReportDeliverableSchema = z.object({
  executiveSummary: z.string(),
  deliverables: z.array(z.object({ title: z.string(), content: z.string() })).default([]),
  keyFindings: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  limitations: z.string().optional(),
  suggestedNextActions: z.array(z.string()).default([]),
  suggestedTags: z.array(z.string()).default([]),
  agentNote: z.string().optional(),
  // agent-specific structured payload (leads[], campaign plan, email drafts, ...)
  structured: z.unknown().optional(),
});
export type ReportDeliverable = z.infer<typeof ReportDeliverableSchema>;

export const EXECUTION_BRIEF_SCHEMA = z.object({
  objective: z.string(),
  background: z.string().optional(),
  scope: z.string().optional(),
  target: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  requiredSources: z.array(z.string()).default([]),
  deliverables: z.array(z.string()),
  successCriteria: z.array(z.string()).default([]),
});
export type ExecutionBrief = z.infer<typeof EXECUTION_BRIEF_SCHEMA>;
