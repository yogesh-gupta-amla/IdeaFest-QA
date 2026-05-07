/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_PROXY_PREFIX?: string;
  readonly VITE_JIRA_PROXY_QUERY_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
