// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// Fix: isolateObjects con false = nascondi resto (non xray)
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

const CONTAINER_TYPES = new Set([
  "objects.other.collection","base","objects.geometry.mesh",
  "objects.geometry.brep","objects.geometry.curve","objects.geometry.line",
  "objects.geometry.point","objects.geometry.polyline","objects.geometry.polycurve",
]);

function categoryFromType(t: string): string {
  const s = t.toLowerCase();
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
function extractBimObjects(worldTree: any): BimObject[] {
  const objects: BimObject[] = [];
  const seen = new Set<string>();
  try {
    worldTree.walk((node: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (node as any)?.model?.raw;
      if (!raw?.id || !raw?.speckle_type) return true;
      const id = String(raw.id);
      if (seen.has(id)) return true;
      const speckleType = String(raw.speckle_type);
      const typeLower = speckleType.toLowerCase();
      if (CONTAINER_TYPES.has(typeLower)) return true;
      if (!typeLower.includes("objects.builtelements") && !typeLower.includes("objects.revit") && !typeLower.includes("ifc")) return true;
      seen.add(id);
      const levelRaw = raw.level;
      const levelName = typeof levelRaw === "object" && levelRaw !== null ? (levelRaw as Record<string,unknown>).name : levelRaw;
      const params = raw.parameters as Record<string, Record<string, unknown>> | undefined;
      const matParam = params?.["MATERIAL_ASSET_PARAM"]?.value ?? params?.["ALL_MODEL_MATERIAL_NAME"]?.value;
      const matsRaw = raw.materials as Array<Record<string, unknown>> | undefined;
      const material = String(matParam || (matsRaw?.[0]?.name) || raw.material || "Unknown").trim();
      const volume = Number(params?.["HOST_VOLUME_COMPUTED"]?.value ?? raw.volume ?? 0);
      const area = Number(params?.["HOST_AREA_COMPUTED"]?.value ?? raw.area ?? 0);
      objects.push({
        id, speckleType,
        category: categoryFromType(speckleType),
        level: String(levelName || "Unknown").trim() || "Unknown",
        material: material || "Unknown",
        volume: isNaN(volume) ? 0 : volume,
        area: isNaN(area) ? 0 : area,
        family: raw.family as string | undefined,
        mark: (raw.mark ?? raw["Mark"]) as string | undefined,
      });
      return true;
    });
  } catch (e) { console.warn("Tree walk error:", e); }
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
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const log = (msg: string) => setDebugLines((prev) => [...prev.slice(-4), msg]);

  const { setSelectedIds, setLoading, setLoadError, setBimObjects, isLoading, loadError, filteredIds, selectedIds, lastSelectionSource } = useBimStore();

  const initViewer = useCallback(async () => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;
    setLoading(true);
    setLoadError(null);
    try {
      const speckle = await import(/* @vite-ignore */ "@speckle/viewer");
      const { Viewer, DefaultViewerParams, ViewerEvent, SpeckleLoader, UrlHelper, CameraController, SelectionExtension, FilteringExtension } = speckle;
      if (!Viewer) throw new Error("@speckle/viewer non caricato");
      const viewer = new Viewer(containerRef.current, { ...DefaultViewerParams, showStats: false, verbose: false });
      await viewer.init();
      viewerRef.current = viewer;
      viewer.createExtension(CameraController);
      if (FilteringExtension) filteringExtRef.current = viewer.createExtension(FilteringExtension);
      if (SelectionExtension) selectionExtRef.current = viewer.createExtension(SelectionExtension);
      if (ViewerEvent) {
        viewer.on(ViewerEvent.ObjectClicked, (event: unknown) => {
          const e = event as { hits?: Array<{ node?: { model?: { raw?: { id?: string } } } }> };
          const ids = (e?.hits ?? []).map((h) => h?.node?.model?.raw?.id).filter((id): id is string => Boolean(id));
          setSelectedIds(ids, "viewer");
        });
      }
      log("Loading model...");
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }
      const bimObjects = extractBimObjects(viewer.getWorldTree());
      const cats = bimObjects.reduce((acc: Record<string,number>, o) => { acc[o.category] = (acc[o.category]||0)+1; return acc; }, {});
      log(Object.entries(cats).map(([k,v]) => `${k}:${v}`).join(" "));
      if (bimObjects.length > 5) {
        setBimObjects(bimObjects);
      } else {
        const { generateMockData } = await import("@/lib/speckleExtractor");
        setBimObjects(generateMockData());
        log("Using mock data");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR: " + msg);
      setLoadError(msg);
      try { const { generateMockData } = await import("@/lib/speckleExtractor"); setBimObjects(generateMockData()); } catch { /* ignore */ }
    } finally { setLoading(false); }
  }, [setSelectedIds, setLoading, setLoadError, setBimObjects]);

  useEffect(() => {
    initViewer();
    return () => {
      if (viewerRef.current?.dispose) viewerRef.current.dispose();
      viewerRef.current = null; filteringExtRef.current = null; selectionExtRef.current = null; isInitialized.current = false;
    };
  }, [initViewer]);

  // Filtri → isolamento nel 3D (false = nascondi il resto, non xray)
  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) return;
    try {
      filtering.resetFilters();
      if (filteredIds.length > 0) {
        filtering.isolateObjects(filteredIds, "filters", false);
        log(`Isolated: ${filteredIds.length}`);
      } else {
        log("Reset");
      }
    } catch (e) { log("Filter err: " + String(e)); }
  }, [filteredIds]);

  useEffect(() => {
    const selection = selectionExtRef.current;
    if (!selection || lastSelectionSource !== "chart") return;
    try { selection.selectObjects([...selectedIds]); } catch { /* ignore */ }
  }, [selectedIds, lastSelectionSource]);

  const handleReset = () => {
    try { filteringExtRef.current?.resetFilters?.(); selectionExtRef.current?.clearSelection?.(); } catch { /* ignore */ }
    useBimStore.getState().clearFilters();
    useBimStore.getState().clearSelection();
  };

  return (
    <div className="relative w-full h-full bg-[#1a1f2e] rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-3" />
          <p className="text-sm text-blue-200 font-medium">Caricamento modello BIM…</p>
          <p className="text-xs text-blue-300/60 mt-1">Connessione a Speckle in corso</p>
        </div>
      )}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/95 z-10 p-6">
          <AlertCircle className="h-8 w-8 text-amber-400 mb-3" />
          <p className="text-sm text-amber-200 font-medium text-center mb-1">Viewer non disponibile</p>
          <p className="text-xs text-slate-500 text-center font-mono bg-slate-800 px-3 py-2 rounded max-w-xs break-all">{loadError}</p>
        </div>
      )}
      <div className="absolute top-3 right-3 z-10">
        <button onClick={handleReset} className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      {debugLines.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-20 bg-black/80 rounded p-2">
          {debugLines.map((line, i) => <p key={i} className="text-[10px] font-mono text-green-300 leading-tight">{line}</p>)}
        </div>
      )}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">BIM 3D · Speckle</span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
