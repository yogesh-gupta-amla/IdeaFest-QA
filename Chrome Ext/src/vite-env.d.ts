/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_PROXY_PREFIX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
