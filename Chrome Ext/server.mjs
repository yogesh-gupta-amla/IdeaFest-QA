import { createServer } from "node:http";
import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

loadEnvFiles();

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const JIRA_PROXY_PREFIX = normalizeProxyPrefix(
  process.env.JIRA_PROXY_PREFIX ||
    process.env.VITE_JIRA_PROXY_PREFIX ||
    "/jira-proxy",
);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function loadEnvFiles() {
  const envFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      applyEnvFile(content);
    } catch {
      // Ignore missing env files.
    }
  }
}

function applyEnvFile(content) {
  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeProxyPrefix(prefix) {
  if (!prefix) return "/jira-proxy";
  const withSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withSlash.replace(/\/+$/, "") || "/jira-proxy";
}

function getHeaderValue(rawValue) {
  if (!rawValue) return "";
  return Array.isArray(rawValue) ? rawValue[0] || "" : rawValue;
}

function isValidJiraOrigin(baseUrl) {
  try {
    const parsed = new URL(baseUrl);
    return (
      parsed.protocol === "https:" && parsed.hostname.endsWith(".atlassian.net")
    );
  } catch {
    return false;
  }
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function writeJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function proxyJiraRequest(req, res, requestUrl) {
  const baseUrl =
    getHeaderValue(req.headers["x-jira-base-url"]) ||
    requestUrl.searchParams.get("jiraBaseUrl") ||
    "";
  if (!baseUrl) {
    writeJson(res, 400, {
      error: "Missing x-jira-base-url header",
    });
    return;
  }

  if (!isValidJiraOrigin(baseUrl)) {
    writeJson(res, 400, {
      error: "Invalid Jira base URL. Expected https://<site>.atlassian.net",
    });
    return;
  }

  const jiraOrigin = new URL(baseUrl).origin;
  const proxyPath = requestUrl.pathname.slice(JIRA_PROXY_PREFIX.length) || "/";
  const upstreamParams = new URLSearchParams(requestUrl.searchParams);
  upstreamParams.delete("jiraBaseUrl");
  const upstreamQuery = upstreamParams.toString();
  const targetUrl = new URL(
    `${proxyPath}${upstreamQuery ? `?${upstreamQuery}` : ""}`,
    `${jiraOrigin}/`,
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (
      lower === "host" ||
      lower === "origin" ||
      lower === "referer" ||
      lower === "content-length" ||
      lower === "x-jira-base-url" ||
      lower === "x-jira-authorization" ||
      lower === "connection"
    ) {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const proxiedAuthorization = getHeaderValue(
    req.headers["x-jira-authorization"],
  );
  if (proxiedAuthorization) {
    headers.set("authorization", proxiedAuthorization);
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const method = (req.method || "GET").toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await readRequestBody(req) : undefined;

  try {
    const upstream = await fetch(targetUrl.toString(), {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      redirect: "manual",
    });

    res.statusCode = upstream.status;
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === "transfer-encoding") return;
      res.setHeader(key, value);
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    res.end(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Jira proxy request failed";
    writeJson(res, 502, { error: message });
  }
}

async function serveStatic(req, res, requestUrl) {
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.endsWith("/")) pathname += "index.html";

  const requestedPath = path.normalize(path.join(distDir, pathname));
  const isSafePath =
    requestedPath === distDir ||
    requestedPath.startsWith(`${distDir}${path.sep}`);

  if (!isSafePath) {
    writeJson(res, 403, { error: "Forbidden path" });
    return;
  }

  let filePath = requestedPath;
  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch {
    filePath = path.join(distDir, "index.html");
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader(
      "Content-Type",
      MIME_TYPES[ext] || "application/octet-stream",
    );
    createReadStream(filePath).pipe(res);
  } catch {
    writeJson(res, 500, { error: "Failed to serve static file" });
  }
}

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );

    if (requestUrl.pathname.startsWith(JIRA_PROXY_PREFIX)) {
      await proxyJiraRequest(req, res, requestUrl);
      return;
    }

    await serveStatic(req, res, requestUrl);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    writeJson(res, 500, { error: message });
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    `DSR app server running at http://${HOST}:${PORT} (proxy: ${JIRA_PROXY_PREFIX})`,
  );
});
