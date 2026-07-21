import LoginForm from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-xl font-semibold">PMEC — Ingresar</h1>
      {/* Marca temporal para confirmar que Vercel ya desplegó este commit — sacar en el próximo commit */}
      <p className="text-xs text-gray-500">SpiderMan</p>
      <LoginForm />
    </main>
  );
}
