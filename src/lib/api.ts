import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getDb, type Db } from "@/db";
import { getSessionUser, type SessionUser } from "./auth";
import type { Role } from "./stages";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const isAdmin = (r: Role) => r === "admin" || r === "super_admin";
export const isSuper = (r: Role) => r === "super_admin";

type Ctx<P> = { req: NextRequest; user: SessionUser; db: Db; params: P };
type Opts = { roles?: Role[]; public?: boolean };

/** Wraps a route handler: signs the user in, checks the role, blocks cross-site writes and turns errors into JSON. */
export function api<P = Record<string, string>>(handler: (c: Ctx<P>) => Promise<unknown>, opts: Opts = {}) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin && new URL(origin).host !== req.headers.get("host")) throw new HttpError(403, "Cross-site request blocked");
      }
      const user = opts.public ? ({} as SessionUser) : await getSessionUser();
      if (!user) throw new HttpError(401, "Please sign in");
      if (opts.roles && !opts.roles.includes(user.role)) throw new HttpError(403, "You don't have access to this");
      const db = await getDb();
      const params = ctx?.params ? await ctx.params : ({} as P);
      const out = await handler({ req, user, db, params });
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) return NextResponse.json({ error: friendly(e), issues: e.issues }, { status: 400 });
      const pg = e as { code?: string; constraint?: string; cause?: { code?: string } };
      const code = pg.code ?? pg.cause?.code;
      if (code === "23505") return NextResponse.json({ error: "That already exists" }, { status: 409 });
      console.error(e);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

/** "festMonth" → "Fest month"; the last path segment names the field. */
const label = (path: PropertyKey[]) => {
  const k = String([...path].reverse().find((p) => typeof p === "string") ?? "This field");
  const s = k.replace(/([A-Z])/g, " $1").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Turns the first validation problem into a sentence a person can act on. */
function friendly(e: ZodError) {
  const i = e.issues[0];
  const name = label(i.path);
  const iss = i as { code: string; minimum?: number | bigint; maximum?: number | bigint; origin?: string };
  if (iss.code === "too_small" && iss.origin === "string") return Number(iss.minimum) <= 1 ? `${name} is required` : `${name} needs at least ${iss.minimum} characters`;
  if (iss.code === "too_big" && iss.origin === "string") return `${name} is too long (max ${iss.maximum} characters)`;
  if (iss.code === "too_small" || iss.code === "too_big") return `${name} is out of range`;
  if (iss.code === "invalid_type") return `${name} is missing or not valid`;
  return i.message && !/^Invalid/.test(i.message) ? i.message : `${name} is not valid`;
}

export async function readJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Send a JSON body");
  }
}
