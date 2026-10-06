import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

function buildHandler(secret: string) {
  return createMcpHandler(
    (server) => {
      server.registerTool(
        "ping",
        {
          title: "Ping",
          description: "Health check. Returns pong plus server time.",
          inputSchema: {},
        },
        async () => ({
          content: [{ type: "text", text: `pong @ ${new Date().toISOString()}` }],
        })
      );

      server.registerTool(
        "current_time",
        {
          title: "Current time",
          description: "Get the current time in an IANA timezone, e.g. America/Toronto.",
          inputSchema: { timezone: z.string().default("America/Toronto") },
        },
        async ({ timezone }) => {
          try {
            const now = new Date().toLocaleString("en-CA", { timeZone: timezone });
            return { content: [{ type: "text", text: `${timezone}: ${now}` }] };
          } catch {
            return {
              isError: true,
              content: [{ type: "text", text: `Unknown timezone: ${timezone}` }],
            };
          }
        }
      );

      server.registerTool(
        "fetch_json",
        {
          title: "Fetch JSON",
          description: "GET a public URL and return the response body (first 5000 chars).",
          inputSchema: { url: z.string().url() },
        },
        async ({ url }) => {
          const res = await fetch(url, { headers: { "user-agent": "kalp-mcp" } });
          const body = (await res.text()).slice(0, 5000);
          return { content: [{ type: "text", text: `HTTP ${res.status}\n\n${body}` }] };
        }
      );
    },
    { serverInfo: { name: "kalp-mcp", version: "0.1.0" } },
    { basePath: `/${secret}`, maxDuration: 60, verboseLogs: true }
  );
}

async function route(
  req: Request,
  ctx: { params: Promise<{ secret: string; transport: string }> }
) {
  const { secret } = await ctx.params;
  if (!process.env.MCP_SECRET || secret !== process.env.MCP_SECRET) {
    return new Response("Not found", { status: 404 });
  }
  return buildHandler(secret)(req);
}

export { route as GET, route as POST, route as DELETE };
