// Chrome Extensions bypass CORS via host_permissions and must call the APT API
// directly. Browser/dev-server contexts route through the Vite /apt-proxy to
// avoid CORS (the proxy is a same-origin request so no preflight is needed).
const _isExtension = typeof chrome !== "undefined" && !!chrome?.runtime?.id;

const APT_BASE_URL = _isExtension
  ? (import.meta.env.VITE_APT_BASE_URL as string) || "https://apt.amla.io"
  : ((import.meta.env.VITE_APT_PROXY_PREFIX as string | undefined) ??
    (import.meta.env.VITE_APT_BASE_URL as string));

export interface AptProject {
  project_key: string;
  project_name: string;
}

/**
 * Calls the APT generate-token endpoint with the user's email
 * and returns the bearer token string.
 */
export async function generateAptToken(email: string): Promise<string> {
  const formData = new FormData();
  formData.append("email", email);

  const response = await fetch(`${APT_BASE_URL}/api/v1/generate-token`, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Token generation failed (${response.status}): ${text}`);
  }

  // Handle various response shapes:
  // { bearer_token: "..." } | { data: "token" } | { data: { token: "..." } } | { token: "..." }
  const json = (await response.json()) as Record<string, unknown>;
  const inner = json.data;
  const token =
    (json.bearer_token as string | undefined) ??
    (typeof inner === "string" ? inner : null) ??
    ((inner as Record<string, unknown> | null)?.token as string | undefined) ??
    ((inner as Record<string, unknown> | null)?.access_token as
      | string
      | undefined) ??
    (json.token as string | undefined) ??
    (json.access_token as string | undefined);

  if (!token) {
    throw new Error(
      `No token found in response: ${JSON.stringify(json).slice(0, 200)}`,
    );
  }

  return token;
}

/**
 * Fetches the list of active APT projects the user has access to.
 */
export async function fetchAptProjects(token: string): Promise<AptProject[]> {
  const response = await fetch(
    `${APT_BASE_URL}/api/v1/insight-ai/projects-list`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`Projects fetch failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as {
    status?: boolean;
    message?: string;
    data?: AptProject[];
  };

  return json.data ?? [];
}
