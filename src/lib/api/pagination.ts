/**
 * AIP-158 style pagination helpers for list methods.
 * @see https://cloud.google.com/apis/design/design_patterns#list_pagination
 */

export type PageParams = {
  pageSize: number;
  pageToken: string | null;
  offset: number;
};

export type PageResult<T> = {
  items: T[];
  nextPageToken: string | null;
  totalSize?: number;
};

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parsePageParams(
  searchParams: URLSearchParams,
  opts?: { defaultPageSize?: number; maxPageSize?: number },
): PageParams {
  const max = opts?.maxPageSize ?? MAX_PAGE_SIZE;
  const fallback = opts?.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const rawSize = Number(searchParams.get("pageSize") ?? searchParams.get("page_size") ?? fallback);
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(max, Math.max(1, Math.floor(rawSize)))
    : fallback;

  const token = searchParams.get("pageToken") ?? searchParams.get("page_token");
  let offset = 0;
  if (token) {
    try {
      const decoded = Buffer.from(token, "base64url").toString("utf8");
      const parsed = JSON.parse(decoded) as { o?: number };
      if (typeof parsed.o === "number" && parsed.o >= 0) offset = Math.floor(parsed.o);
    } catch {
      offset = 0;
    }
  }

  return { pageSize, pageToken: token, offset };
}

export function encodePageToken(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

export function paginateSlice<T>(
  all: T[],
  params: PageParams,
): PageResult<T> {
  const slice = all.slice(params.offset, params.offset + params.pageSize);
  const nextOffset = params.offset + slice.length;
  const nextPageToken =
    nextOffset < all.length ? encodePageToken(nextOffset) : null;
  return { items: slice, nextPageToken, totalSize: all.length };
}
