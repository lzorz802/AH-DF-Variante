// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// Fix: estrae IDs reali dall'albero del viewer per il filtering
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Mappatura categoria da speckle_type ──────────────────────
function categoryFromType(speckleType: string): string {
  const t = speckleType.toLowerCase();
  if (t.includes("wall")) return "Wall";
  if (t.includes("floor") || t.includes("slab")) return "Floor";
  if (t.includes("column")) return "Column";
  if (t.includes("beam")) return "Beam";
  if (t.includes("roof")) return "Roof";
  if (t.includes("window")) return "Window";
  if (t.includes("door")) return "Door";
  if (t.includes("stair")) return "Stair";
  if (t.includes("ceiling")) return "Ceiling";
  if (t.includes("furniture")) return "Furniture";
  return "Other";
}

// ── Estrae BimObjects dall'albero del viewer ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBimObjectsFromTree(worldTree: any): BimObject[] {
  const objects: BimObject[] = [];

  try {
    // Itera su tutti i nodi dell'albero
    worldTree.walk((node: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = (node as any)?.model?.raw;
      if (!raw || !raw.id || !raw.speckle_type) return true; // continua il walk

      const speckleType = String(raw.speckle_type);
      // Salta oggetti contenitore (commit, collection, ecc.)
      if (
        speckleType.includes("Collection") ||
        speckleType.includes("commit") ||
        speckleType === "Base"
      ) return true;

      // Livello
      const levelRaw = raw.level;
      const level =
        (typeof levelRaw === "object" && levelRaw !== null
          ? (levelRaw as Record<string, unknown>).name
          : levelRaw) as string | undefined;

      // Materiale
      const matsRaw = raw.materials as unknown[] | undefined;
      const material =
        ((matsRaw?.[0] as Record<string, unknown>)?.name as string) ||
        "Unknown";

      // Parametri Revit
      const params = raw.parameters as Record<string, unknown> | undefined;

      const volume =
        (params?.["HOST_VOLUME_COMPUTED"] as number) ||
        (raw.volume as number) ||
        0;
      const area =
        (params?.["HOST_AREA_COMPUTED"] as number) ||
        (raw.area as number) ||
        0;

      objects.push({
        id: String(raw.id),
        speckleType,
        category: categoryFromType(speckleType),
        level: String(level || "Unknown").trim(),
        material: String(material).trim(),
        volume: Number(volume) || 0,
        area: Number(area) || 0,
        family: raw.family as string | undefined,
        mark: raw.mark as string | undefined,
      });

      return true; // continua il walk
    });
  } catch (e) {
    console.warn("Tree walk error:", e);
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
  const [debugLines, setDebugLines] = useState<string[]>([]);

  const log = (msg: string) =>
    setDebugLines((prev) => [...prev.slice(-5), msg]);

  const {
    setSelectedIds,
    setLoading,
    setLoadError,
    setBimObjects,
    isLoading,
    loadError,
    filteredIds,
    selectedIds,
    lastSelectionSource,
  } = useBimStore();

  const initViewer = useCallback(async () => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;
    setLoading(true);
    setLoadError(null);

    try {
      const speckle = await import(/* @vite-ignore */ "@speckle/viewer");
      const {
        Viewer,
        DefaultViewerParams,
        ViewerEvent,
        SpeckleLoader,
        UrlHelper,
        CameraController,
        SelectionExtension,
        FilteringExtension,
      } = speckle;

      if (!Viewer || !DefaultViewerParams) throw new Error("@speckle/viewer non caricato");

      const params = { ...DefaultViewerParams, showStats: false, verbose: false };
      const viewer = new Viewer(containerRef.current, params);
      await viewer.init();
      viewerRef.current = viewer;

      viewer.createExtension(CameraController);

      if (FilteringExtension) {
        filteringExtRef.current = viewer.createExtension(FilteringExtension);
      }
      if (SelectionExtension) {
        selectionExtRef.current = viewer.createExtension(SelectionExtension);
      }

      if (ViewerEvent) {
        viewer.on(ViewerEvent.ObjectClicked, (event: unknown) => {
          const e = event as { hits?: Array<{ node?: { model?: { raw?: { id?: string } } } }> };
          const ids = (e?.hits ?? [])
            .map((h) => h?.node?.model?.raw?.id)
            .filter((id): id is string => Boolean(id));
          setSelectedIds(ids, "viewer");
        });
      }

      // Carica il modello
      log("Loading model...");
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }
      log("Model loaded. Extracting objects...");

      // ── CHIAVE: estrai BimObjects dall'albero reale del viewer ──
      const worldTree = viewer.getWorldTree();
      const bimObjects = extractBimObjectsFromTree(worldTree);
      log(`Extracted ${bimObjects.length} objects from tree`);

      if (bimObjects.length > 0) {
        setBimObjects(bimObjects);
        log(`Sample ID: ${bimObjects[0].id} cat: ${bimObjects[0].category}`);
      } else {
        // Fallback ai dati mock se l'estrazione fallisce
        const { generateMockData } = await import("@/lib/speckleExtractor");
        setBimObjects(generateMockData());
        log("Fallback to mock data");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR: " + msg);
      setLoadError(msg);
      try {
        const { generateMockData } = await import("@/lib/speckleExtractor");
        setBimObjects(generateMockData());
      } catch { /* ignore */ }
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

  // Filtri dai grafici → isola oggetti nel 3D
  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) return;
    try {
      if (filteredIds.length > 0) {
        filtering.isolateObjects(filteredIds, "filters", true);
        log(`Isolated ${filteredIds.length} objects`);
      } else {
        filtering.resetFilters();
        log("Reset filters");
      }
    } catch (e) {
      log("Filter err: " + String(e));
    }
  }, [filteredIds]);

  // Selezione dai grafici → highlight nel 3D
  useEffect(() => {
    const selection = selectionExtRef.current;
    if (!selection || lastSelectionSource !== "chart") return;
    try {
      selection.selectObjects([...selectedIds]);
    } catch { /* ignore */ }
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
          <p className="text-sm text-blue-200 font-medium">Caricamento modello BIM…</p>
          <p className="text-xs text-blue-300/60 mt-1">Connessione a Speckle in corso</p>
        </div>
      )}

      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/95 z-10 p-6">
          <AlertCircle className="h-8 w-8 text-amber-400 mb-3" />
          <p className="text-sm text-amber-200 font-medium text-center mb-1">Viewer non disponibile</p>
          <p className="text-xs text-slate-500 text-center font-mono bg-slate-800 px-3 py-2 rounded max-w-xs break-all">
            {loadError}
          </p>
        </div>
      )}

      {!isLoading && (
        <div className="absolute top-3 right-3 z-10">
          <button onClick={handleReset} className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Debug panel */}
      {debugLines.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-20 bg-black/80 rounded p-2">
          {debugLines.map((line, i) => (
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
