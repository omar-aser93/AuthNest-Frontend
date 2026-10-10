"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createReportAction } from "@/lib/actions/reportActions";
import type { ReportReasonType } from "@/lib/validator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "POST" | "COMMENT" | "USER";
  targetId: string;
}

// Fixed list — keep in sync with the backend ReportReason enum
const REASONS: { value: ReportReasonType; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "VIOLENCE", label: "Violence or dangerous content" },
  { value: "NUDITY", label: "Nudity or sexual content" },
  { value: "FALSE_INFO", label: "False information" },
  { value: "COPYRIGHT", label: "Copyright violation" },
  { value: "IMPERSONATION", label: "Impersonation" },
  { value: "OTHER", label: "Other" },
];

// component that renders the report dialog (targetType -> POST | COMMENT | USER)
export default function ReportDialog({ open, onOpenChange, targetType, targetId }: Props) {
  // form states 
  const [reason, setReason] = useState<ReportReasonType | "">("");
  const [description, setDescription] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // function to reset the form
  const reset = () => {
    setReason("");
    setDescription("");
    setReasonError(null);
  };

  // function to handle open change
  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // function to handle submit
  const handleSubmit = () => {
    // validate reason
    if (!reason) {
      setReasonError("Please select a reason");
      return;
    }
    setReasonError(null);
    // create report server-action, if error, show error toast, if success, show success toast and close the dialog
    startTransition(async () => {
      const res = await createReportAction({ targetType, targetId, reason, description: description.trim() });
      if (res?.error) {
        const msg = typeof res.error === "string" ? res.error : "Please check the form and try again";
        toast.error(msg);
        return;
      }
      toast.success("Thanks — our team will review this.");
      handleOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report content</DialogTitle>
          <DialogDescription>
            Help us understand what&apos;s wrong. Reports are anonymous to the person you&apos;re reporting.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {/* Reason */}
          <Field data-invalid={!!reasonError}>
            <FieldLabel htmlFor="report-reason">Reason</FieldLabel>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReasonType)}>
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={reasonError ? [{ message: reasonError }] : []} />
          </Field>

          {/* Optional description */}
          <Field>
            <FieldLabel htmlFor="report-description">
              Additional details <span className="text-muted-foreground font-normal">(optional)</span>
            </FieldLabel>
            <Textarea id="report-description" value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything else that will help us review…" rows={3} maxLength={500} />
            <p className="text-xs text-muted-foreground text-end">{description.length}/500</p>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !reason}>
            {isPending ? "Submitting…" : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}