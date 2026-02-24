// FILE: src/components/bim/SpeckleViewer.tsx

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function categoryFromProperties(props: Record<string, any>): string {
  const raw =
    props["category"] ?? props["Category"] ??
    props["ifcType"] ?? props["IfcType"] ??
    props["type"] ?? props["Type"] ?? "";
  if (raw && typeof raw === "string" && raw.trim()) {
    const c = raw.trim();
    const MAP: Record<string, string> = {
      "Walls": "Wall", "Wall": "Wall",
      "Floors": "Floor", "Floor": "Floor", "Slab": "Floor",
      "Columns": "Column", "Column": "Column",
      "Structural Framing": "Beam", "Beams": "Beam", "Beam": "Beam",
      "Roofs": "Roof", "Roof": "Roof",
      "Windows": "Window", "Window": "Window",
      "Doors": "Door", "Door": "Door",
      "Stairs": "Stair", "Stair": "Stair",
      "Ceilings": "Ceiling", "Ceiling": "Ceiling",
      "Furniture": "Furniture",
      "Railings": "Railing", "Railing": "Railing",
      "Pipes": "MEP", "Ducts": "MEP", "MEP": "MEP",
      "Topography": "Site", "Site": "Site",
      "Rooms": "Room", "Room": "Room",
      "Generic Models": "Generic",
    };
    if (MAP[c]) return MAP[c];
    const lower = c.toLowerCase();
    if (lower.includes("wall")) return "Wall";
    if (lower.includes("floor") || lower.includes("slab")) return "Floor";
    if (lower.includes("column")) return "Column";
    if (lower.includes("beam") || lower.includes("framing")) return "Beam";
    if (lower.includes("roof")) return "Roof";
    if (lower.includes("window")) return "Window";
    if (lower.includes("door")) return "Door";
    if (lower.includes("stair")) return "Stair";
    if (lower.includes("ceiling")) return "Ceiling";
    if (lower.includes("furniture")) return "Furniture";
    if (lower.includes("railing")) return "Railing";
    if (lower.includes("pipe") || lower.includes("duct")) return "MEP";
    if (lower.includes("site") || lower.includes("topograph") || lower.includes("terrain")) return "Site";
    if (lower.includes("room") || lower.includes("space")) return "Room";
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return "Other";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function levelFromProperties(props: Record<string, any>): string {
  const candidates = [
    props["Level"], props["level"], props["Livello"],
    props["Floor"], props["Storey"], props["BuildingStorey"],
    props["IfcBuildingStorey"],
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object") {
      const name = c.name ?? c.Name ?? c.elevation;
      if (name) return String(name).trim();
    }
    if (typeof c === "number") return `Level ${c}`;
  }
  return "Unknown";
}

// ── NEW: Extract area & volume from Speckle V3 materialQuantities ────────────
// materialQuantities = {
//   "MaterialName": {
//     area:   { value: number, units: string },
//     volume: { value: number, units: string },
//     ...
//   },
//   ...
// }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromMaterialQuantities(mq: Record<string, any>): { area: number; volume: number } | null {
  let totalArea = 0;
  let totalVolume = 0;
  let found = false;

  for (const matKey of Object.keys(mq)) {
    const mat = mq[matKey];
    if (!mat || typeof mat !== "object") continue;

    // area
    if (mat.area && typeof mat.area === "object" && typeof mat.area.value === "number") {
      totalArea += mat.area.value;
      found = true;
    }
    // volume
    if (mat.volume && typeof mat.volume === "object" && typeof mat.volume.value === "number") {
      totalVolume += mat.volume.value;
      found = true;
    }
  }

  if (!found) return null;
  return { area: totalArea, volume: totalVolume };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bimObjectFromRaw(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? raw.applicationId ?? "");
  if (!id) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flat: Record<string, any> = { ...raw };
  if (raw.parameters && typeof raw.parameters === "object") {
    for (const [k, v] of Object.entries(raw.parameters)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      flat[k] = (v as any)?.value ?? v;
    }
  }
  if (raw.properties && typeof raw.properties === "object") {
    for (const [k, v] of Object.entries(raw.properties)) {
      if (!(k in flat)) flat[k] = v;
    }
  }

  const speckleType = String(raw.speckle_type ?? raw.type ?? "");
  const category = categoryFromProperties(flat);
  const level = levelFromProperties(flat);
  const material = String(
    flat["material"] ?? flat["Material"] ??
    flat["MATERIAL_ASSET_PARAM"] ?? flat["STRUCTURAL_MATERIAL_PARAM"] ?? "Unknown"
  ).trim();
  const name = String(flat["name"] ?? flat["Name"] ?? flat["mark"] ?? flat["Mark"] ?? id.slice(0, 12));

  // ── MODIFIED: area & volume extraction ───────────────────────────────────
  // Step 1: Try materialQuantities (Speckle V3 / Next-Gen connectors)
  let volume = 0;
  let area = 0;

  const mq = raw.materialQuantities;
  if (mq && typeof mq === "object" && !Array.isArray(mq)) {
    const mqResult = extractFromMaterialQuantities(mq);
    if (mqResult !== null) {
      area = mqResult.area;
      volume = mqResult.volume;
      console.log(
        `[BIM][materialQuantities] id=${id.slice(0, 8)} area=${area.toFixed(2)} volume=${volume.toFixed(2)}`
      );
    } else {
      // materialQuantities exists but had no readable values — fall through to legacy
      console.warn(`[BIM][materialQuantities] id=${id.slice(0, 8)} — found but no numeric values`);
    }
  }

  // Step 2: Fallback to legacy flat params if materialQuantities gave nothing
  if (area === 0 && volume === 0) {
    const legacyVolume = Number(flat["volume"] ?? flat["Volume"] ?? flat["HOST_VOLUME_COMPUTED"] ?? 0);
    const legacyArea   = Number(flat["area"]   ?? flat["Area"]   ?? flat["HOST_AREA_COMPUTED"]   ?? 0);
    volume = isNaN(legacyVolume) ? 0 : legacyVolume;
    area   = isNaN(legacyArea)   ? 0 : legacyArea;
    if (volume > 0 || area > 0) {
      console.log(
        `[BIM][legacy params] id=${id.slice(0, 8)} area=${area.toFixed(2)} volume=${volume.toFixed(2)}`
      );
    }
  }

  // Step 3: Final NaN guard
  if (isNaN(volume)) volume = 0;
  if (isNaN(area))   area   = 0;
  // ── END MODIFIED ─────────────────────────────────────────────────────────

  return {
    id, speckleType, category, level,
    material: material || "Unknown",
    volume,
    area,
    family: flat["family"] ?? flat["Family"] ?? undefined,
    mark: name,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractFromViewer(viewer: any, logFn: (msg: string) => void): Promise<BimObject[]> {
  const objects: BimObject[] = [];
  const seen = new Set<string>();

  // ── TENTATIVO 1: getObjectProperties() ───────────────────
  if (typeof viewer.getObjectProperties === "function") {
    logFn("Trying getObjectProperties()...");
    try {
      const props = await viewer.getObjectProperties();
      console.log(`[BIM] getObjectProperties() → ${props?.length ?? 0} items`);

      if (props && props.length > 0) {
        for (let i = 0; i < Math.min(3, props.length); i++) {
          const p = props[i];
          console.log(`[BIM][getObjProps][${i}] id=${p.id} type=${p.type}`);
          console.log(`[BIM][getObjProps][${i}] keys:`, Object.keys(p.properties ?? {}).slice(0, 30).join(", "));
          console.log(`[BIM][getObjProps][${i}] category="${p.properties?.category ?? p.properties?.Category}" level="${p.properties?.Level ?? p.properties?.level}"`);
          console.log(`[BIM][getObjProps][${i}] FULL properties:`, JSON.stringify(p.properties ?? {}).slice(0, 800));
        }

        for (const info of props) {
          const id = String(info.id ?? "");
          if (!id || seen.has(id)) continue;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const flat: Record<string, any> = { id };
          if (info.properties) {
            for (const [k, v] of Object.entries(info.properties)) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              flat[k] = (v as any)?.value !== undefined ? (v as any).value : v;
            }
          }
          flat["speckle_type"] = flat["speckle_type"] ?? info.type ?? "";
          const obj = bimObjectFromRaw(flat);
          if (obj) { seen.add(id); objects.push(obj); }
        }

        if (objects.length > 0) {
          console.log("[BIM] getObjectProperties() SUCCESS:", objects.length);
          return objects;
        }
        console.warn("[BIM] getObjectProperties() → items ma 0 BimObject costruiti, passo al WorldTree");
      }
    } catch (e) {
      console.warn("[BIM] getObjectProperties() errore:", e);
    }
  } else {
    console.log("[BIM] getObjectProperties() NON disponibile in questa versione del viewer");
  }

  // ── TENTATIVO 2: WorldTree walk ───────────────────────────
  logFn("Trying WorldTree walk...");
  const worldTree = viewer.getWorldTree?.();
  if (!worldTree) {
    console.warn("[BIM] getWorldTree() ha restituito null/undefined");
    return objects;
  }

  console.log("[BIM] WorldTree instance keys:", Object.keys(worldTree).join(", "));
  const proto = Object.getPrototypeOf(worldTree);
  console.log("[BIM] WorldTree prototype methods:", Object.getOwnPropertyNames(proto).join(", "));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRaws: Record<string, any>[] = [];

  if (typeof worldTree.walk === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldTree.walk((node: any) => {
      const raw =
        node?.model?.raw ??
        node?.raw ??
        node?.data?.raw ??
        node?.model ??
        node;
      if (raw && (raw.id || raw.applicationId)) allRaws.push(raw);
      return true;
    });
    console.log(`[BIM] walk() → ${allRaws.length} raw objects`);
  }

  if (allRaws.length === 0 && typeof worldTree.getAllObjects === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = worldTree.getAllObjects() ?? [];
    console.log(`[BIM] getAllObjects() → ${all.length}`);
    for (const o of all) {
      const raw = o?.raw ?? o?.model?.raw ?? o;
      if (raw && (raw.id || raw.applicationId)) allRaws.push(raw);
    }
  }

  // Log dettagliato dei primi 5 raw per capire la struttura
  console.log(`[BIM] Totale raw da WorldTree: ${allRaws.length}`);
  for (let i = 0; i < Math.min(5, allRaws.length); i++) {
    const r = allRaws[i];
    console.log(`\n[BIM][raw][${i}] ===`);
    console.log(`  id: ${r.id ?? r.applicationId}`);
    console.log(`  speckle_type: ${r.speckle_type}`);
    console.log(`  ALL keys: ${Object.keys(r).join(", ")}`);
    console.log(`  category: ${r.category ?? r.Category ?? "(mancante)"}`);
    console.log(`  level: ${r.level ?? r.Level ?? "(mancante)"}`);
    // ── NEW: log materialQuantities presence for debugging
    console.log(`  materialQuantities: ${r.materialQuantities ? "PRESENT ✅" : "absent"}`);
    if (r.materialQuantities && typeof r.materialQuantities === "object") {
      console.log(`  materialQuantities keys: ${Object.keys(r.materialQuantities).slice(0, 5).join(", ")}`);
      const firstKey = Object.keys(r.materialQuantities)[0];
      if (firstKey) {
        console.log(`  materialQuantities["${firstKey}"]:`, JSON.stringify(r.materialQuantities[firstKey]).slice(0, 200));
      }
    }
    console.log(`  FULL JSON (1500 chars): ${JSON.stringify(r).slice(0, 1500)}`);
  }

  // Distribuzione speckle_type
  const typeDist: Record<string, number> = {};
  for (const r of allRaws) {
    const t = String(r.speckle_type ?? r.type ?? "?");
    typeDist[t] = (typeDist[t] ?? 0) + 1;
  }
  console.log("[BIM] speckle_type distribution:", JSON.stringify(typeDist, null, 2));

  // Converti — accetta TUTTI gli oggetti con id valido
  for (const raw of allRaws) {
    const id = String(raw.id ?? raw.applicationId ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const obj = bimObjectFromRaw(raw);
    if (obj) objects.push(obj);
  }

  const catDist: Record<string, number> = {};
  for (const o of objects) catDist[o.category] = (catDist[o.category] ?? 0) + 1;
  console.log("[BIM] Category distribution:", JSON.stringify(catDist, null, 2));

  // ── NEW: log area/volume summary
  const totalArea = objects.reduce((s, o) => s + o.area, 0);
  const totalVolume = objects.reduce((s, o) => s + o.volume, 0);
  const withArea = objects.filter((o) => o.area > 0).length;
  const withVolume = objects.filter((o) => o.volume > 0).length;
  console.log(`[BIM] Area/Volume summary: totalArea=${totalArea.toFixed(1)}m² (${withArea} elements), totalVolume=${totalVolume.toFixed(1)}m³ (${withVolume} elements)`);

  return objects;
}

export const SpeckleViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteringExtRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectionExtRef = useRef<any>(null);
  const isInitialized = useRef(false);

  const [statusLines, setStatusLines] = useState<string[]>([]);
  const log = (msg: string) => {
    console.log(`[SpeckleViewer] ${msg}`);
    setStatusLines((prev) => [...prev.slice(-6), msg]);
  };

  const {
    setSelectedIds, setLoading, setLoadError, setBimObjects,
    isLoading, loadError, filteredIds, selectedIds, lastSelectionSource,
  } = useBimStore();

  const initViewer = useCallback(async () => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;
    setLoading(true);
    setLoadError(null);

    try {
      const speckle = await import(/* @vite-ignore */ "@speckle/viewer");
      const {
        Viewer, DefaultViewerParams, ViewerEvent,
        SpeckleLoader, UrlHelper,
        CameraController, SelectionExtension, FilteringExtension,
      } = speckle;

      const viewer = new Viewer(containerRef.current, {
        ...DefaultViewerParams, showStats: false, verbose: false,
      });
      await viewer.init();
      viewerRef.current = viewer;

      viewer.createExtension(CameraController);
      if (FilteringExtension) filteringExtRef.current = viewer.createExtension(FilteringExtension);
      if (SelectionExtension) selectionExtRef.current = viewer.createExtension(SelectionExtension);

      if (ViewerEvent) {
        viewer.on(ViewerEvent.ObjectClicked, (event: unknown) => {
          const e = event as { hits?: Array<{ node?: { model?: { raw?: { id?: string } } } }> };
          const ids = (e?.hits ?? [])
            .map((h) => h?.node?.model?.raw?.id)
            .filter((id): id is string => Boolean(id));
          setSelectedIds(ids, "viewer");
        });
      }

      log("Loading 3D model...");
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }
      log("3D model loaded");

      log("Extracting BIM metadata...");
      const bimObjects = await extractFromViewer(viewer, log);
      log(`Extracted ${bimObjects.length} elements`);

      if (bimObjects.length === 0) {
        throw new Error("0 elements extracted — controlla la console per i log di debug");
      }

      setBimObjects(bimObjects);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
      log(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [setSelectedIds, setLoading, setLoadError, setBimObjects]);

  useEffect(() => {
    initViewer();
    return () => {
      if (viewerRef.current?.dispose) viewerRef.current.dispose();
      viewerRef.current = null;
      filteringExtRef.current = null;
      selectionExtRef.current = null;
      isInitialized.current = false;
    };
  }, [initViewer]);

  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) return;
    try {
      filtering.resetFilters();
      if (filteredIds.length > 0) filtering.isolateObjects(filteredIds, "filters", false);
    } catch (e) { console.warn("[SpeckleViewer] Filter error:", e); }
  }, [filteredIds]);

  useEffect(() => {
    const selection = selectionExtRef.current;
    if (!selection || lastSelectionSource !== "chart") return;
    try { selection.selectObjects([...selectedIds]); } catch { /* ignore */ }
  }, [selectedIds, lastSelectionSource]);

  const handleReset = () => {
    try {
      filteringExtRef.current?.resetFilters?.();
      selectionExtRef.current?.clearSelection?.();
    } catch { /* ignore */ }
    useBimStore.getState().clearFilters();
    useBimStore.getState().clearSelection();
  };

  return (
    <div className="relative w-full h-full bg-[#1a1f2e] rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-3" />
          <p className="text-sm text-blue-200 font-medium">Loading BIM model…</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/95 z-10 p-6">
          <WifiOff className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-red-300 font-medium text-center mb-2">Failed to load BIM data</p>
          <p className="text-xs text-slate-400 font-mono bg-slate-800/80 px-3 py-2 rounded max-w-sm break-all">{loadError}</p>
          <button onClick={() => { isInitialized.current = false; setLoadError(null); setLoading(true); initViewer(); }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium">
            Retry
          </button>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10">
        <button onClick={handleReset}
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {statusLines.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-20 bg-black/70 rounded p-2 pointer-events-none">
          {statusLines.map((line, i) => (
            <p key={i} className="text-[10px] font-mono text-green-300 leading-tight">{line}</p>
          ))}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          BIM 3D · Speckle
        </span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
