import Link from "next/link";

export function Pagination({
  page,
  total,
  pageSize,
  q,
  extraParams,
}: {
  page: number;
  total: number;
  pageSize: number;
  q?: string;
  // Otros filtros de la URL a preservar al cambiar de página (ej. "mine=1").
  extraParams?: Record<string, string | undefined>;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    for (const [key, value] of Object.entries(extraParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between pt-2 text-xs text-gray-400">
      <span>
        {page} / {totalPages} páginas · {total} resultado{total !== 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={href(page - 1)}
            className="rounded border border-gray-700 px-3 py-1 hover:border-gray-500 hover:text-white"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={href(page + 1)}
            className="rounded border border-gray-700 px-3 py-1 hover:border-gray-500 hover:text-white"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </div>
  );
}
