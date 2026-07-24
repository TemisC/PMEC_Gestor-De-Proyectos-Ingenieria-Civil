"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export function SearchInput({ placeholder = "Buscar…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timer.current);
    const value = e.target.value;
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      if (value.trim()) params.set("q", value.trim());
      else params.delete("q");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
  }

  return (
    <input
      type="search"
      defaultValue={searchParams.get("q") ?? ""}
      placeholder={placeholder}
      onChange={handleChange}
      className="w-full max-w-xs rounded-md border border-gray-700 bg-gray-900/60 px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-sky-500"
    />
  );
}
