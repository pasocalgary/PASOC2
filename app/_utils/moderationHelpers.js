// Server-side helper for PASOC moderation using the OpenAI Moderation API
import "server-only";
import OpenAI from "openai";

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
  "question",
  "answer",
]);

const CATEGORY_BUCKETS = {
  Hate: ["hate", "hate/threatening"],
  Sexual: ["sexual", "sexual/minors"],
  Violence: ["violence", "violence/graphic"],
  SelfHarm: ["self-harm", "self-harm/intent", "self-harm/instructions"],
};

let cachedClient = null;

function getOpenAIClient() {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI moderation is not configured. Missing OPENAI_API_KEY."
    );
  }

  cachedClient = new OpenAI({ apiKey, maxRetries: 0 });
  return cachedClient;
}

const RETRY_DELAYS_MS = [500, 1000, 2000, 4000];

function isRetryableStatus(status, code) {
  // insufficient_quota is a 429 too, but it's a billing issue, not a transient
  // rate limit - retrying it just adds latency without ever succeeding.
  if (status === 429) return code !== "insufficient_quota";
  return status >= 500 && status < 600;
}

async function createModerationWithRetry(client, params) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await client.moderations.create(params);
    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (!isRetryableStatus(error?.status, error?.code) || isLastAttempt) {
        throw error;
      }

      const delay = RETRY_DELAYS_MS[attempt] + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export function shouldModerateField(key) {
  return MODERATED_FIELDS.has(key);
}

export async function analyzeTextSafety(text) {
  const value = typeof text === "string" ? text.trim() : "";

  if (!value) {
    return {
      ok: true,
      shouldBlock: false,
      scores: {},
      matchedCategories: [],
      raw: null,
    };
  }

  const client = getOpenAIClient();

  let response;
  try {
    response = await createModerationWithRetry(client, {
      model: "omni-moderation-latest",
      input: value,
    });
  } catch (error) {
    console.error(
      "OpenAI moderation request failed:",
      error?.status,
      error?.code,
      error?.message
    );

    // Fail-open: don't block real users if the moderation API is down.
    return {
      ok: false,
      shouldBlock: false,
      scores: {},
      matchedCategories: [],
      raw: null,
    };
  }

  const result = response?.results?.[0];

  if (!result) {
    return {
      ok: false,
      shouldBlock: true,
      scores: {},
      matchedCategories: [],
      raw: response,
    };
  }

  const scores = {};
  const matchedCategories = [];

  for (const [bucket, keys] of Object.entries(CATEGORY_BUCKETS)) {
    const bucketScore = Math.max(...keys.map((k) => result.category_scores?.[k] ?? 0));
    scores[bucket] = bucketScore;

    const flagged = keys.some((k) => result.categories?.[k]);
    if (flagged) {
      matchedCategories.push({ category: bucket, score: bucketScore });
    }
  }

  return {
    ok: true,
    shouldBlock: matchedCategories.length > 0,
    scores,
    matchedCategories,
    raw: result,
  };
}

export async function shouldRejectForModeration(key, value) {
  if (!shouldModerateField(key)) {
    return {
      shouldReject: false,
      reason: null,
      scores: {},
      matchedCategories: [],
      raw: null,
    };
  }

  const result = await analyzeTextSafety(value);

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
