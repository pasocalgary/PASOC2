// Server-side helper for PASOC moderation using Azure AI Content Safety
import "server-only";
import ContentSafetyClient, { isUnexpected } from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";

export const MODERATED_FIELDS = new Set([
  "firstName",
  "lastName",
  "preferredName",
  "currentOrgInvolvement",
  "positionsHeld",
  "title",
  "body",
  "name",
  "description",
]);

const DEFAULT_THRESHOLDS = {
  Hate: 4,
  Sexual: 4,
  Violence: 4,
  SelfHarm: 4,
};

const NAME_FIELD_THRESHOLDS = {
  Hate: 4,
  Sexual: 4,
  Violence: 4,
  SelfHarm: 4,
};

let cachedClient = null;

function getContentSafetyClient() {
  if (cachedClient) return cachedClient;

  const endpoint = process.env.CONTENT_SAFETY_ENDPOINT;
  const key = process.env.CONTENT_SAFETY_KEY;

    // 👉 ADD LOGS HERE
  console.log("CONTENT_SAFETY_ENDPOINT:", endpoint);
  console.log("CONTENT_SAFETY_KEY exists:", Boolean(key));

  if (!endpoint || !key) {
    throw new Error(
      "Azure AI Content Safety is not configured. Missing CONTENT_SAFETY_ENDPOINT or CONTENT_SAFETY_KEY."
    );
  }

  cachedClient = ContentSafetyClient(endpoint, new AzureKeyCredential(key));
  return cachedClient;
}

function normalizeCategoryName(category) {
  const map = {
    hate: "Hate",
    sexual: "Sexual",
    violence: "Violence",
    selfharm: "SelfHarm",
    "self-harm": "SelfHarm",
    self_harm: "SelfHarm",
  };

  return map[String(category).toLowerCase()] ?? String(category);
}

export function shouldModerateField(key) {
  return MODERATED_FIELDS.has(key);
}

export async function analyzeTextSafety(text, options = {}) {
  const value = typeof text === "string" ? text.trim() : "";
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) };

  if (!value) {
    return {
      ok: true,
      shouldBlock: false,
      scores: {},
      matchedCategories: [],
      raw: null,
    };
  }

  const client = getContentSafetyClient();

  const response = await client.path("/text:analyze").post({
    body: {
      text: value,
    },
  });

  console.log("STATUS:", response.status);
  console.log("FULL AZURE RESPONSE:", JSON.stringify(response.body, null, 2));

  if (isUnexpected(response)) {
    throw new Error(`Azure request failed with status ${response.status}`);
  }

  // ✅ 👉 ADD IT RIGHT HERE
  if (!response.body?.categoriesAnalysis?.length) {
    console.log("⚠️ No categories returned from Azure — failing closed");

    return {
      ok: false,
      shouldBlock: true,
      scores: {},
      matchedCategories: [],
      raw: response.body,
    };
  }

  // 👇 existing logic continues
  const categoriesAnalysis = response.body.categoriesAnalysis;

  const scores = {};
  const matchedCategories = [];

  for (const item of categoriesAnalysis) {
    const category = normalizeCategoryName(item.category);
    const severity = Number(item.severity ?? 0);
    scores[category] = severity;

    const threshold = thresholds[category] ?? 4;
    if (severity >= threshold) {
      matchedCategories.push({ category, severity, threshold });
    }
  }

  return {
    ok: true,
    shouldBlock: matchedCategories.length > 0,
    scores,
    matchedCategories,
    raw: response.body,
  };
}

export async function shouldRejectForModeration(key, value, options = {}) {
  if (!shouldModerateField(key)) {
    return {
      shouldReject: false,
      reason: null,
      scores: {},
      matchedCategories: [],
      raw: null,
    };
  }

  const isNameField =
    key === "firstName" || key === "lastName" || key === "preferredName";

  const result = await analyzeTextSafety(value, {
    ...options,
    thresholds: isNameField
      ? { ...NAME_FIELD_THRESHOLDS, ...(options.thresholds ?? {}) }
      : options.thresholds,
  });

  return {
    shouldReject: result.shouldBlock,
    reason: result.shouldBlock
      ? "Please remove inappropriate or harmful language from this field."
      : null,
    scores: result.scores,
    matchedCategories: result.matchedCategories,
    raw: result.raw,
  };
}

export function getModerationErrorMessage(result) {
  if (!result?.matchedCategories?.length) {
    return "Please remove inappropriate or harmful language from this field.";
  }

  const labels = result.matchedCategories.map((item) => item.category).join(", ");
  return `Please remove inappropriate or harmful language from this field. Flagged categories: ${labels}.`;
}