// ============================================================
// FILE: src/lib/speckleExtractor.ts  ← SOSTITUISCE COMPLETAMENTE
// ============================================================
// Approccio: REST API nativa di Speckle v2, zero dipendenze extra.
//
// FLUSSO:
// 1. GraphQL  → ottieni referencedObject (root ID) del commit
// 2. GET /objects/{streamId}/{rootId}/single → oggetto root
//    Il root ha __closure: { "childId": depth, ... }
// 3. POST /api/getobjects/{streamId}  → download bulk NDJSON
//    di tutti i child ID presenti nel __closure
// 4. Filtra isBimElement() e normalizza → BimObject[]
//
// Questo è l'endpoint documentato e stabile di Speckle v2.
// ============================================================

import type { BimObject } from "@/store/bimStore";

const SERVER = "https://app.speckle.systems";
const STREAM_ID = "a0102047d4";
const TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";
const AUTH = { Authorization: `Bearer ${TOKEN}` };

// ── Tipi da ignorare ─────────────────────────────────────────
function shouldSkip(speckleType: string): boolean {
  const t = speckleType.toLowerCase();
  return (
    t === "base" ||
    t.startsWith("objects.geometry.") ||
    t.startsWith("objects.other.rendermaterial") ||
    t.startsWith("objects.other.displaystyle") ||
    t.startsWith("objects.other.collection") ||
    t.startsWith("objects.primitive.") ||
    t === "reference" ||
    t.endsWith(":reference")
  );
}

function isBimElement(speckleType: string): boolean {
  if (shouldSkip(speckleType)) return false;
  const t = speckleType.toLowerCase();
  return (
    t.startsWith("objects.builtelements") ||
    t.startsWith("objects.revit") ||
    t.includes("ifc")
  );
}

// ── Mappatura categoria ──────────────────────────────────────
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeObject(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? "");
  const speckleType = String(raw.speckle_type ?? "");
  if (!id || !speckleType || !isBimElement(speckleType)) return null;

  const lvl = raw.level;
  const levelName =
    lvl && typeof lvl === "object"
      ? String(lvl.name ?? lvl.elevation ?? "Unknown")
      : String(lvl ?? "Unknown");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = raw.parameters as Record<string, any> | undefined;
  const pv = (key: string) => params?.[key]?.value;

  const material = String(
    pv("MATERIAL_ASSET_PARAM") ??
    pv("ALL_MODEL_MATERIAL_NAME") ??
    pv("STRUCTURAL_MATERIAL_PARAM") ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw.materials as any[])?.[0]?.name ??
    raw.material ??
    "Unknown"
  ).trim();

  const volume = Number(pv("HOST_VOLUME_COMPUTED") ?? pv("VOLUME") ?? raw.volume ?? 0);
  const area = Number(pv("HOST_AREA_COMPUTED") ?? pv("AREA") ?? raw.area ?? 0);

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

function parseNDJSON(text: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      const parsed = JSON.parse(t);
      if (parsed && typeof parsed === "object") results.push(parsed);
    } catch { /* skip */ }
  }
  return results;
}

// ── Step 1: root object ID via GraphQL ───────────────────────
async function getRootObjectId(): Promise<string> {
  const res = await fetch(`${SERVER}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({
      query: `query {
        project(id: "${STREAM_ID}") {
          models(limit: 20) {
            items {
              name
              versions(limit: 1) {
                items { referencedObject }
              }
            }
          }
        }
      }`,
    }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`GraphQL: ${json.errors[0]?.message}`);

  const models = json?.data?.project?.models?.items as Array<{
    name: string;
    versions: { items: Array<{ referencedObject: string }> };
  }>;
  if (!models?.length) throw new Error("No models in project");

  for (const m of models) {
    const ref = m.versions?.items?.[0]?.referencedObject;
    if (ref) {
      console.log(`[Speckle] Model: "${m.name}", root: ${ref}`);
      return ref;
    }
  }
  throw new Error("No versions found");
}

// ── Step 2: scarica oggetto root per leggere __closure ───────
async function getRootObject(rootId: string): Promise<Record<string, unknown>> {
  // Endpoint v2 corretto per singolo oggetto
  const res = await fetch(`${SERVER}/objects/${STREAM_ID}/${rootId}/single`, {
    headers: AUTH,
  });
  if (res.ok) return res.json();

  // Fallback: usa l'endpoint legacy streams
  const res2 = await fetch(`${SERVER}/streams/${STREAM_ID}/objects/${rootId}`, {
    headers: AUTH,
  });
  if (res2.ok) return res2.json();

  throw new Error(`Cannot fetch root object: ${res.status}`);
}

// ── Step 3: bulk download NDJSON via endpoint ufficiale ──────
// POST /api/getobjects/{streamId}
// body: { objects: '["id1","id2",...]' }   ← stringa JSON di array
async function bulkDownload(ids: string[]): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];

  const BATCH_SIZE = 500;
  const all: Record<string, unknown>[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${SERVER}/api/getobjects/${STREAM_ID}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        ...AUTH,
      },
      body: JSON.stringify({ objects: JSON.stringify(batch) }),
    });

    if (!res.ok) {
      console.warn(`[Speckle] Batch ${i} failed: ${res.status} ${res.statusText}`);
      continue;
    }

    const text = await res.text();
    const parsed = parseNDJSON(text);
    all.push(...parsed);
    console.log(`[Speckle] Batch ${i}–${i + batch.length}: ${parsed.length} objects`);
  }

  return all;
}

// ── API pubblica ─────────────────────────────────────────────
export async function fetchBimObjects(): Promise<BimObject[]> {
  console.log("[Speckle] Fetching real BIM data...");

  // 1. Root object ID
  const rootId = await getRootObjectId();

  // 2. Root object → __closure (mappa di tutti i child IDs)
  const rootObj = await getRootObject(rootId);
  const closure = rootObj.__closure as Record<string, number> | undefined;
  const childIds = closure ? Object.keys(closure) : [];
  console.log(`[Speckle] __closure has ${childIds.length} IDs`);

  // 3. Download bulk (include root + tutti i children)
  const allIds = [rootId, ...childIds];
  const rawObjects = await bulkDownload(allIds);
  console.log(`[Speckle] Downloaded ${rawObjects.length} objects total`);

  // 4. Debug: tutti i tipi presenti
  const allTypes = new Set<string>();
  for (const o of rawObjects) {
    const t = o.speckle_type as string | undefined;
    if (t) allTypes.add(t);
  }
  console.log("[Speckle] Types in model:", [...allTypes]);

  // 5. Filtra e normalizza
  const seen = new Set<string>();
  const bimObjects: BimObject[] = [];

  for (const raw of rawObjects) {
    const obj = normalizeObject(raw as Record<string, unknown>);
    if (!obj || seen.has(obj.id)) continue;
    seen.add(obj.id);
    bimObjects.push(obj);
  }

  console.log(`[Speckle] BIM elements extracted: ${bimObjects.length}`);

  if (bimObjects.length === 0) {
    throw new Error(
      `No BIM elements found among ${rawObjects.length} objects. ` +
      `speckle_types: ${[...allTypes].slice(0, 12).join(", ")}`
    );
  }

  return bimObjects;
}
