/**
 * SCRIPT: Creación masiva de usuarios desde el Google Sheet
 *
 * Crea cada voluntario en Supabase Auth e inserta sus manzanas en la DB.
 * Si el email ya existe, lo saltea sin error.
 *
 * Ejecutar desde la carpeta del proyecto:
 *   node scripts/crear-usuarios.js
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ---------------------------------------------------------------------------
// Normaliza un nombre a formato email: sin tildes, minúsculas, sin espacios
// ---------------------------------------------------------------------------
function normalizar(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita tildes
    .replace(/[^a-z0-9]/g, "");     // quita todo lo que no sea letra o número
}

// ---------------------------------------------------------------------------
// Datos extraídos del Google Sheet (Columna B: nombre, C: manzana1, D: manzana2)
// comuna = número de la contraseña
// ---------------------------------------------------------------------------
const VOLUNTARIOS = [
  // LUNES - C2 (contraseña: "2")
  { nombre: "Azul Madlum",                  manzana1: "C2REC-027",       manzana2: "C2REC-045B429",  comuna: "2",  barrio: "Recoleta" },
  { nombre: "Nicolás Homps",                manzana1: "C2REC-025",       manzana2: "C2REC-023422",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Julian Tuccillo",              manzana1: "C2REC-049",       manzana2: "C2REC-082368",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Anahi López",                  manzana1: "C2REC-050",       manzana2: "C2REC-116366",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Anibal Magno",                 manzana1: "C2REC-067",       manzana2: "C2REC-083402",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Marina Garat Crotto",          manzana1: "C2REC-066",       manzana2: "C2REC-120421",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Tomas Preux",                  manzana1: "C2REC-065",       manzana2: "C2REC-105425",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Camila Villamayor",            manzana1: "C2REC-137",       manzana2: "C2REC-139426",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Mariana Pariani",              manzana1: "C2REC-048",       manzana2: "C2REC-022386",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Nicolás Bernal",              manzana1: "C2REC-087",       manzana2: "C2REC-044384",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Danilo Fernandez",             manzana1: "C2REC-086",       manzana2: "C2REC-045A428",  comuna: "2",  barrio: "Recoleta" },
  { nombre: "Ornella Campos",               manzana1: "C2REC-064",       manzana2: "C2REC-102433",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Camila Romano Laprovida",      manzana1: "C2REC-088",       manzana2: "C2REC-046423",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Guido Deluca",                 manzana1: "C2REC-107",       manzana2: "C2REC-063370",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Leticia Alves Canals",         manzana1: "C2REC-119",       manzana2: "C2REC-103362",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Dafne Aspiazu Quispe",         manzana1: "C2REC-024",       manzana2: "C2REC-021396",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Gabriela Szyszko",             manzana1: "C2REC-136",       manzana2: "C2REC-125379",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Felipe Villamil",              manzana1: "C2REC-130",       manzana2: "C2REC-131369",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Tomás Manuel Comte",           manzana1: "C2REC-128",       manzana2: "C2REC-126432",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Ezequiel Wenner",              manzana1: "C2REC-117",       manzana2: "C2REC-127435",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Luana Jazmin Brun",            manzana1: "C2REC-104",       manzana2: "C2REC-115374",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Victor Daniel González Lopez", manzana1: "C2REC-118",       manzana2: "C2REC-106420",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Simon Mendiburu",              manzana1: "C2REC-129",       manzana2: "C2REC-135376",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Agustín Cirielli",             manzana1: "C2REC-138",       manzana2: "C2REC-133403",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Luana Dure",                   manzana1: "C2REC-047",       manzana2: "C2REC-026388",   comuna: "2",  barrio: "Recoleta" },
  { nombre: "Carol Jones",                  manzana1: "C2REC-085",       manzana2: "C2REC-084372",   comuna: "2",  barrio: "Recoleta" },

  // MARTES - C1 (contraseña: "1")
  { nombre: "Guillermina Dominguez",        manzana1: "C1RET-051488",    manzana2: "C1RET-050484",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Catalina Avila",               manzana1: "C1RET-053487",    manzana2: "C1RET-008469",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Pilar Postorivo",              manzana1: "C1RET-039479",    manzana2: "C1RET-046441",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Ezequiel Covello",             manzana1: "C1RET-031478",    manzana2: "C1RET-023477",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Belen Valencia",               manzana1: "C1RET-036467",    manzana2: "C1RET-028449",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Agustin Szapowalo",            manzana1: "C1RET-019465",    manzana2: "C1RET-027456",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Federico Coroniti",            manzana1: "C1RET-056442",    manzana2: "C1RET-055447",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Amalia Larregle",              manzana1: "C1RET-020457",    manzana2: "C1RET-021438",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Emanuel Castro",               manzana1: "C1RET-025468",    manzana2: "C1RET-033471",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Juan Bautista Alonso Ferrer",  manzana1: "C1RET-048460",    manzana2: "C1RET-053459",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Paz Amieva",                   manzana1: "C1RET-042486",    manzana2: "C1RET-006475",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Paul Ortega",                  manzana1: "C1RET-052466",    manzana2: "C1RET-058463",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Debora Bruna",                 manzana1: "C1RET-041461",    manzana2: "C1RET-035455",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Pia Tobias",                   manzana1: "C1RET-049453",    manzana2: "C1RET-042454",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Macarena Mazzeo",              manzana1: "C1RET-034462",    manzana2: "C1RET-026464",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Stefano Salmeri",              manzana1: "C1RET-048485",    manzana2: "C1RET-005476",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Brian Rotolo",                 manzana1: "C1RET-049480",    manzana2: "C1RET-052483",   comuna: "1",  barrio: "Retiro" },
  { nombre: "Ceci Fleitas",                 manzana1: "C1RET-032473",    manzana2: "C1RET-024474",   comuna: "1",  barrio: "Retiro" },

  // MIERCOLES - C12 (contraseña: "12")
  { nombre: "Aldana Dellagiustina",         manzana1: "C12VUR-07612261", manzana2: "C12VUR-08912255",  comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Fernando Arriagada",           manzana1: "C12VUR-088B1226", manzana2: "C12VUR-075B1227",  comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Julieta Iuorio",               manzana1: "C12VUR-0419975",  manzana2: "C12VUR-0479969",   comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Ana Lucarella",                manzana1: "C12VUR-0429965",  manzana2: "C12VUR-0439955",   comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Daniela Lescano",              manzana1: "C12VUR-11212242", manzana2: "C12VUR-10112250",  comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Romina Bianco",                manzana1: "C12VUR-0219980",  manzana2: null,               comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Romeo Zazzini",                manzana1: "C12VUR-0369972",  manzana2: "C12VUR-0379962",   comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Yessi Cisneros",               manzana1: "C12VUR-0579954",  manzana2: "C12VUR-05810167",  comuna: "12", barrio: "Villa Urquiza" },
  { nombre: "Gianfranco Davalos",           manzana1: "C12VUR-0489958",  manzana2: "C12VUR-0499950",   comuna: "12", barrio: "Villa Urquiza" },

  // JUEVES - C15 (contraseña: "15")
  { nombre: "Ignacio Suarez",               manzana1: "C15VCR-003827",   manzana2: "C15VCR-004805",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Leandro Benitez",              manzana1: "C15VCR-173700",   manzana2: "C15VCR-174695",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Caro Zaiatz",                  manzana1: "C15VCR-172706",   manzana2: "C15VCR-171715",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Augusto Guede",                manzana1: "C15VCR-170722",   manzana2: "C15VCR-151731",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Magdalena Quetto",             manzana1: "C15VCR-026828",   manzana2: "C15VCR-038807",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Macarena Cons",                manzana1: "C15VCR-016806",   manzana2: "C15VCR-028813",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Valentin Gañez",               manzana1: "C15VCR-002824",   manzana2: "C15VCR-015829",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Guido Galmarini",              manzana1: "C15VCR-005785",   manzana2: "C15VCR-018782",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Patricia Cruz",                manzana1: "C15VCR-043795",   manzana2: "C15VCR-055820",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Franco Novelli",               manzana1: "C15VCR-168746",   manzana2: "C15VCR-149755",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Milagros Sanchez",             manzana1: "C15VCR-036790",   manzana2: "C15VCR-048823",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Damiana Aleman",               manzana1: "C15VCR-156694",   manzana2: "C15VCR-136698",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Andrés Romero",                manzana1: "C15VCR-118697",   manzana2: "C15VCR-098702",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Gabriela Mansilla",            manzana1: "C15VCR-099696",   manzana2: "C15VCR-119692",    comuna: "15", barrio: "Villa Crespo" },
  { nombre: "Diego Tenreyro",               manzana1: "C15VCR-007803",   manzana2: "C15VCR-009797",    comuna: "15", barrio: "Villa Crespo" },

  // VIERNES - C13 (contraseña: "13")
  { nombre: "Jose Ignacio Sanchez Fasce",   manzana1: "C13BLN-06877",    manzana2: "C13BLN-12980",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Carolina Theler",              manzana1: "C13BLN-05685",    manzana2: "C13BLN-05486",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Gonzalo del Castillo",         manzana1: "C13COL-110220",   manzana2: "C13COL-098224",    comuna: "13", barrio: "Colegiales" },
  { nombre: "Matías Falcon",               manzana1: "C13BLN-06178",    manzana2: "C13BLN-06779",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Guadalupe Larrode",            manzana1: "C13BLN-06076",    manzana2: "C13BLN-12882",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Camila Solessio",              manzana1: "C13BLN-02975",    manzana2: "C13BLN-03073",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Fabiana Reggio",               manzana1: "C13BLN-00450",    manzana2: "C13BLN-01847",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Christian Gauna",              manzana1: "C13BLN-03264",    manzana2: "C13BLN-03369",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Tomas Vergnory",               manzana1: "C13BLN-05890",    manzana2: "C13BLN-05792",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Carmina Frione",               manzana1: "C13BLN-052B91",   manzana2: "C13BLN-051A84",    comuna: "13", barrio: "Belgrano" },
  { nombre: "Bianca Sgueglia",              manzana1: "C13BLN-003A51",   manzana2: "C13BLN-01749",     comuna: "13", barrio: "Belgrano" },
  { nombre: "Andrea Visciglio",             manzana1: "C13COL-107218",   manzana2: "C13COL-095223",    comuna: "13", barrio: "Colegiales" },

  // VIERNES - C14 (contraseña: "14")
  { nombre: "Naara Sofia Patron Fuentes",   manzana1: "C14PAL-064260",   manzana2: "C14PAL-065252",    comuna: "14", barrio: "Palermo" },
  { nombre: "Angeles Belen Rodriguez",      manzana1: "C14PAL-066248",   manzana2: "C14PAL-067B244",   comuna: "14", barrio: "Palermo" },
  { nombre: "Analia Fabre",                 manzana1: "C14PAL-050251",   manzana2: "C14PAL-033257",    comuna: "14", barrio: "Palermo" },
  { nombre: "Guido Reartes",                manzana1: "C14PAL-068B240",  manzana2: "C14PAL-068A241",   comuna: "14", barrio: "Palermo" },
  { nombre: "Gian Franco Montero Avalos",   manzana1: "C14PAL-052B243",  manzana2: "C14PAL-052A246",   comuna: "14", barrio: "Palermo" },
  { nombre: "Camila Cavallero Bottero",     manzana1: "C14PAL-031266",   manzana2: "C14PAL-032263",    comuna: "14", barrio: "Palermo" },
  { nombre: "Alan Gareca",                  manzana1: "C14PAL-014256",   manzana2: "C14PAL-015265",    comuna: "14", barrio: "Palermo" },
  { nombre: "Rocio Martinez",               manzana1: "C14PAL-018253",   manzana2: "C14PAL-035A239",   comuna: "14", barrio: "Palermo" },
  { nombre: "Valeria Nizza",                manzana1: "C14PAL-048264",   manzana2: "C14PAL-049258",    comuna: "14", barrio: "Palermo" },
  { nombre: "Santino Guiñez",              manzana1: "C14PAL-016262",   manzana2: "C14PAL-017B259",   comuna: "14", barrio: "Palermo" },
  { nombre: "Soledad Marquez",              manzana1: "C14PAL-034B254",  manzana2: "C14PAL-034A255",   comuna: "14", barrio: "Palermo" },
];

// ---------------------------------------------------------------------------
// Asegura que un código de manzana exista en la DB y devuelve su ID
// ---------------------------------------------------------------------------
async function obtenerOCrearManzana(codigo, barrio, comunaNumero) {
  if (!codigo) return null;

  // Buscar manzana existente
  const { data: existente } = await supabase
    .from("manzanas")
    .select("id")
    .eq("codigo", codigo)
    .maybeSingle();

  if (existente) return existente.id;

  // Buscar la comuna
  const { data: comuna } = await supabase
    .from("comunas")
    .select("id")
    .eq("codigo", comunaNumero)
    .maybeSingle();

  // Crear manzana nueva
  const { data: nueva, error } = await supabase
    .from("manzanas")
    .insert({ codigo, barrio, comuna_id: comuna?.id ?? null })
    .select("id")
    .single();

  if (error) {
    console.error(`  ⚠ No se pudo crear manzana ${codigo}:`, error.message);
    return null;
  }

  console.log(`  + Manzana creada: ${codigo}`);
  return nueva.id;
}

// ---------------------------------------------------------------------------
// Obtener la semana actual (la más reciente)
// ---------------------------------------------------------------------------
async function obtenerSemanaActual() {
  const { data } = await supabase
    .from("semanas")
    .select("id, numero, etiqueta")
    .order("numero", { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Creación masiva de usuarios ===\n");

  const semana = await obtenerSemanaActual();
  if (!semana) {
    console.error("No se encontró ninguna semana en la base de datos. Creá al menos una.");
    process.exit(1);
  }
  console.log(`Semana activa: ${semana.etiqueta ?? `Semana ${semana.numero}`} (${semana.id})\n`);

  let creados = 0;
  let saltados = 0;
  let errores = 0;

  for (const v of VOLUNTARIOS) {
    const email = `${normalizar(v.nombre)}@higiene.gob.ar`;
    console.log(`→ ${v.nombre} (${email})`);

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: v.comuna,
      email_confirm: true,
      user_metadata: { nombre: v.nombre, rol: "relevador" },
    });

    if (authError) {
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        console.log(`  → Ya existe, saltando auth.`);
        saltados++;
      } else {
        console.error(`  ✗ Error auth: ${authError.message}`);
        errores++;
        continue;
      }
    } else {
      console.log(`  ✓ Usuario creado en Auth`);
      creados++;
    }

    // Obtener el perfil (puede existir ya por trigger de Supabase)
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!perfil) {
      console.log(`  ⚠ Perfil no encontrado para ${email}`);
      continue;
    }

    // 2. Crear/verificar manzanas y asignarlas a la semana actual
    for (const codigoManzana of [v.manzana1, v.manzana2]) {
      if (!codigoManzana) continue;

      const manzanaId = await obtenerOCrearManzana(codigoManzana, v.barrio, v.comuna);
      if (!manzanaId) continue;

      const { error: asigError } = await supabase
        .from("asignaciones_semanales")
        .upsert(
          { usuario_id: perfil.id, manzana_id: manzanaId, semana_id: semana.id },
          { onConflict: "usuario_id,manzana_id,semana_id" }
        );

      if (asigError) {
        console.error(`  ✗ Error asignando ${codigoManzana}: ${asigError.message}`);
      } else {
        console.log(`  ✓ Manzana ${codigoManzana} asignada`);
      }
    }
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Usuarios creados: ${creados}`);
  console.log(`Ya existían (saltados): ${saltados}`);
  console.log(`Errores: ${errores}`);
  console.log(`\nListo. Cada voluntario puede ingresar con:`);
  console.log(`  Email: [nombreapellido]@higiene.gob.ar`);
  console.log(`  Contraseña: número de su comuna (1, 2, 12, 13, 14 o 15)`);
}

main().catch(console.error);
