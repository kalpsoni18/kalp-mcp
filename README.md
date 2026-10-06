# kalp-mcp

Remote MCP server (Next.js + `mcp-handler`) for Vercel's free Hobby plan, wired up as a Claude custom connector.

Endpoint: `https://<your-app>.vercel.app/<MCP_SECRET>/mcp`
Wrong secret → 404. The secret in the path is your auth (claude.ai custom connectors take a URL or OAuth, not a static bearer header).

## Tools included

| Tool | What it does |
|---|---|
| `ping` | Health check, returns server time |
| `current_time` | Time in any IANA timezone (default America/Toronto) |
| `fetch_json` | GET a public URL, returns first 5000 chars |

## 1. Run locally

```bash
npm install
openssl rand -hex 24
```

Copy that output, then:

```bash
echo "MCP_SECRET=<paste-hex>" > .env.local
npm run dev
```

Test with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Transport: **Streamable HTTP**, URL: `http://localhost:3000/<secret>/mcp`

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "init kalp-mcp"
gh repo create kalp-mcp --private --source=. --push
```

## 3. Deploy to Vercel

```bash
npm i -g vercel
vercel login
vercel link
vercel env add MCP_SECRET production
vercel --prod
```

Or: vercel.com → Add New → Project → import `kalp-mcp` → add env var `MCP_SECRET` → Deploy. After that every `git push` auto-deploys.

Sanity check:

```bash
curl -s -X POST https://<your-app>.vercel.app/<secret>/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 4. Connect to Claude

claude.ai → Settings → Connectors → **Add custom connector** → name it → paste `https://<your-app>.vercel.app/<secret>/mcp` → Add.
Then in a chat: tools menu → toggle the connector on.

Claude Code:

```bash
claude mcp add --transport http kalp-mcp https://<your-app>.vercel.app/<secret>/mcp
```

## 5. Manage connectors

| Task | How |
|---|---|
| Turn tools on/off | Settings → Connectors → your connector → toggle individual tools |
| Enable per chat | Tools menu in the chat composer |
| Add a new tool | Add another `server.registerTool(...)` in `app/[secret]/[transport]/route.ts` → `git push` → Vercel redeploys; Claude picks it up on next connect |
| Rotate secret | `vercel env rm MCP_SECRET production` → `vercel env add MCP_SECRET production` → `vercel --prod` → update URL in the connector |
| Logs | `vercel logs <your-app>.vercel.app` or Vercel dashboard → Logs |
| Remove | Settings → Connectors → connector → Remove |

## Adding a tool (template)

```ts
server.registerTool(
  "my_tool",
  {
    title: "My tool",
    description: "What Claude should know about when to use it.",
    inputSchema: { query: z.string() },
  },
  async ({ query }) => ({
    content: [{ type: "text", text: `you asked: ${query}` }],
  })
);
```

Secrets for APIs (Airtable, NocoDB, etc.) go in Vercel env vars, read with `process.env.X` inside the tool.

## Notes

- Hobby plan function timeout is capped; `maxDuration: 60` is set in the route. Keep tools fast.
- Free Claude plan = 1 custom connector. Pro/Max = more. One connector can hold many tools, so put everything in this one server.
- Pinned `@modelcontextprotocol/sdk@1.26.0` because `mcp-handler@1.1.0` requires exactly that version.
- Need real per-user auth later? Swap the path secret for OAuth via `withMcpAuth` (Clerk / Auth0 / WorkOS).
