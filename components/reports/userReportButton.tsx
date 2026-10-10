"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { useAuth } from "@/lib/authProvider/AuthProviderClient";
import { Button } from "@/components/ui/button";
import ReportDialog from "./reportDialog";

// component that renders the report button for a user page (the page is server component, so we need this wrapper, as we can't use the dialog directly)
export default function UserReportButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);                // state to control the report dialog
  const { user } = useAuth();                             // get current user from AuthProvider
  if (!user) return null;     // ← guests see no report button
  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Report this user" aria-label="Report this user" >
        <Flag className="h-4 w-4" />
      </Button>
      <ReportDialog open={open} onOpenChange={setOpen} targetType="USER" targetId={userId} />
    </>
  );
}