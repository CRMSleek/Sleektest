import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { CRM_MCP_TOOLS, callCRMTool } from "@/lib/crm-agent-tools"

export const runtime = "nodejs"

function rpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result })
}

function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32603 ? 500 : 200 })
}

export async function GET() {
  return NextResponse.json({
    name: "sleekcrm-mcp",
    description: "MCP-compatible CRM tool server for Supabase records, analysis cache, and approval-gated actions.",
    tools: CRM_MCP_TOOLS,
  })
}

export async function POST(request: NextRequest) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    return rpcError(null, -32700, "Parse error")
  }

  const id = body?.id ?? null
  const method = body?.method

  if (method === "initialize") {
    return rpc(id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "sleekcrm-mcp", version: "0.1.0" },
      capabilities: { tools: {} },
    })
  }

  if (method === "tools/list") {
    return rpc(id, { tools: CRM_MCP_TOOLS })
  }

  if (method === "tools/call") {
    const user = await getCurrentUser(request)
    if (!user) return rpcError(id, -32001, "Unauthorized")

    try {
      const params = body?.params || {}
      const result = await callCRMTool(user, params.name, params.arguments || {}, request)
      return rpc(id, result)
    } catch (error: any) {
      return rpcError(id, -32603, error?.message || "Tool call failed")
    }
  }

  if (method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 })
  }

  return rpcError(id, -32601, "Method not found")
}
