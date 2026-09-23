import { Nav } from "@/components/Nav";
import { getSessionProfile, getPendingAuthorizations, type PendingAuth } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import type { Role } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: Role | "demo" = "demo";
  let pending: PendingAuth[] = [];
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile();
    role = profile?.role ?? "jefe";
    if (role === "rrhh" || role === "director") {
      pending = await getPendingAuthorizations();
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Nav role={role} pending={pending} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
