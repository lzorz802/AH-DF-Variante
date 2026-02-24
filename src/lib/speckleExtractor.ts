// ============================================================
// FILE: src/lib/speckleExtractor.ts
// ============================================================
// Recupera oggetti BIM REALI dall'API REST di Speckle.
// NON usa mock data. NON usa worldTree.walk().
// Usa l'endpoint /objects che è stabile e documentato.
// ============================================================

import type { BimObject } from "@/store/bimStore";

const SPECKLE_SERVER = "https://app.speckle.systems";
const PROJECT_ID = "a0102047d4";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Tipi container da ignorare ───────────────────────────────
const CONTAINER_TYPES = new Set([
  "objects.other.collection",
  "base",
  "objects.geometry.mesh",
  "objects.geometry.brep",
  "objects.geometry.curve",
  "objects.geometry.line",
  "objects.geometry.point",
  "objects.geometry.polyline",
  "objects.geometry.polycurve",
]);

// ── Mappatura categoria da speckleType ───────────────────────
export function categoryFromType(speckleType: string): string {
  const s = speckleType.toLowerCase();
  if (s.includes("wall")) return "Wall";
  if (s.includes("floor") || s.includes("slab")) return "Floor";
  if (s.includes("column")) return "Column";
  if (s.includes("beam")) return "Beam";
  if (s.includes("roof")) return "Roof";
  if (s.includes("window")) return "Window";
  if (s.includes("door")) return "Door";
  if (s.includes("stair")) return "Stair";
  if (s.includes("ceiling")) return "Ceiling";
  if (s.includes("furniture")) return "Furniture";
  if (s.includes("railing")) return "Railing";
  if (s.includes("pipe") || s.includes("duct")) return "MEP";
  if (s.includes("site") || s.includes("terrain")) return "Site";
  return "Other";
}

// ── Controlla se il tipo è un elemento BIM rilevante ─────────
function isBimElement(speckleType: string): boolean {
  const t = speckleType.toLowerCase();
  // Includi solo BuiltElements, Revit e IFC — escludi container e geometria pura
  return (
    (t.includes("objects.builtelements") ||
      t.includes("objects.revit") ||
      t.includes("ifc")) &&
    !CONTAINER_TYPES.has(t)
  );
}

// ── Normalizza un oggetto raw Speckle in BimObject ───────────
function normalizeObject(raw: Record<string, unknown>): BimObject | null {
  if (!raw || typeof raw !== "object") return null;

  const id = raw.id as string | undefined;
  const speckleType = raw.speckle_type as string | undefined;

  if (!id || !speckleType) return null;
  if (!isBimElement(speckleType)) return null;

  // Livello
  const levelRaw = raw.level as Record<string, unknown> | string | undefined;
  const levelName =
    typeof levelRaw === "object" && levelRaw !== null
      ? (levelRaw.name as string) ?? String(levelRaw)
      : String(levelRaw ?? "");

  // Parametri Revit (struttura: { paramName: { value: ... } })
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;

  // Materiale
  const matParamValue =
    params?.["MATERIAL_ASSET_PARAM"]?.value ??
    params?.["ALL_MODEL_MATERIAL_NAME"]?.value ??
    params?.["STRUCTURAL_MATERIAL_PARAM"]?.value;

  const matsRaw = raw.materials as Array<Record<string, unknown>> | undefined;
  const material = String(
    matParamValue ?? matsRaw?.[0]?.name ?? raw.material ?? "Unknown"
  ).trim();

  // Volume
  const volumeParam =
    params?.["HOST_VOLUME_COMPUTED"]?.value ??
    params?.["VOLUME"]?.value;
  const volume = Number(volumeParam ?? raw.volume ?? 0);

  // Area
  const areaParam =
    params?.["HOST_AREA_COMPUTED"]?.value ??
    params?.["AREA"]?.value;
  const area = Number(areaParam ?? raw.area ?? 0);

  return {
    id,
    speckleType,
    category: categoryFromType(speckleType),
    level: levelName.trim() || "Unknown",
    material: material || "Unknown",
    volume: isNaN(volume) ? 0 : volume,
    area: isNaN(area) ? 0 : area,
    family: raw.family as string | undefined,
    mark: (raw.mark ?? raw["Mark"]) as string | undefined,
  };
}

// ── Step 1: GraphQL → ottieni il referencedObject del commit più recente ──
async function getLatestRootObjectId(): Promise<string> {
  const query = `
    query {
      project(id: "${PROJECT_ID}") {
        models(limit: 10) {
          items {
            id
            name
            versions(limit: 1) {
              items {
                referencedObject
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(`${SPECKLE_SERVER}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EMBED_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) throw new Error(`GraphQL request failed: ${res.status} ${res.statusText}`);

  const data = await res.json();

  if (data.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  const models = data?.data?.project?.models?.items as Array<{
    id: string;
    name: string;
    versions: { items: Array<{ referencedObject: string }> };
  }>;

  if (!models?.length) throw new Error("No models found in project");

  // Prendi il primo model con una versione
  for (const model of models) {
    const refObj = model.versions?.items?.[0]?.referencedObject;
    if (refObj) {
      console.log(`[Speckle] Using model: "${model.name}", rootObjectId: ${refObj}`);
      return refObj;
    }
  }

  throw new Error("No versions found in any model");
}

// ── Step 2: Scarica l'oggetto root e tutti i suoi figli (NDJSON) ──
// L'endpoint /objects/:streamId/:objectId/download restituisce NDJSON:
// ogni riga è un JSON con un oggetto Speckle.
async function downloadObjectsNDJSON(rootObjectId: string): Promise<Record<string, unknown>[]> {
  // Speckle usa ancora "streams" nell'API REST anche per i nuovi "projects"
  const url = `${SPECKLE_SERVER}/api/getobjects/${PROJECT_ID}`;

  // POST con lista di objectIds da scaricare (bulk download)
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EMBED_TOKEN}`,
      Accept: "text/plain",
    },
    body: JSON.stringify({ objects: JSON.stringify([rootObjectId]) }),
  });

  if (!res.ok) {
    // Fallback: prova l'endpoint legacy streams
    return downloadObjectsLegacy(rootObjectId);
  }

  const text = await res.text();
  return parseNDJSON(text);
}

async function downloadObjectsLegacy(rootObjectId: string): Promise<Record<string, unknown>[]> {
  // Endpoint legacy che funziona anche con embed token
  const url = `${SPECKLE_SERVER}/streams/${PROJECT_ID}/objects/${rootObjectId}/download`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${EMBED_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Object download failed: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  return parseNDJSON(text);
}

function parseNDJSON(text: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") {
        results.push(parsed as Record<string, unknown>);
      }
    } catch {
      // riga non valida, skip
    }
  }

  return results;
}

// ── Step 3: Segui i riferimenti __closure per caricare gli oggetti figli ──
// Speckle serializza oggetti complessi come riferimenti { referencedId, speckle_type: "reference" }
// Il download bulk li include automaticamente, ma se mancassero si può fare
// un secondo fetch. In questo caso il download NDJSON li include già tutti.

// ── API principale: fetch dati BIM reali ─────────────────────────────────
export async function fetchBimObjects(): Promise<BimObject[]> {
  console.log("[Speckle] Fetching real BIM data...");

  // Step 1: ottieni root object ID
  const rootObjectId = await getLatestRootObjectId();

  // Step 2: scarica tutti gli oggetti
  const rawObjects = await downloadObjectsNDJSON(rootObjectId);
  console.log(`[Speckle] Downloaded ${rawObjects.length} raw objects`);

  if (rawObjects.length === 0) {
    throw new Error("No objects received from Speckle API");
  }

  // Step 3: normalizza e filtra solo gli elementi BIM
  const bimObjects: BimObject[] = [];
  const seen = new Set<string>();

  for (const raw of rawObjects) {
    const obj = normalizeObject(raw);
    if (!obj) continue;
    if (seen.has(obj.id)) continue;
    seen.add(obj.id);
    bimObjects.push(obj);
  }

  console.log(`[Speckle] Extracted ${bimObjects.length} BIM elements`);

  // Log distribuzione per debug
  const cats: Record<string, number> = {};
  for (const o of bimObjects) {
    cats[o.category] = (cats[o.category] ?? 0) + 1;
  }
  console.log("[Speckle] Categories:", cats);

  if (bimObjects.length === 0) {
    // Nessun elemento BuiltElements trovato — logga tutti i tipi per debug
    const types = new Set(
      rawObjects
        .map((o) => o.speckle_type as string)
        .filter(Boolean)
    );
    console.warn("[Speckle] No BIM elements found. Types in model:", [...types]);
    throw new Error(
      `No BIM elements found. Available types: ${[...types].slice(0, 10).join(", ")}`
    );
  }

  return bimObjects;
}
