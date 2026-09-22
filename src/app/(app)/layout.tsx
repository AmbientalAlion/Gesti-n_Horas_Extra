import { Nav } from "@/components/Nav";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import type { Role } from "@/lib/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let role: Role | "demo" = "demo";
  if (isSupabaseConfigured()) {
    const profile = await getSessionProfile();
    role = profile?.role ?? "jefe";
  }

  return (
    <div className="flex min-h-screen">
      <Nav role={role} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
