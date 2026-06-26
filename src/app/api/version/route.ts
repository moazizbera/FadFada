import packageJson from "../../../../package.json";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || "local";
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || "local";
  const version = `${packageJson.version}-${commitSha.slice(0, 7)}`;
  const aiProvider = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true" ? "vertex" : "api_key";

  return NextResponse.json(
    {
      app: "FadFada | فضفضة",
      version,
      packageVersion: packageJson.version,
      commitSha,
      deploymentId,
      ai: {
        provider: aiProvider,
        model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
        location: aiProvider === "vertex" ? process.env.GOOGLE_CLOUD_LOCATION || "us-central1" : null,
        keylessAuth: aiProvider === "vertex" && Boolean(process.env.GCP_WORKLOAD_IDENTITY_POOL_ID && process.env.GCP_SERVICE_ACCOUNT_EMAIL),
      },
      checkedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}