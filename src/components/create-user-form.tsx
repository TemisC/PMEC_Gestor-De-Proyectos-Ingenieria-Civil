import { createUser } from "@/app/(app)/users/actions";

// Form simple (sin useActionState) por consistencia con el resto de las
// Server Actions del proyecto — si la validación falla, se ve el error
// genérico de Next.js. Es un formulario de uso poco frecuente (alta de
// usuarios, solo Gerencia), no justifica una UX de error más elaborada
// todavía.
export function CreateUserForm() {
  return (
    <form action={createUser} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-xs text-gray-400">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-xs text-gray-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="role" className="text-xs text-gray-400">
            Rol
          </label>
          <select
            id="role"
            name="role"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white"
          >
            <option value="GESTOR">Gestor de Proyectos</option>
            <option value="COLABORADOR">Colaborador</option>
            <option value="GERENCIA">Gerencia</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-xs text-gray-400">
            Contraseña inicial
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="mínimo 8 caracteres"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="defaultHourlyRate" className="text-xs text-gray-400">
            Tarifa hora por defecto (opcional)
          </label>
          <input
            id="defaultHourlyRate"
            name="defaultHourlyRate"
            type="number"
            step="0.01"
            className="rounded-md border border-gray-700 bg-gray-900/60 px-2 py-1.5 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <button
        type="submit"
        className="self-start rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
      >
        Crear usuario
      </button>
    </form>
  );
}
