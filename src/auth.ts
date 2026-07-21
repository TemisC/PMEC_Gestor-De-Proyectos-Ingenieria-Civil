import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Etapa 1 (login básico): sesión por JWT, credenciales propias contra la
// tabla User (password hasheado con bcrypt). El RBAC real de los 3 roles
// del MVP (Gerencia/Gestor/Colaborador) se implementa en la Etapa 3 —
// esto solo prueba que el circuito de login funciona de punta a punta.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Self-hosted (VPS/Vercel con dominio propio) — sin esto, Auth.js
  // rechaza silenciosamente pedidos de sesión en hosts no reconocidos
  // (ver AUTH_URL / errors.authjs.dev#untrustedhost). Con trustHost en
  // false y el chequeo fallando, la sesión devuelve null como si no
  // hubiera login — por eso el chequeo de autorización SIEMPRE debe
  // fallar cerrado (denegar) ante cualquier error, nunca fail-open.
  trustHost: true,
  callbacks: {
    // Por defecto, Auth.js NO incluye el id de usuario en `session.user`
    // (solo name/email/image) — sin esto, cualquier chequeo de RBAC que
    // dependa de `session.user.id` falla siempre (se detectó este bug
    // real durante la verificación de la Etapa 1: el proxy resolvía el
    // JWT bien, pero la página igual redirigía a /login porque el id
    // llegaba undefined).
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (rawCredentials) => {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
