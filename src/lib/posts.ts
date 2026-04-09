export interface AppPost {
  id: string;
  content: string;
  media_url: string | null;
  location_tag: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  expires_at?: string | null;
  channel?: string | null;
  metadata?: unknown;
}

const BASE_POST_COLUMNS = 'id, content, media_url, location_tag, created_at, user_id';

function normalizePost(row: Record<string, unknown>): AppPost {
  return {
    id: String(row.id),
    content: String(row.content ?? ''),
    media_url: row.media_url == null ? null : String(row.media_url),
    location_tag: String(row.location_tag ?? 'Remote'),
    created_at: String(row.created_at),
    user_id: String(row.user_id),
    parent_id: (row.parent_id as string | null | undefined) ?? null,
    expires_at: (row.expires_at as string | null | undefined) ?? null,
    channel: (row.channel as string | null | undefined) ?? null,
    metadata: row.metadata ?? null,
  };
}

export async function fetchPostsList(args: {
  enhanced: (columns: string) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>;
  legacy?: (columns: string) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>;
}) {
  const query = args.legacy ?? args.enhanced;
  const legacyResponse = await query(BASE_POST_COLUMNS);
  return {
    data: legacyResponse.data ? legacyResponse.data.map(normalizePost) : null,
    error: legacyResponse.error,
  };
}

export async function fetchPostSingle(args: {
  enhanced: (columns: string) => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
  legacy?: (columns: string) => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
}) {
  const query = args.legacy ?? args.enhanced;
  const legacyResponse = await query(BASE_POST_COLUMNS);
  return {
    data: legacyResponse.data ? normalizePost(legacyResponse.data) : null,
    error: legacyResponse.error,
  };
}

export function shouldFallbackToLegacyPosts(error: unknown) {
  return Boolean(error);
}
