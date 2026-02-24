// ============================================================
// FILE: src/lib/speckleExtractor.ts
// ============================================================
// Versione diagnostica: logga ogni step in dettaglio per
// capire esattamente cosa restituisce l'API Speckle.
// ============================================================

import type { BimObject } from "@/store/bimStore";

const SERVER = "https://app.speckle.systems";
const STREAM_ID = "a0102047d4";
const TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";
const AUTH = { Authorization: `Bearer ${TOKEN}` };

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
  if (!id || !speckleType) return null;

  // Livello
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
async function getRootObjectId(): Promise<{ rootId: string; modelName: string }> {
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
      console.log(`[Speckle] ✅ Model: "${m.name}", rootId: ${ref}`);
      return { rootId: ref, modelName: m.name };
    }
  }
  throw new Error("No versions found");
}

// ── Step 2: scarica il root object per leggere __closure ─────
async function getRootObject(rootId: string): Promise<Record<string, unknown>> {
  // Prova tutti gli endpoint possibili in ordine
  const endpoints = [
    `${SERVER}/objects/${STREAM_ID}/${rootId}/single`,
    `${SERVER}/streams/${STREAM_ID}/objects/${rootId}`,
  ];

  for (const url of endpoints) {
    console.log(`[Speckle] Trying GET ${url}`);
    try {
      const res = await fetch(url, { headers: AUTH });
      console.log(`[Speckle] → status: ${res.status}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "";
        let data: Record<string, unknown>;
        if (contentType.includes("json")) {
          data = await res.json();
        } else {
          // Potrebbe essere NDJSON — prendi la prima riga
          const text = await res.text();
          console.log(`[Speckle] → response (first 200 chars): ${text.slice(0, 200)}`);
          const lines = parseNDJSON(text);
          data = (lines[0] ?? {}) as Record<string, unknown>;
        }
        console.log(`[Speckle] Root object keys: ${Object.keys(data).join(", ")}`);
        return data;
      }
    } catch (e) {
      console.warn(`[Speckle] Endpoint failed:`, e);
    }
  }
  throw new Error("All root object endpoints failed");
}

// ── Step 3a: bulk download via POST /api/getobjects ──────────
async function bulkDownloadViaAPI(ids: string[]): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  const BATCH = 500;
  const all: Record<string, unknown>[] = [];

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH);
    const url = `${SERVER}/api/getobjects/${STREAM_ID}`;
    console.log(`[Speckle] POST ${url} — batch ${i}–${i + batch.length}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        ...AUTH,
      },
      body: JSON.stringify({ objects: JSON.stringify(batch) }),
    });

    console.log(`[Speckle] → status: ${res.status}, content-type: ${res.headers.get("content-type")}`);

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Speckle] Batch failed: ${errText.slice(0, 300)}`);
      continue;
    }

    const text = await res.text();
    console.log(`[Speckle] → body length: ${text.length}, first 300 chars: ${text.slice(0, 300)}`);
    const parsed = parseNDJSON(text);
    console.log(`[Speckle] → parsed ${parsed.length} objects from NDJSON`);
    all.push(...parsed);
  }
  return all;
}

// ── Step 3b: fallback — GET singoli oggetti ───────────────────
// Se /api/getobjects non funziona, proviamo endpoint alternativo
async function downloadViaObjectsEndpoint(rootId: string): Promise<Record<string, unknown>[]> {
  // Endpoint che scarica root + tutti i children ricorsivamente
  const url = `${SERVER}/objects/${STREAM_ID}/${rootId}`;
  console.log(`[Speckle] Fallback GET ${url}`);
  const res = await fetch(url, {
    headers: { Accept: "text/plain", ...AUTH },
  });
  console.log(`[Speckle] → status: ${res.status}`);
  if (!res.ok) {
    const t = await res.text();
    console.warn(`[Speckle] Fallback failed: ${t.slice(0, 200)}`);
    return [];
  }
  const text = await res.text();
  console.log(`[Speckle] → body length: ${text.length}, first 500 chars:\n${text.slice(0, 500)}`);
  return parseNDJSON(text);
}

// ── API pubblica ─────────────────────────────────────────────
export async function fetchBimObjects(): Promise<BimObject[]> {
  console.log("[Speckle] ═══ Starting diagnostic fetch ═══");

  // 1. Root ID
  const { rootId } = await getRootObjectId();

  // 2. Root object
  const rootObj = await getRootObject(rootId);
  const closure = rootObj.__closure as Record<string, number> | undefined;
  console.log(`[Speckle] __closure type: ${typeof closure}, keys: ${closure ? Object.keys(closure).length : "N/A"}`);

  let rawObjects: Record<string, unknown>[] = [];

  if (closure && Object.keys(closure).length > 0) {
    // Abbiamo il __closure — usa bulk download
    const childIds = Object.keys(closure);
    console.log(`[Speckle] Downloading ${childIds.length} objects via API...`);
    console.log(`[Speckle] First 5 IDs: ${childIds.slice(0, 5).join(", ")}`);
    rawObjects = await bulkDownloadViaAPI([rootId, ...childIds]);
  } else {
    console.log("[Speckle] No __closure found — trying fallback endpoint");
    rawObjects = await downloadViaObjectsEndpoint(rootId);
  }

  console.log(`[Speckle] Total raw objects: ${rawObjects.length}`);

  // Debug: tutti i tipi
  const allTypes = new Set<string>();
  for (const o of rawObjects) {
    const t = o.speckle_type as string | undefined;
    if (t) allTypes.add(t);
  }
  console.log("[Speckle] All speckle_types found:", [...allTypes]);

  // Filtra e normalizza — ACCETTA QUALSIASI TIPO con id valido
  // (non solo builtelements) per debug iniziale
  const seen = new Set<string>();
  const bimObjects: BimObject[] = [];
  const skippedTypes = new Set<string>();

  const SKIP_EXACT = new Set([
    "base", "reference",
  ]);
  const SKIP_PREFIX = [
    "objects.geometry.",
    "objects.other.rendermaterial",
    "objects.other.displaystyle",
    "objects.primitive.",
  ];

  for (const raw of rawObjects) {
    const speckleType = String(raw.speckle_type ?? "");
    const t = speckleType.toLowerCase();

    // Skip geometry e materiali
    if (SKIP_EXACT.has(t) || SKIP_PREFIX.some((p) => t.startsWith(p))) {
      skippedTypes.add(speckleType);
      continue;
    }

    const obj = normalizeObject(raw as Record<string, unknown>);
    if (!obj || seen.has(obj.id)) continue;
    seen.add(obj.id);
    bimObjects.push(obj);
  }

  console.log(`[Speckle] Skipped types: ${[...skippedTypes].join(", ")}`);
  console.log(`[Speckle] BIM elements extracted: ${bimObjects.length}`);

  if (bimObjects.length > 0) {
    const cats: Record<string, number> = {};
    for (const o of bimObjects) cats[o.category] = (cats[o.category] ?? 0) + 1;
    console.log("[Speckle] Categories:", cats);
  }

  if (bimObjects.length === 0) {
    throw new Error(
      `No elements found among ${rawObjects.length} objects. ` +
      `Types: ${[...allTypes].join(", ")}`
    );
  }

  return bimObjects;
}
