import { Nav } from "@/components/Nav";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: Role | "demo" = "demo";
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile();
    // Una cuenta sin rol asignado no ve datos (RF-26).
    if (!profile?.role) return <NoAccess />;
    role = profile.role;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Nav role={role} />
      <main id="contenido" className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}

function NoAccess() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-brand-dark">Sin acceso asignado</h1>
      <p className="mt-2 text-sm text-slate-600">
        Su cuenta todavía no tiene un rol. Recursos Humanos debe asignarle un rol y su
        alcance (dirección o equipo) para que pueda ver información.
      </p>
      <form action={signOut} className="mt-6">
        <button type="submit" className="btn-secondary">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
