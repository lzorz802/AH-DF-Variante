// FILE: src/components/bim/SpeckleViewer.tsx

import { useEffect, useRef, useCallback } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

const SKIP_EXACT = new Set(["base", "reference", "dataobject"]);
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

function categoryFromType(speckleType: string): string {
  const s = speckleType.toLowerCase();
  if (s.includes("ifcwall")) return "Wall";
  if (s.includes("ifcslab") || s.includes("ifcfloor")) return "Floor";
  if (s.includes("ifccolumn")) return "Column";
  if (s.includes("ifcbeam") || s.includes("ifcmember")) return "Beam";
  if (s.includes("ifcroof")) return "Roof";
  if (s.includes("ifcwindow")) return "Window";
  if (s.includes("ifcdoor")) return "Door";
  if (s.includes("ifcstair")) return "Stair";
  if (s.includes("ifccovering") || s.includes("ifcceiling")) return "Ceiling";
  if (s.includes("ifcfurnishing") || s.includes("ifcfurniture")) return "Furniture";
  if (s.includes("ifcrailing")) return "Railing";
  if (s.includes("ifcpipe") || s.includes("ifcduct") || s.includes("ifcflow")) return "MEP";
  if (s.includes("ifcsite") || s.includes("ifcterrain")) return "Site";
  if (s.includes("ifcspace") || s.includes("ifczone")) return "Room";
  if (s.includes("ifcbuilding")) return "Building";
  if (s.includes("ifcroadpavement") || s.includes("ifcroad")) return "Road";
  if (s.includes("ifcrailway") || s.includes("ifctrack")) return "Railway";
  if (s.includes("ifcbridge")) return "Bridge";
  if (s.includes("ifcsign")) return "Sign";
  if (s.includes("ifc")) return "IFC-Other";
  if (s.includes("wall")) return "Wall";
  if (s.includes("floor") || s.includes("slab")) return "Floor";
  if (s.includes("column")) return "Column";
  if (s.includes("beam") || s.includes("framing")) return "Beam";
  if (s.includes("roof")) return "Roof";
  if (s.includes("window")) return "Window";
  if (s.includes("door")) return "Door";
  if (s.includes("stair")) return "Stair";
  if (s.includes("ceiling")) return "Ceiling";
  if (s.includes("furniture")) return "Furniture";
  if (s.includes("railing")) return "Railing";
  if (s.includes("pipe") || s.includes("duct") || s.includes("conduit") || s.includes("cable")) return "MEP";
  if (s.includes("site") || s.includes("topography") || s.includes("terrain")) return "Site";
  if (s.includes("room") || s.includes("space")) return "Room";
  if (s.includes("road") || s.includes("pavement") || s.includes("corridor")) return "Road";
  if (s.includes("bridge")) return "Bridge";
  if (s.includes("tunnel")) return "Tunnel";
  if (s.includes("land") || s.includes("parcel") || s.includes("polygon")) return "Land";
  if (s.includes("vegetation") || s.includes("tree") || s.includes("plant")) return "Vegetation";
  if (s.includes("water") || s.includes("river") || s.includes("lake")) return "Water";
  if (s.includes("building") || s.includes("mass")) return "Building";
  if (s.includes("network") || s.includes("utility")) return "Utility";
  if (s.includes("instanceproxy")) return "Instance";
  if (s.includes("definitionproxy")) return "Definition";
  if (s.includes("levelproxy")) return "Level";
  if (s.includes("collection")) return "Collection";
  const parts = speckleType.split(".");
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last && last.length > 2 && last !== "Base") return last;
  }
  return "Other";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractLevel(raw: Record<string, any>): string {
  const candidates = [
    raw.level?.name, raw.level, raw["Level"]?.name, raw["Level"],
    raw.storey, raw["Storey"], raw.floor, raw["Floor"],
    raw.elevation, raw["@Level"],
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) return c.trim();
    if (c && typeof c === "object" && c.name) return String(c.name).trim();
    if (c && typeof c === "number") return `Level ${c}`;
  }
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  if (params) {
    for (const key of ["SCHEDULE_LEVEL_PARAM", "FAMILY_LEVEL_PARAM", "INSTANCE_REFERENCE_LEVEL_PARAM", "LEVEL_PARAM"]) {
      const val = params[key]?.value;
      if (val && typeof val === "string" && val.trim()) return val.trim();
    }
  }
  return "Unknown";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMaterial(raw: Record<string, any>): string {
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  const pv = (key: string) => params?.[key]?.value;
  const candidates = [
    pv("MATERIAL_ASSET_PARAM"), pv("ALL_MODEL_MATERIAL_NAME"), pv("STRUCTURAL_MATERIAL_PARAM"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw.materials as any[])?.[0]?.name, raw.material, raw["Material"],
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim() && c !== "Unknown") return c.trim();
  }
  return "Unknown";
}

// ── Calcola area da bbox/vertices per oggetti GIS/Civil ───────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateAreaVolume(raw: Record<string, any>): { area: number; volume: number } {
  const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
  const pv = (key: string) => {
    const v = params?.[key]?.value;
    return v !== undefined ? Number(v) : NaN;
  };

  // 1. Prova prima i parametri Revit/IFC standard
  let volume = pv("HOST_VOLUME_COMPUTED");
  if (isNaN(volume)) volume = pv("VOLUME");
  if (isNaN(volume)) volume = Number(raw.volume ?? raw.Volume ?? NaN);

  let area = pv("HOST_AREA_COMPUTED");
  if (isNaN(area)) area = pv("AREA");
  if (isNaN(area)) area = Number(raw.area ?? raw.Area ?? raw.baseArea ?? NaN);

  // 2. Prova da bbox (presente su molti oggetti GIS/Civil Speckle)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bbox = raw.bbox ?? raw.boundingBox ?? raw["@BoundingBox"] as any;
  if (bbox) {
    const minX = Number(bbox.min?.x ?? bbox.minX ?? NaN);
    const minY = Number(bbox.min?.y ?? bbox.minY ?? NaN);
    const minZ = Number(bbox.min?.z ?? bbox.minZ ?? NaN);
    const maxX = Number(bbox.max?.x ?? bbox.maxX ?? NaN);
    const maxY = Number(bbox.max?.y ?? bbox.maxY ?? NaN);
    const maxZ = Number(bbox.max?.z ?? bbox.maxZ ?? NaN);

    if (!isNaN(minX) && !isNaN(maxX)) {
      const dx = Math.abs(maxX - minX);
      const dy = Math.abs(maxY - minY);
      const dz = !isNaN(minZ) ? Math.abs(maxZ - minZ) : 0;

      if (isNaN(area) && dx > 0 && dy > 0) {
        area = dx * dy; // stima piano XY
      }
      if (isNaN(volume) && dx > 0 && dy > 0 && dz > 0) {
        volume = dx * dy * dz;
      }
    }
  }

  // 3. Stima da displayValue/mesh vertices se disponibili
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayValue = raw.displayValue ?? raw["@displayValue"] as any[];
  if (Array.isArray(displayValue) && displayValue.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mesh = displayValue[0] as any;
    const verts = mesh?.vertices as number[] | undefined;
    if (verts && verts.length >= 6 && isNaN(area)) {
      // Calcola bbox dai vertices per stima area
      let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity;
      for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i], y = verts[i + 1];
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
      }
      if (isFinite(mxX - mnX)) area = (mxX - mnX) * (mxY - mnY);
    }
  }

  return {
    volume: isNaN(volume) || volume < 0 ? 0 : volume,
    area: isNaN(area) || area < 0 ? 0 : area,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromRaw(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? raw.applicationId ?? "");
  const speckleType = String(raw.speckle_type ?? raw.type ?? "");
  if (!id || !speckleType || shouldSkip(speckleType)) return null;

  const { area, volume } = estimateAreaVolume(raw);

  return {
    id,
    speckleType,
    category: categoryFromType(speckleType),
    level: extractLevel(raw),
    material: extractMaterial(raw),
    volume,
    area,
    family: raw.family as string | undefined,
    mark: (raw.mark ?? raw["Mark"] ?? raw.name ?? raw["Name"]) as string | undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walkWorldTree(worldTree: any): BimObject[] {
  const objects: BimObject[] = [];
  const seen = new Set<string>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processRaw = (raw: Record<string, any>) => {
    const obj = extractFromRaw(raw);
    if (obj && !seen.has(obj.id)) {
      seen.add(obj.id);
      objects.push(obj);
    }
  };

  if (typeof worldTree.walk === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldTree.walk((node: any) => {
      const raw = node?.model?.raw ?? node?.raw ?? node?.data?.raw;
      if (raw) processRaw(raw);
      return true;
    });
  }

  if (objects.length === 0 && typeof worldTree.getAllObjects === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = worldTree.getAllObjects() ?? [];
    for (const o of all) {
      const raw = o?.raw ?? o?.model?.raw ?? o;
      if (raw) processRaw(raw);
    }
  }

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

      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }

      const worldTree = viewer.getWorldTree();
      const bimObjects = walkWorldTree(worldTree);

      if (bimObjects.length === 0) {
        throw new Error("Nessun elemento trovato nel modello");
      }

      setBimObjects(bimObjects);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoadError(msg);
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
          <button
            onClick={() => { isInitialized.current = false; setLoadError(null); setLoading(true); initViewer(); }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          BIM 3D · Speckle
        </span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
