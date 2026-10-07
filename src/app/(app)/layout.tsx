import clsx from "clsx";
import { Nav } from "@/components/Nav";
import { StatusScreen } from "@/components/nav/StatusScreen";
import { CopyButton } from "@/components/nav/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import type { Role } from "@/lib/types";
import { signOut } from "@/app/login/actions";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: Role | "demo" = "demo";
  let roleName: string | undefined;
  let email: string | undefined;
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile();
    // Primero se cambia la contraseña temporal.
    if (profile?.mustChangePassword) redirect("/cuenta/contrasena");
    // Una cuenta sin rol asignado no ve datos (RF-26).
    if (!profile?.role) return <NoAccess email={profile?.email} />;
    role = profile.role;
    roleName = profile.roleName ?? undefined;
    email = profile.email ?? undefined;
  }

  // RRHH tiene varias secciones: en el teléfono lleva barra inferior.
  const hasTabs = role === "rrhh" || role === "demo";

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Nav role={role} roleName={roleName} email={email} />
      <main
        id="contenido"
        tabIndex={-1}
        className={clsx(
          "min-w-0 flex-1 overflow-x-clip focus:outline-none",
          hasTabs && "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0"
        )}
      >
        <div data-vt="page" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NoAccess({ email }: { email?: string | null }) {
  const request = `Hola, necesito acceso a Control de Horas Extras con la cuenta ${
    email ?? "(mi correo)"
  }. Gracias.`;
  return (
    <StatusScreen
      fullScreen
      tone="pending"
      icon="key"
      title="Sin acceso asignado"
      actions={
        <>
          <form action={signOut}>
            <button type="submit" className="btn-secondary w-full">
              <Icon name="logout" className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
          <CopyButton
            text={request}
            label="Copiar solicitud para RRHH"
            toastTitle="Solicitud copiada"
            variant="primary"
          />
        </>
      }
      footer={email ? <>Entró como <strong className="font-semibold text-ink-2">{email}</strong></> : null}
    >
      <p>
        Su cuenta todavía no tiene un rol. Recursos Humanos debe asignarle un rol y su
        alcance (dirección, planta o equipo) para que pueda ver información.
      </p>
      <p>Copie la solicitud y envíela a Recursos Humanos por correo o chat.</p>
    </StatusScreen>
  );
}
