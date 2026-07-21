import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Sidebar } from "@/components/sidebar";

// Shell con sidebar para todas las rutas autenticadas (/dashboard,
// /projects/*) — mismo layout de dos columnas que el SPA original
// (sidebar fija + contenido con margen a la izquierda).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  async function logoutAction() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      <Sidebar
        userLabel={session.user.name ?? session.user.email ?? ""}
        role={session.user.role}
        logoutAction={logoutAction}
      />
      <main className="ml-16 flex-1 p-6 md:ml-64 lg:p-10">{children}</main>
    </div>
  );
}
