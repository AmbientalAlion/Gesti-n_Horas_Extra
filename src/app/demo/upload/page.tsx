import { UploadForm } from "@/components/UploadForm";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function DemoUpload({ searchParams }: { searchParams: { rol?: string } }) {
  const rol = ["rrhh", "director", "jefe"].includes(searchParams.rol ?? "") ? searchParams.rol : "rrhh";
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recursos Humanos"
        title="Cargar archivo"
        subtitle="Cargue el archivo de novedades o el semanal del biométrico y revise la vista previa antes de guardar."
      >
        <span className="chip-brand">Demostración: el archivo se valida, pero no se guarda</span>
      </PageHeader>
      <UploadForm
        demo
        dashboardHref={`/demo/dashboard?rol=${rol}`}
        reviewHref={`/demo/revisiones?rol=${rol}`}
      />
    </div>
  );
}
