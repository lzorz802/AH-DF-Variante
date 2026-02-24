// FILE: src/components/bim/SpeckleViewer.tsx

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Tipi da escludere sempre (pura geometria / materiali) ────
const SKIP_EXACT = new Set(["base", "reference"]);
const SKIP_PREFIX = [
  "objects.geometry.",
  "objects.other.rendermaterial",
  "objects.other.displaystyle",
  "objects.primitive.",
];
function shouldSkip(t: string): boolean {
  const tl = t.toLowerCase();
  return SKIP_EXACT.has(tl) || SKIP_PREFIX.some((p) => tl.startsWith(p));
}

// ── Categoria: copre BIM classico + GIS/Civil/IFC ────────────
function categoryFromType(speckleType: string): string {
  const s = speckleType.toLowerCase();

  // Objects.BuiltElements.*
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
  if (s.includes("site") || s.includes("terrain") || s.includes("topography")) return "Site";

  // Civil / GIS / Infrastructure
  if (s.includes("road") || s.includes("alignment") || s.includes("corridor")) return "Road";
  if (s.includes("bridge")) return "Bridge";
  if (s.includes("tunnel")) return "Tunnel";
  if (s.includes("structure")) return "Structure";
  if (s.includes("network") || s.includes("pipe") || s.includes("utility")) return "Utility";
  if (s.includes("land") || s.includes("parcel") || s.includes("plot")) return "Land";
  if (s.includes("vegetation") || s.includes("tree") || s.includes("plant")) return "Vegetation";
  if (s.includes("water") || s.includes("river") || s.includes("lake")) return "Water";
  if (s.includes("building") || s.includes("mass")) return "Building";

  // Prende il segmento finale del tipo come categoria fallback
  // es. "Objects.GIS.PolygonElement" → "PolygonElement"
  const parts = speckleType.split(".");
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last && last.length > 2 && last !== "Base") return last;
  }

  return "Other";
}

// ── Estrae il livello/piano da un raw object ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLevel(raw: Record<string, any>): string {
  // Prova vari percorsi comuni
  const candidates = [
    raw.level?.name,
    raw.level,
    raw["Level"]?.name,
    raw["Level"],
    raw.storey,
    raw["Storey"],
    raw.floor,
    raw["Floor"],
    raw.elevation,
    raw["Elevation"],
    raw.properties?.level,
    raw.properties?.Level,
    raw.properties?.["IfcBuildingStorey"],
    raw["@Level"],
  ];

  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object" && c.name) return String(c.name).trim();
    if (c && typeof c === "number") return `Level ${c}`;
  }

  // Cerca nei parameters Revit
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  if (params) {
    const levelKeys = [
      "SCHEDULE_LEVEL_PARAM", "FAMILY_LEVEL_PARAM",
      "INSTANCE_REFERENCE_LEVEL_PARAM", "LEVEL_PARAM"
    ];
    for (const key of levelKeys) {
      const val = params[key]?.value;
      if (val && typeof val === "string" && val.trim()) return val.trim();
    }
  }

  return "Unknown";
}

// ── Estrae il materiale ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMaterial(raw: Record<string, any>): string {
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  const pv = (key: string) => params?.[key]?.value;

  const candidates = [
    pv("MATERIAL_ASSET_PARAM"),
    pv("ALL_MODEL_MATERIAL_NAME"),
    pv("STRUCTURAL_MATERIAL_PARAM"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw.materials as any[])?.[0]?.name,
    raw.material,
    raw["Material"],
    raw.properties?.material,
    raw.properties?.Material,
  ];

  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim() && c !== "Unknown") return c.trim();
  }
  return "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromRaw(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? raw.applicationId ?? "");
  const speckleType = String(raw.speckle_type ?? raw.type ?? "");
  if (!id || !speckleType || shouldSkip(speckleType)) return null;

  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  const pv = (key: string) => params?.[key]?.value;
  const volume = Number(pv?.("HOST_VOLUME_COMPUTED") ?? pv?.("VOLUME") ?? raw.volume ?? 0);
  const area = Number(pv?.("HOST_AREA_COMPUTED") ?? pv?.("AREA") ?? raw.area ?? raw.baseArea ?? 0);

  return {
    id,
    speckleType,
    category: categoryFromType(speckleType),
    level: extractLevel(raw),
    material: extractMaterial(raw),
    volume: isNaN(volume) ? 0 : volume,
    area: isNaN(area) ? 0 : area,
    family: raw.family as string | undefined,
    mark: (raw.mark ?? raw["Mark"] ?? raw.name ?? raw["Name"]) as string | undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromWorldTree(worldTree: any, logSample: boolean): BimObject[] {
  const objects: BimObject[] = [];
  const seen = new Set<string>();
  const typeCounts: Record<string, number> = {};

  try {
    if (typeof worldTree.getAllObjects === "function") {
      const allObjs = worldTree.getAllObjects() ?? [];
      console.log(`[WorldTree] getAllObjects() → ${allObjs.length} items`);

      // Log struttura completa dei primi 5 oggetti
      if (logSample) {
        for (let i = 0; i < Math.min(5, allObjs.length); i++) {
          const obj = allObjs[i];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = (obj as any)?.raw ?? obj;
          console.log(`[WorldTree][${i}] speckle_type="${raw?.speckle_type}", type="${raw?.type}"`);
          console.log(`[WorldTree][${i}] keys:`, Object.keys(raw ?? {}).join(", "));
          console.log(`[WorldTree][${i}] level:`, raw?.level, "| Level:", raw?.Level);
          console.log(`[WorldTree][${i}] full raw:`, JSON.stringify(raw).slice(0, 600));
        }
      }

      for (const obj of allObjs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (obj as any)?.raw ?? obj;
        const t = String(raw?.speckle_type ?? raw?.type ?? "");
        if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1;

        const bimObj = extractFromRaw(raw ?? {});
        if (bimObj && !seen.has(bimObj.id)) {
          seen.add(bimObj.id);
          objects.push(bimObj);
        }
      }

      console.log("[WorldTree] Type distribution:", typeCounts);

      const catCounts: Record<string, number> = {};
      for (const o of objects) catCounts[o.category] = (catCounts[o.category] ?? 0) + 1;
      console.log("[WorldTree] Category distribution:", catCounts);

      const levelSample = [...new Set(objects.map(o => o.level))].slice(0, 10);
      console.log("[WorldTree] Level sample:", levelSample);

      if (objects.length > 0) return objects;
    }
  } catch (e) {
    console.warn("[WorldTree] getAllObjects failed:", e);
  }

  // walk() fallback
  try {
    if (typeof worldTree.walk === "function") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      worldTree.walk((node: any) => {
        const raw = node?.model?.raw ?? node?.raw ?? node?.data?.raw;
        if (!raw) return true;
        const t = String(raw?.speckle_type ?? "");
        if (t) typeCounts[t] = (typeCounts[t] ?? 0) + 1;
        const bimObj = extractFromRaw(raw);
        if (bimObj && !seen.has(bimObj.id)) {
          seen.add(bimObj.id);
          objects.push(bimObj);
        }
        return true;
      });
      console.log("[WorldTree] walk() types:", typeCounts);
    }
  } catch (e) { console.warn("[WorldTree] walk() failed:", e); }

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
    setStatusLines((prev) => [...prev.slice(-4), msg]);
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
      const worldTree = viewer.getWorldTree();
      const bimObjects = extractFromWorldTree(worldTree, true);
      log(`Extracted ${bimObjects.length} elements`);

      if (bimObjects.length === 0) {
        throw new Error("0 elements extracted — check browser console for [WorldTree] logs");
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
