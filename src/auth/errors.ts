import diagnosticCodes from "../../shared/auth-diagnostics.json";

export function safeDiagnostic(value: unknown) {
  return typeof value === "string" && Object.hasOwn(diagnosticCodes, value)
    ? value as keyof typeof diagnosticCodes
    : undefined;
}

export class AuthRequestError extends Error {
  diagnostic?: keyof typeof diagnosticCodes;

  constructor(code: string, diagnostic?: unknown) {
    super(code);
    this.diagnostic = safeDiagnostic(diagnostic);
  }
}

export function supportCode(error: unknown) {
  return error instanceof AuthRequestError && error.diagnostic
    ? diagnosticCodes[error.diagnostic]
    : undefined;
}

export function firebaseSignInError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? error.code
    : "";
  const diagnostics: Record<string, keyof typeof diagnosticCodes> = {
    "auth/custom-token-mismatch": "firebase_custom_token_mismatch",
    "auth/invalid-custom-token": "firebase_custom_token_invalid",
    "auth/configuration-not-found": "firebase_auth_not_configured",
    "auth/operation-not-allowed": "firebase_auth_not_configured",
    "auth/invalid-api-key": "firebase_web_config_missing",
    "auth/app-not-authorized": "firebase_web_config_missing",
    "auth/network-request-failed": "firebase_signin_unavailable",
  };
  if (code === "auth/user-disabled") return new AuthRequestError("account_disabled");
  return new AuthRequestError(
    "login_failed",
    typeof code === "string" && Object.hasOwn(diagnostics, code)
      ? diagnostics[code]
      : "firebase_signin_failed",
  );
}
