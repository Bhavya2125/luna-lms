"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function call<T = unknown>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("You're offline. Reconnect to save changes.", 0);
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth")) window.location.replace(new URL("/login", window.location.origin).href);
    throw new ApiError((json as { error?: string })?.error ?? "Something went wrong", res.status);
  }
  return json as T;
}

export const fetcher = <T,>(url: string) => call<T>("GET", url);
export const post = <T = unknown,>(url: string, body?: unknown) => call<T>("POST", url, body ?? {});
export const patch = <T = unknown,>(url: string, body: unknown) => call<T>("PATCH", url, body);
export const del = <T = unknown,>(url: string, body?: unknown) => call<T>("DELETE", url, body);

export const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const waLink = (phone: string) => `https://wa.me/${phone}`;
