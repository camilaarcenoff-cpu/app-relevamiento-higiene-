# App de Relevamiento — Campaña de Higiene Urbana (GCBA)

Aplicación web para que el equipo de campo (~100 personas) consulte su
manzana asignada cada semana, su historial, los relevamientos cargados y las
direcciones de cada manzana. Incluye panel de administración para coordinar
usuarios, asignaciones semanales y sincronizar los datos desde Google Sheets.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Postgres + Auth + Row Level Security)
- **Vercel** para el hosting

No hace falta experiencia técnica para ponerla en marcha: seguí
**`Guia_Implementacion_Paso_a_Paso.docx`** (en la carpeta de entrega), que
explica cada paso con capturas y sin asumir conocimientos previos.

## Estructura del proyecto

```
app-relevamiento/
├── app/
│   ├── login/                 Pantalla de inicio de sesión
│   └── (app)/                 Área protegida (requiere login)
│       ├── mi-semana/         Manzana asignada esta semana
│       ├── historial/         Semanas trabajadas
│       ├── relevamientos/     Listado de relevamientos (búsqueda/filtro)
│       ├── direcciones/       Direcciones por manzana
│       └── admin/             Panel de administración
│           ├── usuarios/      Alta, edición y baja de usuarios
│           ├── asignaciones/  Asignar manzanas por semana
│           ├── actividad/     Registro de actividad del equipo
│           └── sync/          Sincronizar con Google Sheets
├── lib/
│   ├── supabase/              Clientes de Supabase (browser, server, admin)
│   └── syncSheets.js          Lógica de sincronización con Google Sheets
├── scripts/
│   └── sync.js                Script de migración manual (npm run sync)
└── middleware.ts              Protege las rutas y maneja la sesión
```

## Configuración local (para quien programe)

```bash
npm install
cp .env.local.example .env.local   # completar con los datos de Supabase/Google
npm run dev
```

## Despliegue

Pensado para desplegarse en **Vercel** conectado a un repositorio de
**GitHub**, con la base de datos en **Supabase**. El paso a paso completo
está en `Guia_Implementacion_Paso_a_Paso.docx`.

## Migración de datos desde Google Sheets

Ver `sync-sheets/README.md` para configurar la cuenta de servicio de Google
y correr la primera migración. Una vez configurada, el panel de admin
(`/admin/sync`) permite re-sincronizar con un botón.

## Identidad visual

Colores definidos en `tailwind.config.js`:

- `navy` `#0B2A4A`
- `turquesa` `#00B5C0`
- `amarillo` `#FFD400`
