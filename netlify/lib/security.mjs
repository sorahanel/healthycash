import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code) => {
  throw new HttpError(status, code);
};
export const random = () => randomBytes(32).toString("base64url");
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const validSecret = (value) =>
  typeof value === "string" && /^[\w-]{43}$/.test(value);
export function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function header(event, name) {
  return (
    Object.entries(event.headers || {}).find(
      ([key]) => key.toLowerCase() === name.toLowerCase(),
    )?.[1] || ""
  );
}
export function parameter(event, key) {
  if ((event.multiValueQueryStringParameters?.[key]?.length || 0) > 1)
    fail(400, "invalid_request");
  return event.queryStringParameters?.[key] || "";
}
export function cookie(event, name) {
  const values = header(event, "cookie")
    .split(";")
    .map((x) => x.trim())
    .filter((x) => x.startsWith(name + "="));
  if (values.length !== 1) return "";
  return values[0].slice(name.length + 1);
}
export const cookieName = (config, kind) =>
  `${config.secure ? "__Host-" : ""}hc_${kind}`;
export const setCookie = (config, kind, value, age) =>
  `${cookieName(config, kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${config.secure ? "; Secure" : ""}`;
export const clearCookies = (config) => [
  setCookie(config, "oauth", "", 0),
  setCookie(config, "login", "", 0),
];
const headers = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};
export function json(statusCode, body, cookies = []) {
  return {
    statusCode,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    ...(cookies.length ? { multiValueHeaders: { "Set-Cookie": cookies } } : {}),
    body: JSON.stringify(body),
  };
}
export function redirect(location, cookies = []) {
  return {
    ...json(303, {}, cookies),
    headers: { ...headers, Location: location },
  };
}
export function method(event, expected) {
  if (event.httpMethod !== expected) fail(405, "method_not_allowed");
}
export function sameOrigin(event, config) {
  if (header(event, "origin") !== config.origin)
    fail(403, "origin_not_allowed");
  const site = header(event, "sec-fetch-site");
  if (site && site !== "same-origin") fail(403, "origin_not_allowed");
}
export function body(event) {
  if (!/^application\/json(?:\s*;|$)/i.test(header(event, "content-type")))
    fail(415, "json_required");
  if (event.isBase64Encoded || Buffer.byteLength(event.body || "") > 2048)
    fail(400, "invalid_request");
  let value;
  try {
    value = JSON.parse(event.body || "{}");
  } catch {
    fail(400, "invalid_request");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(400, "invalid_request");
  return value;
}
