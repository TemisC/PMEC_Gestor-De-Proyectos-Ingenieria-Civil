import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">PMEC</h1>
      <p className="text-sm text-gray-500">
        Gestión de proyectos de ingeniería civil y arquitectura.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Ingresar
      </Link>
    </main>
  );
}
