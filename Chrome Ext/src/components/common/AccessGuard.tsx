import React, { useState } from "react";
import AccessDenied from "./AccessDenied";
import { ALLOWED_REFERRER_ORIGINS } from "../../config/accessConfig";

export { ALLOWED_REFERRER_ORIGINS };

function isLocalDev(): boolean {
  const { hostname } = window.location;
  // Covers all ports: localhost:5173 (Vite dev), localhost:4173 (preview), etc.
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Returns true when the page load is legitimate:
 *  - Always allowed in local development.
 *  - In production: ?email= must be present AND the referrer must come from
 *    one of the ALLOWED_REFERRER_ORIGINS (i.e. the app is embedded in the
 *    right portal).
 */
export function validateAccess(): boolean {
  if (isLocalDev()) return true;

  // Email in URL params is mandatory.
  const email = new URLSearchParams(window.location.search)
    .get("email")
    ?.trim();
  if (!email) return false;

  // Referrer must originate from an allowed portal.
  const referrer = document.referrer;
  if (!referrer) return false;
  try {
    const referrerOrigin = new URL(referrer).origin;
    return ALLOWED_REFERRER_ORIGINS.includes(referrerOrigin);
  } catch {
    return false;
  }
}

/**
 * Wraps its children and renders <AccessDenied /> instead when the access
 * check fails. The check runs once synchronously at mount so no flash occurs.
 */
const AccessGuard: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [allowed] = useState(() => validateAccess());

  if (!allowed) return <AccessDenied />;

  return <>{children}</>;
};

export default AccessGuard;
