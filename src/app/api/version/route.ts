export const dynamic = "force-dynamic";

/** The deploy this server is running. Pages compare it with the version they loaded. */
export function GET() {
  return Response.json({ build: process.env.NEXT_PUBLIC_BUILD_ID }, { headers: { "Cache-Control": "no-store" } });
}
