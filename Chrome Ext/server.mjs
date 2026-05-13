// Production server — Express + http-proxy-middleware
// Serves the React build and proxies /jira-proxy/* to Jira Cloud server-side.
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, "dist");

loadEnvFiles();

// IMPORTANT: Do NOT cast PORT to Number. Under IIS Node, process.env.PORT is a
// named pipe path (e.g. \\.\pipe\iisnode-xxx). Number(<pipe>) is NaN, which
// silently makes Node listen on a random TCP port that IIS cannot reach.
const PORT = process.env.PORT || 4173;
const JIRA_PROXY_PREFIX = normalizeProxyPrefix(
  process.env.JIRA_PROXY_PREFIX ||
    process.env.VITE_JIRA_PROXY_PREFIX ||
    "/jira-proxy",
);

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

function headerVal(h) {
  if (!h) return "";
  return Array.isArray(h) ? h[0] || "" : h;
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

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// ── Jira reverse proxy ────────────────────────────────────────────────────────
// Step 1: validate and extract the Jira target from headers/query.
app.use(JIRA_PROXY_PREFIX, (req, res, next) => {
  const rawBase =
    headerVal(req.headers["x-jira-base-url"]) ||
    String(req.query?.jiraBaseUrl ?? "");

  if (!rawBase || !isValidJiraOrigin(rawBase)) {
    res
      .status(400)
      .json({ error: "Missing or invalid x-jira-base-url header" });
    return;
  }

  req._jiraTarget = new URL(rawBase).origin;
  next();
});

// Step 2: forward the request server-side to Jira.
app.use(
  JIRA_PROXY_PREFIX,
  createProxyMiddleware({
    changeOrigin: true,
    secure: true,
    router: (req) => req._jiraTarget,
    on: {
      proxyReq: (proxyReq, req) => {
        // Remove relay-only headers that must not reach Jira.
        for (const h of [
          "x-jira-base-url",
          "x-jira-authorization",
          "origin",
          "referer",
        ]) {
          proxyReq.removeHeader(h);
        }

        // Map x-jira-authorization → Authorization for Jira.
        const proxiedAuth = headerVal(req.headers["x-jira-authorization"]);
        if (proxiedAuth) proxyReq.setHeader("authorization", proxiedAuth);

        if (!proxyReq.getHeader("accept")) {
          proxyReq.setHeader("accept", "application/json");
        }

        // Strip relay-only jiraBaseUrl query param before forwarding.
        if (proxyReq.path.includes("jiraBaseUrl=")) {
          const sepIdx = proxyReq.path.indexOf("?");
          if (sepIdx !== -1) {
            const params = new URLSearchParams(proxyReq.path.slice(sepIdx + 1));
            params.delete("jiraBaseUrl");
            const qs = params.toString();
            proxyReq.path =
              proxyReq.path.slice(0, sepIdx) + (qs ? `?${qs}` : "");
          }
        }
      },

      error: (err, _req, res) => {
        if (res && typeof res.status === "function" && !res.headersSent) {
          res.status(502).json({ error: err.message || "Proxy error" });
        }
      },
    },
  }),
);

// ── APT reverse proxy ────────────────────────────────────────────────────────
const APT_BASE_URL = process.env.VITE_APT_BASE_URL || "https://apt.amla.io";
const APT_PROXY_PREFIX = normalizeProxyPrefix(
  process.env.VITE_APT_PROXY_PREFIX || "/apt-proxy",
);

// Mount at root so http-proxy-middleware sees the full path and can rewrite it
// correctly (v3 does not reliably strip the Express-mounted prefix from req.url).
app.use(
  createProxyMiddleware({
    pathFilter: (path) =>
      path === APT_PROXY_PREFIX || path.startsWith(`${APT_PROXY_PREFIX}/`),
    target: APT_BASE_URL,
    changeOrigin: true,
    secure: true,
    // Object form is the only form guaranteed to work in v3
    pathRewrite: { [`^${APT_PROXY_PREFIX}`]: "" },
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward the browser's User-Agent and cookies so Cloudflare (in front
        // of apt.amla.io) does not treat this server-side request as a bot and
        // return a 403 "Enable JavaScript and cookies" challenge page.
        const ua = headerVal(req.headers["user-agent"]);
        if (ua) proxyReq.setHeader("user-agent", ua);

        const cookie = headerVal(req.headers["cookie"]);
        if (cookie) proxyReq.setHeader("cookie", cookie);

        // Remove headers that expose the proxy origin and can trigger
        // Cloudflare cross-origin/CSRF checks.
        proxyReq.removeHeader("origin");
        proxyReq.removeHeader("referer");
      },
      proxyRes: (_proxyRes, _req, res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
      error: (err, _req, res) => {
        if (res && typeof res.status === "function" && !res.headersSent) {
          res.status(502).json({ error: err.message || "APT proxy error" });
        }
      },
    },
  }),
);

// ── Static files (React build) ────────────────────────────────────────────────
app.use(express.static(distDir));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
// Under iisnode, PORT may be a named-pipe path. Node detects pipe paths and
// ignores the host argument in that case, so passing "0.0.0.0" is safe for
// both standalone (TCP) and IIS Node (named-pipe) deployments.
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `DSR Insights server listening on ${PORT}  (proxy: ${JIRA_PROXY_PREFIX})`,
  );
});
