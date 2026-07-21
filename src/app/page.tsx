import Link from "next/link";
import { LogoIcon } from "@/components/ui/icons";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-900">
      <LogoIcon className="h-12 w-12 text-sky-400" />
      <h1 className="text-2xl font-bold text-white">PMEC</h1>
      <p className="text-sm text-gray-400">
        Gestión de proyectos de ingeniería civil y arquitectura.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
      >
        Ingresar
      </Link>
    </main>
  );
}
