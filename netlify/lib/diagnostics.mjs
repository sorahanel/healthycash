import { json } from "./security.mjs";

// Return only fixed labels. SDK messages may contain credentials, URLs or
// document paths; never copy messages, stacks, metadata or requests into logs.
export function setupDiagnostic(stage, error) {
  const code = error?.code;
  const message = typeof error?.message === "string" ? error.message : "";
  const oauthError = error?.response?.data?.error;
  if (
    ["app/invalid-credential", "auth/invalid-credential"].includes(code)
  )
    return "firebase_credentials_invalid";
  if (
    [16, "UNAUTHENTICATED", "unauthenticated"].includes(code) ||
    ["invalid_grant", "invalid_client", "unauthorized_client"].includes(oauthError) ||
    /invalid_grant|invalid jwt signature/i.test(message)
  )
    return "firebase_credentials_rejected";
  if (stage === "oauth_state_create") {
    if (/\bSERVICE_DISABLED\b/.test(message))
      return "firestore_api_disabled";
    if ([5, "NOT_FOUND", "not-found"].includes(code))
      return "firestore_not_found";
    if ([7, "PERMISSION_DENIED", "permission-denied"].includes(code))
      return "firestore_permission_denied";
    if ([9, "FAILED_PRECONDITION", "failed-precondition"].includes(code))
      return "firestore_precondition_failed";
    if ([8, "RESOURCE_EXHAUSTED", "resource-exhausted"].includes(code))
      return "firestore_quota_exceeded";
    if ([4, 14, "DEADLINE_EXCEEDED", "UNAVAILABLE", "deadline-exceeded", "unavailable"].includes(code))
      return "firestore_unavailable";
  }
  return "auth_setup_failed";
}

export function setupFailureResponse(stage, error, publicError, log = console.error) {
  const safeStage = ["firebase_initialize", "oauth_state_create"].includes(stage)
    ? stage
    : "unknown";
  const diagnostic = setupDiagnostic(safeStage, error);
  log(JSON.stringify({
    event: "auth_setup_failure",
    stage: safeStage,
    diagnostic,
  }));
  return json(503, {
    error: publicError === "auth_unavailable" ? "auth_unavailable" : "server_error",
    diagnostic,
  });
}
