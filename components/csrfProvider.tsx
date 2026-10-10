"use client";

import { useEffect } from "react";
import { loadCsrf } from "@/lib/actions/authActions";

// ------------------ CSRF PROVIDER COMPONENT ------------------
// This minimal component loads the CSRF token when the app initializes (imported in RootLayout.tsx)
export function CsrfProvider() {
  useEffect(() => {
    loadCsrf().catch(() => {});   // runs in browser.. if it fails, silently ignore, will be set on next login/refresh
  }, []);

  return null;
}
