import { z } from "zod";

// ==========================================
// Database Enums & Types
// ==========================================

export enum UserRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum JobStatus {
  QUEUED = "QUEUED",
  SCHEDULED = "SCHEDULED",
  CLAIMED = "CLAIMED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  RETRYING = "RETRYING",
  DLQ = "DLQ",
}

export enum JobType {
  IMMEDIATE = "IMMEDIATE",
  DELAYED = "DELAYED",
  SCHEDULED = "SCHEDULED",
  CRON = "CRON",
  RECURRING = "RECURRING",
}

export enum WorkerStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAINING = "DRAINING",
}

export enum RetryStrategy {
  FIXED = "FIXED",
  LINEAR = "LINEAR",
  EXPONENTIAL = "EXPONENTIAL",
}

export enum NotificationType {
  EMAIL = "EMAIL",
  SLACK = "SLACK",
  DISCORD = "DISCORD",
}

// ==========================================
// Auth Schemas
// ==========================================

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  passwordHash: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters").optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  passwordHash: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  passwordHash: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});
export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

// ==========================================
// Project & Org Schemas
// ==========================================

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
});
export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

// ==========================================
// Queue Schemas
// ==========================================

export const RetryPolicySchema = z.object({
  strategy: z.nativeEnum(RetryStrategy),
  delay: z.number().int().min(0, "Delay must be non-negative (ms)"),
  maxAttempts: z.number().int().min(1, "Max attempts must be at least 1"),
});
export type RetryPolicyInput = z.infer<typeof RetryPolicySchema>;

export const CreateQueueSchema = z.object({
  name: z.string().min(2, "Queue name must be at least 2 characters").regex(/^[a-zA-Z0-9_-]+$/, "Queue name can only contain letters, numbers, hyphens, and underscores"),
  description: z.string().optional(),
  priority: z.number().int().min(1).max(10).default(5),
  concurrency: z.number().int().min(1).max(100).default(5),
  rateLimit: z.number().int().min(0).optional(), // Max jobs per second, undefined/0 means unlimited
  maxAttempts: z.number().int().min(1).default(3),
  timeout: z.number().int().min(1000).default(30000), // Timeout in ms
  retryPolicy: RetryPolicySchema.optional(),
});
export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;

export const UpdateQueueSchema = CreateQueueSchema.partial();
export type UpdateQueueInput = z.infer<typeof UpdateQueueSchema>;

// ==========================================
// Job Schemas
// ==========================================

export const CreateJobSchema = z.object({
  name: z.string().min(1, "Job name is required"),
  queueId: z.string().uuid("Invalid Queue ID"),
  type: z.nativeEnum(JobType).default(JobType.IMMEDIATE),
  payload: z.record(z.any()).default({}),
  cronExpression: z.string().optional(), // For CRON or RECURRING jobs
  runAt: z.string().datetime().optional(), // For DELAYED or SCHEDULED jobs
  maxAttempts: z.number().int().min(1).optional(),
  timeout: z.number().int().min(1000).optional(),
  parentJobId: z.string().uuid().optional(), // For dependency/workflow jobs
  workflowId: z.string().uuid().optional(),
});
export type CreateJobInput = z.infer<typeof CreateJobSchema>;

// ==========================================
// Workflow / DAG Schemas
// ==========================================

export const DagNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  queueId: z.string().uuid(),
  payload: z.record(z.any()).default({}),
  timeout: z.number().int().optional(),
  maxAttempts: z.number().int().optional(),
});

export const DagEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().min(2, "Workflow name must be at least 2 characters"),
  nodes: z.array(DagNodeSchema).min(1, "Workflow must contain at least one node"),
  edges: z.array(DagEdgeSchema),
});
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

// ==========================================
// Notification Config Schemas
// ==========================================

export const CreateNotificationSchema = z.object({
  type: z.nativeEnum(NotificationType),
  config: z.object({
    email: z.string().email().optional(),
    webhookUrl: z.string().url().optional(), // Slack or Discord
  }),
});
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
