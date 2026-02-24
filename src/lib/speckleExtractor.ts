// ============================================================
// FILE: src/lib/speckleExtractor.ts  (FILE NUOVO)
// ============================================================
// Interroga l'API GraphQL di Speckle per estrarre i metadati
// degli oggetti BIM e li normalizza in BimObject[].
//
// Speckle GraphQL endpoint: https://app.speckle.systems/graphql
// ============================================================

import type { BimObject } from "@/store/bimStore";

const SPECKLE_API = "https://app.speckle.systems/graphql";
const PROJECT_ID = "a0102047d4";           // dal tuo URL Speckle
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Query GraphQL ─────────────────────────────────────────────
// Recupera gli ultimi commit e i loro oggetti con le proprietà
// che ci servono per i grafici.
const OBJECTS_QUERY = `
  query GetModelObjects($projectId: String!) {
    project(id: $projectId) {
      models {
        items {
          id
          name
          versions(limit: 1) {
            items {
              id
              referencedObject
            }
          }
        }
      }
    }
  }
`;

// ── Mappatura categoria da speckleType ───────────────────────
function categoryFromType(speckleType: string): string {
  const type = speckleType.toLowerCase();
  if (type.includes("wall")) return "Wall";
  if (type.includes("floor") || type.includes("slab")) return "Floor";
  if (type.includes("column")) return "Column";
  if (type.includes("beam")) return "Beam";
  if (type.includes("roof")) return "Roof";
  if (type.includes("window")) return "Window";
  if (type.includes("door")) return "Door";
  if (type.includes("stair")) return "Stair";
  if (type.includes("ceiling")) return "Ceiling";
  if (type.includes("furniture")) return "Furniture";
  if (type.includes("pipe")) return "Pipe";
  if (type.includes("duct")) return "Duct";
  return "Other";
}

// ── Estrai proprietà da oggetto Speckle grezzo ───────────────
function normalizeObject(raw: Record<string, unknown>): BimObject | null {
  // Gli oggetti senza ID o tipo non sono utili
  if (!raw.id || !raw.speckle_type) return null;

  const speckleType = String(raw.speckle_type);

  // Livello: cerca in vari posti a seconda di Revit/IFC
  const level =
    (raw.level as Record<string, unknown>)?.name as string ||
    (raw.parameters as Record<string, unknown>)?.["SCHEDULE_LEVEL_PARAM"] as string ||
    String(raw.level || "Unknown");

  // Materiale: prendi il primo dalla lista o dal parametro
  const materials = raw.materials as unknown[] | undefined;
  const material =
    (materials?.[0] as Record<string, unknown>)?.name as string ||
    (raw.parameters as Record<string, unknown>)?.["MATERIAL_ASSET_PARAM"] as string ||
    "Unknown";

  // Volume e area
  const volume =
    (raw.parameters as Record<string, unknown>)?.["HOST_VOLUME_COMPUTED"] as number ||
    (raw.volume as number) ||
    0;
  const area =
    (raw.parameters as Record<string, unknown>)?.["HOST_AREA_COMPUTED"] as number ||
    (raw.area as number) ||
    0;

  return {
    id: String(raw.id),
    speckleType,
    category: categoryFromType(speckleType),
    level: String(level).trim() || "Unknown",
    material: String(material).trim() || "Unknown",
    volume: Number(volume) || 0,
    area: Number(area) || 0,
    family: raw.family as string | undefined,
    mark: raw.mark as string | undefined,
  };
}

// ── Fetch oggetti da Speckle ──────────────────────────────────
// Usa l'object loader diretto (più efficiente della GraphQL per
// grandi modelli). Recupera l'oggetto root e scende nei figli.
export async function fetchBimObjects(): Promise<BimObject[]> {
  try {
    // 1. Recupera il referencedObject dal commit più recente
    const gqlRes = await fetch(SPECKLE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EMBED_TOKEN}`,
      },
      body: JSON.stringify({
        query: OBJECTS_QUERY,
        variables: { projectId: PROJECT_ID },
      }),
    });

    if (!gqlRes.ok) throw new Error(`GraphQL error: ${gqlRes.status}`);

    const gqlData = await gqlRes.json();
    const models = gqlData?.data?.project?.models?.items ?? [];

    if (models.length === 0) return generateMockData(); // fallback

    const firstModel = models[0];
    const versions = firstModel?.versions?.items ?? [];
    if (versions.length === 0) return generateMockData();

    const rootObjectId = versions[0].referencedObject;

    // 2. Scarica l'oggetto root con tutti i figli
    const objRes = await fetch(
      `https://app.speckle.systems/streams/${PROJECT_ID}/objects/${rootObjectId}/download`,
      {
        headers: { Authorization: `Bearer ${EMBED_TOKEN}` },
      }
    );

    if (!objRes.ok) throw new Error(`Object fetch error: ${objRes.status}`);

    // La risposta è NDJSON (un JSON per riga)
    const text = await objRes.text();
    const lines = text.split("\n").filter(Boolean);
    const rawObjects = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const bimObjects = rawObjects
      .map((raw: Record<string, unknown>) => normalizeObject(raw))
      .filter((o): o is BimObject => o !== null);

    return bimObjects.length > 0 ? bimObjects : generateMockData();

  } catch (err) {
    console.warn("Speckle fetch failed, using mock data:", err);
    return generateMockData();
  }
}

// ── Dati mock per sviluppo locale / fallback ──────────────────
// Usati quando il modello non è raggiungibile o per testing.
export function generateMockData(): BimObject[] {
  const categories = ["Wall", "Floor", "Column", "Beam", "Roof", "Window", "Door", "Stair"];
  const levels = ["Ground Floor", "Level 1", "Level 2", "Level 3", "Roof Level"];
  const materials = ["Concrete", "Steel", "Timber", "Glass", "Masonry", "Aluminum"];

  const counts: Record<string, number> = {
    Wall: 120, Floor: 45, Column: 80, Beam: 95,
    Roof: 12, Window: 60, Door: 35, Stair: 8,
  };

  const objects: BimObject[] = [];
  let idCounter = 1;

  categories.forEach((category) => {
    const count = counts[category] || 20;
    for (let i = 0; i < count; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const material = materials[Math.floor(Math.random() * materials.length)];
      objects.push({
        id: `obj_${String(idCounter++).padStart(4, "0")}`,
        speckleType: `Objects.BuiltElements.${category}`,
        category,
        level,
        material,
        volume: Math.round(Math.random() * 50 * 100) / 100,
        area: Math.round(Math.random() * 100 * 100) / 100,
        family: `${category} Family ${Math.floor(Math.random() * 5) + 1}`,
        mark: `${category[0]}${String(idCounter).padStart(3, "0")}`,
      });
    }
  });

  return objects;
}
