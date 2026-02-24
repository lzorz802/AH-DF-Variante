// FILE: src/components/bim/SpeckleViewer.tsx

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Category from speckle_type (IFC / Revit / Civil) ─────────────────────────
// Handles both Speckle native types (Objects.BuiltElements.Wall)
// and raw IFC class names (IfcWall, IfcSlab, etc.)
function categoryFromSpeckleType(speckleType: string): string | null {
  if (!speckleType) return null;
  const s = speckleType.toLowerCase();

  if (s.includes("wall"))         return "Wall";
  if (s.includes("floor") || s.includes("slab")) return "Floor";
  if (s.includes("column"))       return "Column";
  if (s.includes("beam") || s.includes("structuralframing") || s.includes("framing") || s.includes("member")) return "Beam";
  if (s.includes("roof"))         return "Roof";
  if (s.includes("window"))       return "Window";
  if (s.includes("door"))         return "Door";
  if (s.includes("stair"))        return "Stair";
  if (s.includes("ceiling"))      return "Ceiling";
  if (s.includes("furniture") || s.includes("furnishingelement")) return "Furniture";
  if (s.includes("railing") || s.includes("handrail")) return "Railing";
  if (s.includes("pipe") || s.includes("duct") || s.includes("mep") ||
      s.includes("conduit") || s.includes("flowsegment") || s.includes("distributionflowelem")) return "MEP";
  if (s.includes("site") || s.includes("terrain") || s.includes("topograph") ||
      s.includes("geographicelement") || s.includes("earthwork")) return "Site";
  if (s.includes("room") || s.includes("space") || s.includes("zone")) return "Room";
  if (s.includes("road") || s.includes("bridge") || s.includes("tunnel") ||
      s.includes("railway") || s.includes("pavement") || s.includes("alignment") ||
      s.includes("kerb") || s.includes("lane") || s.includes("marking") ||
      s.includes("barrier") || s.includes("carriageway")) return "Infrastructure";
  if (s.includes("vegetation") || s.includes("tree") || s.includes("plant")) return "Vegetation";
  if (s.includes("sign"))         return "Sign";
  if (s.includes("opening") || s.includes("void")) return "Opening";
  if (s.includes("covering"))     return "Ceiling"; // IfcCovering covers ceilings/floors
  if (s.includes("footing") || s.includes("pile") || s.includes("foundation")) return "Foundation";
  if (s.includes("plate"))        return "Beam";    // structural plate → beam macro
  // IFC generic fallback — don't return "Other" from speckle_type alone
  if (s.includes("element") || s.includes("builtelement") || s.includes("ifcproduct")) return null;

  return null;
}

// ── Category from property bag ────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function categoryFromProperties(flat: Record<string, any>, speckleType: string): string {
  // 1. speckle_type is most reliable for IFC models
  const fromType = categoryFromSpeckleType(speckleType);
  if (fromType) return fromType;

  // 2. Explicit category/type properties
  const raw =
    flat["category"] ?? flat["Category"] ??
    flat["ifcType"] ?? flat["IfcType"] ??
    flat["type"] ?? flat["Type"] ?? "";

  if (raw && typeof raw === "string" && raw.trim()) {
    const c = raw.trim();
    const fromProp = categoryFromSpeckleType(c);
    if (fromProp) return fromProp;

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

    // Return the raw string cleaned up if it's meaningful
    if (c.length > 2 && c.length < 40) return c.charAt(0).toUpperCase() + c.slice(1);
  }

  return "Other";
}

// ── Level extraction ──────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function levelFromProperties(flat: Record<string, any>): string {
  const candidates = [
    flat["Level"], flat["level"], flat["Livello"],
    flat["Floor"], flat["Storey"], flat["BuildingStorey"],
    flat["IfcBuildingStorey"],
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

// ── Area & volume from Speckle V3 materialQuantities ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromMaterialQuantities(mq: Record<string, any>): { area: number; volume: number } | null {
  let totalArea = 0;
  let totalVolume = 0;
  let found = false;

  for (const matKey of Object.keys(mq)) {
    const mat = mq[matKey];
    if (!mat || typeof mat !== "object") continue;

    if (mat.area && typeof mat.area === "object" && typeof mat.area.value === "number" && !isNaN(mat.area.value)) {
      totalArea += mat.area.value;
      found = true;
    }
    if (mat.volume && typeof mat.volume === "object" && typeof mat.volume.value === "number" && !isNaN(mat.volume.value)) {
      totalVolume += mat.volume.value;
      found = true;
    }
  }

  return found ? { area: totalArea, volume: totalVolume } : null;
}

// ── Area & volume from IFC quantity sets ─────────────────────────────────────
// IFC models store quantities in IfcElementQuantity → hasQuantities array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromIfcQuantities(raw: Record<string, any>): { area: number; volume: number } | null {
  let totalArea = 0;
  let totalVolume = 0;
  let found = false;

  // Container names used by Speckle's IFC converter
  const containerCandidates = [
    raw.quantities,
    raw.hasQuantities,
    raw.Quantities,
    raw.HasQuantities,
    // Sometimes stored directly under property sets
    raw.propertySets,
    raw.PropertySets,
  ].filter(Boolean);

  for (const container of containerCandidates) {
    const items: unknown[] = Array.isArray(container) ? container : Object.values(container);
    for (const qset of items) {
      if (!qset || typeof qset !== "object") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qs = qset as Record<string, any>;

      // Walk into nested quantity arrays
      const qItems: unknown[] = [
        ...(Array.isArray(qs.quantities) ? qs.quantities : []),
        ...(Array.isArray(qs.hasQuantities) ? qs.hasQuantities : []),
        ...(Array.isArray(qs.Quantities) ? qs.Quantities : []),
      ];

      for (const q of qItems) {
        if (!q || typeof q !== "object") continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qty = q as Record<string, any>;
        const qName = String(qty.name ?? qty.Name ?? "").toLowerCase();
        // IfcQuantityArea stores value in areaValue, IfcQuantityVolume in volumeValue
        const value = Number(qty.value ?? qty.Value ?? qty.areaValue ?? qty.volumeValue ?? NaN);
        if (isNaN(value) || value <= 0) continue;

        if (qName.includes("area") || qName.includes("surface") || qName.includes("floor")) {
          totalArea += value;
          found = true;
        } else if (qName.includes("volume") || qName.includes("vol")) {
          totalVolume += value;
          found = true;
        }
      }
    }
  }

  return found ? { area: totalArea, volume: totalVolume } : null;
}

// ── Main object builder ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bimObjectFromRaw(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? raw.applicationId ?? "");
  if (!id) return null;

  const speckleType = String(raw.speckle_type ?? raw.type ?? "");

  // Build flat property bag
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

  const category = categoryFromProperties(flat, speckleType);
  const level    = levelFromProperties(flat);
  const material = String(
    flat["material"] ?? flat["Material"] ??
    flat["MATERIAL_ASSET_PARAM"] ?? flat["STRUCTURAL_MATERIAL_PARAM"] ?? "Unknown"
  ).trim();
  const name = String(flat["name"] ?? flat["Name"] ?? flat["mark"] ?? flat["Mark"] ?? id.slice(0, 12));

  // ── Area & volume: try sources in priority order ─────────────────────────
  let volume = 0;
  let area   = 0;
  let source = "none";

  // 1. Speckle V3: materialQuantities
  const mq = raw.materialQuantities;
  if (mq && typeof mq === "object" && !Array.isArray(mq)) {
    const r = extractFromMaterialQuantities(mq);
    if (r) { area = r.area; volume = r.volume; source = "materialQuantities"; }
  }

  // 2. IFC quantity sets
  if (area === 0 && volume === 0) {
    const r = extractFromIfcQuantities(raw);
    if (r) { area = r.area; volume = r.volume; source = "ifcQuantities"; }
  }

  // 3. Legacy flat params (Revit / direct fields)
  if (area === 0 && volume === 0) {
    const v = Number(flat["volume"] ?? flat["Volume"] ?? flat["HOST_VOLUME_COMPUTED"] ??
                     flat["NetVolume"] ?? flat["GrossVolume"] ?? 0);
    const a = Number(flat["area"] ?? flat["Area"] ?? flat["HOST_AREA_COMPUTED"] ??
                     flat["NetArea"] ?? flat["GrossArea"] ?? flat["NetFloorArea"] ?? flat["GrossFloorArea"] ?? 0);
    volume = isNaN(v) ? 0 : v;
    area   = isNaN(a) ? 0 : a;
    if (volume > 0 || area > 0) source = "legacyParams";
  }

  if (isNaN(volume)) volume = 0;
  if (isNaN(area))   area   = 0;

  if (source !== "none" && (area > 0 || volume > 0)) {
    console.log(`[BIM][${source}] id=${id.slice(0, 8)} cat=${category} area=${area.toFixed(2)}m² vol=${volume.toFixed(2)}m³`);
  }

  return {
    id, speckleType, category, level,
    material: material || "Unknown",
    volume, area,
    family: flat["family"] ?? flat["Family"] ?? undefined,
    mark: name,
  };
}

// ── Viewer extraction orchestrator ────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractFromViewer(viewer: any, logFn: (msg: string) => void): Promise<BimObject[]> {
  const objects: BimObject[] = [];
  const seen = new Set<string>();

  // Attempt 1: getObjectProperties()
  if (typeof viewer.getObjectProperties === "function") {
    logFn("Trying getObjectProperties()...");
    try {
      const props = await viewer.getObjectProperties();
      console.log(`[BIM] getObjectProperties() → ${props?.length ?? 0} items`);

      if (props && props.length > 0) {
        for (let i = 0; i < Math.min(3, props.length); i++) {
          const p = props[i];
          console.log(`[BIM][getObjProps][${i}] id=${p.id} type=${p.type} keys:`, Object.keys(p.properties ?? {}).slice(0, 20).join(", "));
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
          logSummary(objects);
          return objects;
        }
      }
    } catch (e) {
      console.warn("[BIM] getObjectProperties() error:", e);
    }
  }

  // Attempt 2: WorldTree walk
  logFn("Trying WorldTree walk...");
  const worldTree = viewer.getWorldTree?.();
  if (!worldTree) {
    console.warn("[BIM] getWorldTree() returned null");
    return objects;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRaws: Record<string, any>[] = [];

  if (typeof worldTree.walk === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    worldTree.walk((node: any) => {
      const raw = node?.model?.raw ?? node?.raw ?? node?.data?.raw ?? node?.model ?? node;
      if (raw && (raw.id || raw.applicationId)) allRaws.push(raw);
      return true;
    });
  }

  if (allRaws.length === 0 && typeof worldTree.getAllObjects === "function") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const all: any[] = worldTree.getAllObjects() ?? [];
    for (const o of all) {
      const raw = o?.raw ?? o?.model?.raw ?? o;
      if (raw && (raw.id || raw.applicationId)) allRaws.push(raw);
    }
  }

  console.log(`[BIM] WorldTree raw objects: ${allRaws.length}`);

  // Debug: log first 3 raws in detail
  for (let i = 0; i < Math.min(3, allRaws.length); i++) {
    const r = allRaws[i];
    console.log(`\n[BIM][raw][${i}] id=${r.id} type=${r.speckle_type}`);
    console.log(`  keys:`, Object.keys(r).join(", "));
    console.log(`  materialQuantities:`, r.materialQuantities ? "PRESENT ✅" : "absent");
    console.log(`  quantities:`, r.quantities ? "PRESENT ✅" : "absent");
    console.log(`  hasQuantities:`, r.hasQuantities ? "PRESENT ✅" : "absent");
    if (r.materialQuantities && typeof r.materialQuantities === "object") {
      const firstKey = Object.keys(r.materialQuantities)[0];
      if (firstKey) console.log(`  mq["${firstKey}"]:`, JSON.stringify(r.materialQuantities[firstKey]).slice(0, 300));
    }
    console.log(`  FULL (2500 chars):`, JSON.stringify(r).slice(0, 2500));
  }

  // speckle_type distribution
  const typeDist: Record<string, number> = {};
  for (const r of allRaws) typeDist[String(r.speckle_type ?? r.type ?? "?")] = (typeDist[String(r.speckle_type ?? r.type ?? "?")] ?? 0) + 1;
  console.log("[BIM] speckle_type distribution:", JSON.stringify(typeDist, null, 2));

  // Build BIM objects
  for (const raw of allRaws) {
    const id = String(raw.id ?? raw.applicationId ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const obj = bimObjectFromRaw(raw);
    if (obj) objects.push(obj);
  }

  logSummary(objects);
  return objects;
}

function logSummary(objects: BimObject[]) {
  const catDist: Record<string, number> = {};
  for (const o of objects) catDist[o.category] = (catDist[o.category] ?? 0) + 1;
  console.log("[BIM] Category distribution:", JSON.stringify(catDist, null, 2));

  const totalArea   = objects.reduce((s, o) => s + o.area, 0);
  const totalVolume = objects.reduce((s, o) => s + o.volume, 0);
  const withArea    = objects.filter((o) => o.area > 0).length;
  const withVolume  = objects.filter((o) => o.volume > 0).length;
  console.log(`[BIM] TOTALS: area=${totalArea.toFixed(1)}m² (${withArea} elements), volume=${totalVolume.toFixed(1)}m³ (${withVolume} elements)`);
}

// ── Component ─────────────────────────────────────────────────────────────────
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
      if (SelectionExtension)  selectionExtRef.current  = viewer.createExtension(SelectionExtension);

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

      if (bimObjects.length === 0) throw new Error("0 elements extracted — check console");

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
