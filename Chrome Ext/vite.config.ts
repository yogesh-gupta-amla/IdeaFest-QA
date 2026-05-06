import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const JIRA_PROXY_PREFIX = "/jira-proxy";

async function readRequestBody(
  req: AsyncIterable<Uint8Array>,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "jira-dev-proxy",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const requestUrl = req.url || "";
          if (!requestUrl.startsWith(JIRA_PROXY_PREFIX)) {
            next();
            return;
          }

          const baseHeader = req.headers["x-jira-base-url"];
          const baseUrl = Array.isArray(baseHeader)
            ? baseHeader[0]
            : baseHeader;
          if (!baseUrl) {
            res.statusCode = 400;
            res.end("Missing x-jira-base-url header");
            return;
          }

          let origin: URL;
          try {
            origin = new URL(baseUrl);
          } catch {
            res.statusCode = 400;
            res.end("Invalid Jira base URL");
            return;
          }

          const proxyPath = requestUrl.slice(JIRA_PROXY_PREFIX.length) || "/";
          const targetUrl = new URL(proxyPath, `${origin.origin}/`);

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (!value) continue;
            const lower = key.toLowerCase();
            if (
              lower === "host" ||
              lower === "origin" ||
              lower === "referer" ||
              lower === "content-length" ||
              lower === "x-jira-base-url"
            ) {
              continue;
            }
            headers.set(key, Array.isArray(value) ? value.join(",") : value);
          }

          const method = (req.method || "GET").toUpperCase();
          const hasBody = method !== "GET" && method !== "HEAD";
          const body = hasBody
            ? await readRequestBody(req as unknown as AsyncIterable<Uint8Array>)
            : undefined;

          try {
            const upstream = await fetch(targetUrl.toString(), {
              method,
              headers,
              body,
              redirect: "manual",
            });

            res.statusCode = upstream.status;
            upstream.headers.forEach((value, key) => {
              if (key.toLowerCase() === "content-encoding") return;
              res.setHeader(key, value);
            });

            const responseBody = await upstream.arrayBuffer();
            res.end(Buffer.from(responseBody));
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Proxy request failed";
            res.statusCode = 502;
            res.end(message);
          }
        });
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        app: resolve(__dirname, "index.html"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === "background"
            ? "background.js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-charts": ["recharts"],
          "vendor-export": ["html2canvas", "jspdf"],
        },
      },
    },
  },
});
