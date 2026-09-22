# Control de Horas Extras · ALIÓN

Aplicación web para **auditar, controlar y predecir** las horas extras del
personal de planta de ALION, garantizando el cumplimiento de los límites
legales y optimizando el presupuesto.

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend / BD:** Supabase (Postgres + Auth + RLS)
- **Despliegue:** Vercel

## Arranque rápido

```bash
npm install
cp .env.example .env.local   # completar con tus credenciales de Supabase
npm run dev
```

La app arranca en `http://localhost:3000`.

> **Modo demostración:** si no se configuran las variables de Supabase, la
> aplicación funciona con datos de ejemplo (sin autenticación ni persistencia),
> útil para evaluar la interfaz y la lógica de negocio de inmediato.

## Configuración de Supabase

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. Ejecutar las migraciones de `supabase/migrations/` en el orden numérico
   (SQL Editor o Supabase CLI).
3. Copiar la URL y las llaves a `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo servidor
```

4. Crear usuarios en Auth y asignarles rol en la tabla `profiles`
   (`rrhh`, `director` o `jefe`). Ver `supabase/seed.sql`.

## Roles y permisos

| Rol | Alcance |
| --- | --- |
| **RRHH** | Carga datos, administra la plataforma, visión global. |
| **Director General** | Visión global de toda la planta, métricas y alertas. |
| **Jefe Inmediato** | Solo ve y gestiona a los empleados bajo su cargo directo. |

El alcance se aplica a nivel de base de datos mediante **Row Level Security**
(`supabase/migrations/0002_rls_policies.sql`): un jefe únicamente puede leer los
`weekly_records` de empleados cuyo `manager_id` es su perfil.

## Reglas de negocio (legales)

Definidas y centralizadas en [`src/lib/overtime.ts`](src/lib/overtime.ts) (`RULES`):

- **Jornada base:** 42 h semanales. El excedente son horas extras.
- **Alerta semanal:** se dispara al superar **12 h extras** en una semana.
- **Límite legal mensual:** máximo **48 h extras** al mes.
- **Horas huérfanas:** turnos de más de **16 h** seguidas sin marcación de
  salida se **congelan** y marcan con error (no suman al acumulado).

### Semáforo

- 🟢 **Verde:** operación normal.
- 🟡 **Amarillo (preventivo):** cerca del límite semanal (≥10 h) o mensual (≥40 h).
- 🔴 **Rojo (crítico):** límite legal superado (>12 h semanales o >48 h mensuales).

### Proyección (burn rate)

Al subir un **corte parcial**, el sistema calcula el promedio de horas por día
y proyecta el total al cierre de la semana para anticipar excesos
(`projectWeek` en `src/lib/overtime.ts`).

## Gestión de datos

- **CSV biométrico:** columnas `ID`, `Rol`, `Área`, `Horas Totales` y (opcional)
  `Turno Máximo`. Se sube por la interfaz drag & drop. Ver ejemplo en
  [`samples/biometrico_ejemplo.csv`](samples/biometrico_ejemplo.csv).
- **Upsert:** un corte parcial y luego el final de la misma semana
  **actualizan** el registro (clave `employee_id + year + week`), sin duplicar.
- **Archivo estructural:** la tabla `employees` vincula cada empleado con su
  jefe (`manager_id`); RRHH la mantiene.

## Módulos

1. **Dashboard general** (`/dashboard`) — indicadores de toda la planta.
2. **Dashboard de jefes** — misma vista, restringida por RLS a su equipo.
3. **Módulo de carga** (`/upload`) — subida de CSV y validación de errores.
4. **Módulo de exportación** (`/export`) — CSV limpio de novedades para nómina.

## Scripts

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm run test       # pruebas unitarias de la lógica de negocio (Vitest)
npm run typecheck  # verificación de tipos
npm run lint       # ESLint
```

## Estructura

```
src/
├── app/
│   ├── (app)/            # área autenticada (dashboard, upload, export)
│   ├── api/              # route handlers (upload, export)
│   └── login/            # autenticación
├── components/           # UI reutilizable
└── lib/
    ├── overtime.ts       # reglas de negocio (núcleo)
    ├── aggregate.ts      # agregaciones para dashboards
    ├── csv.ts            # parseo/generación de CSV
    ├── data.ts           # acceso a datos (Supabase / demo)
    └── supabase/         # clientes (browser, server, admin)
supabase/
├── migrations/           # esquema + RLS
└── seed.sql
```
