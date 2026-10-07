import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/demo";
import { BrandMark } from "@/components/brand/BrandMark";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  if (!isSupabaseConfigured()) redirect("/demo/dashboard");
  const profile = await getSessionProfile();
  if (!profile) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <BrandMark size="md" />
      <h1 className="mt-6 text-xl font-semibold text-heading">
        {profile.mustChangePassword ? "Cree su contraseña" : "Cambiar contraseña"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-ink-2">
        {profile.mustChangePassword
          ? "Está entrando con una contraseña temporal. Elija una propia para continuar."
          : profile.email}
      </p>
      <PasswordForm />
      {!profile.mustChangePassword && (
        <a href="/dashboard" className="mt-4 text-center text-sm text-heading underline">
          Volver al dashboard
        </a>
      )}
    </main>
  );
}
