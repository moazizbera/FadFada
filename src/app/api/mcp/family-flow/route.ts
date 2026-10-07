import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFamilyFlowMcpServer } from "../../../../lib/familyFlowMcp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

async function handleMcpRequest(request: NextRequest) {
  const token = process.env.FAMILY_FLOW_MCP_TOKEN?.trim();
  const parentId = process.env.FAMILY_FLOW_MCP_PARENT_ID?.trim();

  if (!token || !parentId) {
    return NextResponse.json({ error: "MCP_NOT_CONFIGURED" }, { status: 503, headers: corsHeaders });
  }

  if (!isAuthorized(request, token)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401, headers: corsHeaders });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createFamilyFlowMcpServer(parentId);

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCorsHeaders(response);
  } catch (error) {
    console.error("Family Flow MCP request failed", error);
    return NextResponse.json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }, { status: 500, headers: corsHeaders });
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

function isAuthorized(request: NextRequest, token: string) {
  const providedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!providedToken || providedToken.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(providedToken), Buffer.from(token));
}

function withCorsHeaders(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, mcp-session-id, mcp-protocol-version, Last-Event-ID",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};