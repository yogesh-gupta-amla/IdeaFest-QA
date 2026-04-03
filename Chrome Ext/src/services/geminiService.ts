import { storageGet } from "./chromeStorage";

// WARNING: Hardcoding API keys in source is insecure and not recommended for
// production or shared repositories. If you understand the risk and still
// want to hardcode your key for local use, paste it below as a string.
// Example: const HARDCODED_GEMINI_API_KEY = "AIza...";
const HARDCODED_GEMINI_API_KEY = "AIzaSyAA2AYhUeFMkmztXvFTMBbmbFsalmdSf34"; // <-- paste your key here if you insist on hardcoding

export interface CallGeminiOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function callGemini(
  prompt: string,
  opts: CallGeminiOptions = {},
): Promise<string> {
  const modelName = opts.model ?? "gemini-flash-latest";
  let apiKey = opts.apiKey;

  // If a hardcoded key is present (developer opted in), prefer it.
  if (!apiKey && HARDCODED_GEMINI_API_KEY) {
    apiKey = HARDCODED_GEMINI_API_KEY;
  }

  if (!apiKey) {
    try {
      const store = await storageGet(["geminiApiKey"]);
      if (store && (store as any).geminiApiKey) {
        apiKey = String((store as any).geminiApiKey);
      }
      // dev fallback: Vite env var (VITE_GEMINI_API_KEY) can be used for local testing
      if (!apiKey) {
        try {
          const envKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY;
          if (envKey) apiKey = String(envKey);
        } catch {
          // ignore if import.meta not available in this environment
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Pass opts.apiKey, set chrome.storage.local.geminiApiKey, or set an env var for dev.",
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelName,
  )}:generateContent`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    // NOTE: The `generateContent` endpoint variant used by some Gemini models
    // does not accept top-level fields like `temperature` or `maxOutputTokens`.
    // Keep payload minimal to avoid "Unknown name" errors from the API.
  };

  // Use a longer default timeout to accommodate slower model responses.
  const timeoutDefault = opts.timeoutMs ?? 60000; // 60s

  // Simple retry logic: try up to 3 times for transient network/abort errors.
  let attempt = 0;
  const maxAttempts = 3;
  let lastError: any = null;
  
  // Quick offline check
  try {
    if (typeof navigator !== "undefined" && (navigator as any).onLine === false) {
      throw new Error("Network appears offline (navigator.onLine === false)");
    }
  } catch {
    // ignore if navigator isn't available
  }
  while (attempt < maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutDefault);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(id);

      const text = await res.text();

      if (!res.ok) {
        throw new Error(`Gemini API error ${res.status}: ${text}`);
      }

      try {
        const json = JSON.parse(text);
        // Try multiple possible shapes. Some responses embed the generated
        // text under candidates[0].content.parts[0].text (object form), or
        // candidates[0].content[0].text (array form), or outputs/results paths.
        const candidateText =
          // content as array with text at index 0
          json?.candidates?.[0]?.content?.[0]?.text ??
          // content as object with parts array
          json?.candidates?.[0]?.content?.parts?.[0]?.text ??
          // content.parts may have multiple parts
          (json?.candidates?.[0]?.content?.parts
            ? json?.candidates?.[0]?.content?.parts.map((p: any) => p.text).join("\n")
            : undefined) ??
          // older shape: output
          json?.candidates?.[0]?.output ??
          // outputs/results alternate shapes
          json?.outputs?.[0]?.content?.[0]?.text ??
          json?.results?.[0]?.content?.[0]?.text ??
          // fallback: candidates[].content may be an array of objects with .text
          (Array.isArray(json?.candidates?.[0]?.content)
            ? json?.candidates?.[0]?.content.map((c: any) => c.text).join("\n")
            : undefined) ??
          null;

        if (candidateText) return String(candidateText);
        return JSON.stringify(json);
      } catch {
        return text;
      }
    } catch (err: any) {
      clearTimeout(id);
      lastError = err;

      const errName = err && err.name ? err.name : "Error";
      const errMsg = err && err.message ? err.message : String(err);
      // Log details for diagnostics
      // eslint-disable-next-line no-console
      console.warn(`Gemini request attempt ${attempt} failed: ${errName}: ${errMsg}`);

      // If this was an abort (timeout) or a network error, retry with backoff.
      const isAbort = err && (err.name === "AbortError" || (typeof DOMException !== 'undefined' && err instanceof (DOMException as any) && err.name === 'AbortError'));
      const isNetwork = err && (err instanceof TypeError || /network/i.test(errMsg));

      if (attempt < maxAttempts && (isAbort || isNetwork)) {
        // small backoff before retrying
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }

      // otherwise rethrow after cleanup
      throw err;
    }
  }

  // If we exhausted attempts, throw the last observed error
  throw lastError ?? new Error("Unknown Gemini request failure");
}
