import Link from "next/link";
import { StatusScreen } from "@/components/nav/StatusScreen";
import { Icon } from "@/components/ui/Icon";

export default function NoEncontrado() {
  return (
    <StatusScreen
      fullScreen
      icon="search"
      title="Esta página no existe"
      actions={
        <Link href="/dashboard" className="btn-primary">
          Ir al panel
          <Icon name="arrow-right" className="h-4 w-4" />
        </Link>
      }
      footer="Si llegó aquí desde un enlace de la aplicación, avise a Recursos Humanos."
    >
      <p>
        Puede que la dirección esté mal escrita o que el enlace ya no sea válido.
        Vuelva al panel para continuar.
      </p>
    </StatusScreen>
  );
}
