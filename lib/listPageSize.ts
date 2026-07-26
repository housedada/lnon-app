export const LIST_PAGE_SIZE_OPTIONS = [25, 50, 100, 250, 500] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 25;
export const LIST_PAGE_SIZE_STORAGE_KEY = 'lnon-list-page-size';

export function parsePageSize(raw: string | undefined): ListPageSize {
  const n = Number(raw);
  return (LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? (n as ListPageSize) : DEFAULT_LIST_PAGE_SIZE;
}
