import { z } from "zod";


// ---------------------- REGISTER ----------------------
export const registerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters"),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format").max(100, "Email cannot exceed 100 characters")),
  password: z.string().min(6, "Password must be at least 6 characters").max(72, "Password cannot exceed 72 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
  callbackUrl: z.string().startsWith("/", "Invalid callback URL").max(300).optional(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
// For TypeScript inference (extended with callbackUrl)
export type RegisterType = z.infer<typeof registerSchema>;


// ---------------------- LOGIN ----------------------
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format").max(100, "Email cannot exceed 100 characters")),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean().optional(),
  callbackUrl: z.string().startsWith("/", "Invalid callback URL").max(300).optional(),
});
// TypeScript inference (extended with callbackUrl)
export type LoginType = z.infer<typeof loginSchema>;


// ----------------------  FORGOT PASSWORD ----------------------
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format").max(100, "Email cannot exceed 100 characters")),
});
// TypeScript inference
export type ForgotPasswordType = z.infer<typeof forgotPasswordSchema>;


// ----------------------   OTTP ----------------------
export const otpSchema = z.object({  
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d{6}$/, "OTP must contain only digits"),
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format").max(100, "Email cannot exceed 100 characters")),
});
// TypeScript inference 
export type OtpType = z.infer<typeof otpSchema>;


// ---------------------- RESET PASSWORD ----------------------
export const resetPasswordSchema = z.object({  
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email format").max(100, "Email cannot exceed 100 characters")),
  resetToken: z.uuid("Invalid reset token"),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(72, "New password cannot exceed 72 characters"),
  confirmNewPassword: z.string().min(1, "Confirm your new password"),
}).refine((data) => data.newPassword === data.confirmNewPassword, { path: ["confirmNewPassword"], message: "Passwords do not match" });
// TypeScript inference
export type ResetPasswordType = z.infer<typeof resetPasswordSchema> ;


// ---------------------- UPDATE PROFILE ----------------------
export const updateProfileSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50, "Name cannot exceed 50 characters"),
  bio: z.string().max(200, "Bio cannot exceed 200 characters").optional().nullable(),
  image: z.instanceof(File).optional().nullable(),  
});
// TypeScript inference
export type UpdateProfileType = z.infer<typeof updateProfileSchema>;


// ---------------------- CHANGE PASSWORD (FROM PROFILE) ----------------------
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6, "New password must be at least 6 characters").max(72, "New password cannot exceed 72 characters"),
  confirmNewPassword: z.string().min(6, "Confirm your new password"),
}).refine((data) => data.newPassword === data.confirmNewPassword, { path: ["confirmNewPassword"], message: "Passwords do not match"});
// TypeScript inference
export type ChangePasswordType = z.infer<typeof changePasswordSchema>;


// -------- CREATE/UPDATE POST --------
export const createPostSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters long").max(120, "Title cannot exceed 120 characters"),
  content: z.string().min(10, "Content must be at least 10 characters long").trim(),
  image: z.any().optional(),
  taggedUsers: z.array(z.string()).optional(),
  privacy: z.enum(['PUBLIC', 'FRIENDS', 'ONLY_ME', 'CUSTOM']).default('PUBLIC'),  
  allowed: z.array(z.string()).optional().default([]),
  blocked: z.array(z.string()).optional().default([]),
});
// TypeScript inference (extended with id, createdAt, author)
export type PostType = z.infer<typeof createPostSchema> & {id : string, image: string | null, createdAt: string, updatedAt?: string, savedAt?: string, originalPost?: PostType, isEdited: boolean; isShared?: boolean; myReaction?: reactionType, reactionCount: number; commentCount: number; hasShared: boolean; shareCount: number; author: { id: string; name: string; image: string; }} ;
// TypeScript inference for reaction types
export type reactionType = "LIKE" | "LOVE" | "HAHA" | "WOW" | "SAD" | "ANGRY";  


// -------- CREATE/UPDATE COMMENT --------
export const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(700, "Comment cannot exceed 700 characters"),
  taggedUsers: z.array(z.string()).optional(),
  parentId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid parent comment ID format").optional().nullable(),
});
// For TypeScript inference
export type CommentType = z.infer<typeof commentSchema>  & { id: string; createdAt: string; updatedAt?: string; isEdited?: boolean; myReaction?: reactionType; reactionCount: number; replyCount: number; user: { id: string; name: string; image?: string }; };


// -------- SHARE POST --------
export const shareSchema = z.object({
  message: z.string().max(300).optional(),
  privacy: z.enum(["PUBLIC", "FRIENDS", "ONLY_ME"]),
});
// For TypeScript inference
export type ShareInput = z.infer<typeof shareSchema>;


// --------------- REPORT -------------------
export const reportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT", "USER"]),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid target ID"),
  reason: z.enum([
    "SPAM", "HARASSMENT", "HATE_SPEECH", "VIOLENCE", "NUDITY",
    "FALSE_INFO", "COPYRIGHT", "IMPERSONATION", "OTHER",
  ], { message: "Please select a reason" }),
  description: z.string().max(500, "Description cannot exceed 500 characters").optional().or(z.literal("")),
});
// For TypeScript inference
export type ReportInputType = z.infer<typeof reportSchema>;
export type ReportReasonType = ReportInputType["reason"];

// ---------------------- REPORT (client-side types) ----------------------
export type ReportStatusType = "PENDING" | "REVIEWED" | "ACTIONED" | "DISMISSED";
export type ReportTargetType = "POST" | "COMMENT" | "USER";
export type MyReportType = {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReasonType;
  status: ReportStatusType;
  createdAt: string;
  reviewedAt: string | null;
};
export type MyReportsResponse = {
  reports: MyReportType[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  error?: string;
};


// ----------- TypeScript type for notifications, Used in Notifications components -------
export type Notification = {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  reactionType?: string | null;
  sender?: { id: string; name: string; image: string | null } | null;
  post?: { id: string; title: string | null } | null;
  comment?: { id: string; content: string } | null;
  request?: { id: string; requester: { id: string; name: string; image: string | null }; receiver: { id: string; name: string; image: string | null } } | null;
  tag?: { id: string; post?: { id: string; title: string | null } | null; comment?: { id: string } | null; taggedBy: { id: string; name: string; image: string | null } } | null;
}
