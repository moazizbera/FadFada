import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, requireParentWorkspace } from "../../../../lib/auth";

export const runtime = "nodejs";

const ALLOWED_TOOLS = [
  "get_family_routine",
  "create_family_routine",
  "reschedule_family_routine",
  "approve_family_routine",
] as const;

type TranscriptEntry = { direction: "request" | "response"; payload: unknown };

// Acts as a real MCP client: sends JSON-RPC over Streamable HTTP to the
// self-hosted MCP server at /api/mcp/family-flow. The bearer token never
// reaches the browser; it is read from the environment server-side.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const parentContext = requireParentWorkspace(session?.user);

  if (!parentContext.ok) {
    return NextResponse.json({ error: parentContext.error }, { status: parentContext.status });
  }

  const token = process.env.FAMILY_FLOW_MCP_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "MCP_NOT_CONFIGURED" }, { status: 503 });
  }

  const body = await readRequestBody(request);
  if (!body) return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });

  const action = readString(body.action);
  const rpc = buildRpcRequest(action, body);
  if (!rpc) return NextResponse.json({ error: "UNSUPPORTED_ACTION" }, { status: 400 });

  const target = `${request.nextUrl.origin}/api/mcp/family-flow`;
  const transcript: TranscriptEntry[] = [{ direction: "request", payload: rpc }];

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(rpc),
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = text;
    try {
      payload = JSON.parse(text);
    } catch {
      // keep raw text when the body is not JSON
    }
    transcript.push({ direction: "response", payload: { httpStatus: response.status, payload } });

    return NextResponse.json({ action, transcript }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "MCP_CALL_FAILED" }, { status: 502 });
  }
}

function buildRpcRequest(action: string, body: Record<string, unknown>): Record<string, unknown> | null {
  const id = crypto.randomInt(1, 1_000_000);

  if (action === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "fadfada-web-console", version: "0.1.112" },
      },
    };
  }

  if (action === "tools_list") {
    return { jsonrpc: "2.0", id, method: "tools/list", params: {} };
  }

  if (action === "tools_call") {
    const name = readString(body.name);
    if (!(ALLOWED_TOOLS as readonly string[]).includes(name)) return null;
    const rawArguments = body.arguments;
    const args = rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments) ? rawArguments : {};
    return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
  }

  return null;
}

async function readRequestBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
