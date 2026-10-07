import { UploadForm } from "@/components/UploadForm";
import { PageHeader } from "@/components/PageHeader";
import { RecentUploads } from "@/components/rrhh/RecentUploads";
import { getRecentUploads } from "@/components/rrhh/history";
import { requireRrhh } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  await requireRrhh();
  const recent = await getRecentUploads(5);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recursos Humanos"
        title="Cargar archivo"
        subtitle="Cargue el archivo de novedades o el semanal del biométrico. Primero verá una vista previa; si vuelve a cargar el mismo periodo, se reemplazan los datos anteriores, salvo los registros ya revisados."
      />
      <UploadForm />
      <RecentUploads entries={recent} />
    </div>
  );
}
