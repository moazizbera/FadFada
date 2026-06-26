import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export const defaultGeminiModel = "gemini-2.0-flash";

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || defaultGeminiModel;
}

export function getGeminiProvider() {
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true") {
    return "vertex";
  }

  return "api_key";
}

export function isGeminiConfigured() {
  if (getGeminiProvider() === "vertex") {
    return Boolean(process.env.GOOGLE_CLOUD_PROJECT?.trim() && process.env.GOOGLE_CLOUD_LOCATION?.trim());
  }

  return Boolean((process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim());
}

export function createGeminiClient(vercelOidcToken?: string | null, locationOverride?: string | null, apiVersionOverride?: string | null) {
  if (getGeminiProvider() === "vertex") {
    ensureGoogleCredentialsFile();
    const googleAuthOptions = createVercelOidcAuthOptions(vercelOidcToken);

    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT?.trim(),
      location: locationOverride?.trim() || process.env.GOOGLE_CLOUD_LOCATION?.trim() || "us-central1",
      apiVersion: apiVersionOverride?.trim() || "v1",
      ...(googleAuthOptions ? { googleAuthOptions } : {}),
    });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing.");
  }

  return new GoogleGenAI({ apiKey });
}

function createVercelOidcAuthOptions(vercelOidcToken?: string | null) {
  const projectNumber = process.env.GCP_PROJECT_NUMBER?.trim();
  const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL?.trim();
  const poolId = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID?.trim();
  const providerId = process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID?.trim();

  if (!projectNumber || !serviceAccountEmail || !poolId || !providerId) return null;

  return {
    credentials: {
      type: "external_account",
      audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      subject_token_supplier: {
        getSubjectToken: async () => {
          const token = vercelOidcToken?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
          if (!token) throw new Error("Vercel OIDC token is missing for Vertex AI authentication.");
          return token;
        },
      },
    },
    projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim(),
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  };
}

function ensureGoogleCredentialsFile() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (!credentialsJson) return;

  const credentialsPath = join(tmpdir(), "fadfada-google-credentials.json");
  writeFileSync(credentialsPath, credentialsJson, { encoding: "utf8", mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}
