// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// ============================================================
// STRATEGIA:
// 1. Il viewer 3D carica il modello da Speckle normalmente (iframe-like).
// 2. I dati BIM (categorie, livelli, ecc.) vengono caricati in PARALLELO
//    tramite la REST API di Speckle (fetchBimObjects) — SOLO dati reali.
// 3. NON si usa worldTree.walk() per estrarre metadati (fragile).
// 4. NON si usa mock data in nessun caso.
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, AlertCircle, RotateCcw, WifiOff } from "lucide-react";
import { fetchBimObjects } from "@/lib/speckleExtractor";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

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
    setStatusLines((prev) => [...prev.slice(-3), msg]);
  };

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

  // ── Carica dati BIM reali via REST API ──────────────────────
  const loadBimData = useCallback(async () => {
    log("Fetching BIM metadata from Speckle API...");
    try {
      const objects = await fetchBimObjects();
      setBimObjects(objects);
      log(`Loaded ${objects.length} BIM elements`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SpeckleViewer] BIM data fetch failed:", msg);
      setLoadError(msg);
      log(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [setBimObjects, setLoadError, setLoading]);

  // ── Inizializza il viewer 3D ─────────────────────────────────
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

      if (!Viewer) throw new Error("@speckle/viewer not loaded");

      const viewer = new Viewer(containerRef.current, {
        ...DefaultViewerParams,
        showStats: false,
        verbose: false,
      });
      await viewer.init();
      viewerRef.current = viewer;

      viewer.createExtension(CameraController);
      if (FilteringExtension) filteringExtRef.current = viewer.createExtension(FilteringExtension);
      if (SelectionExtension) selectionExtRef.current = viewer.createExtension(SelectionExtension);

      // Selezione click nel viewer 3D
      if (ViewerEvent) {
        viewer.on(
          ViewerEvent.ObjectClicked,
          (event: unknown) => {
            const e = event as {
              hits?: Array<{ node?: { model?: { raw?: { id?: string } } } }>;
            };
            const ids = (e?.hits ?? [])
              .map((h) => h?.node?.model?.raw?.id)
              .filter((id): id is string => Boolean(id));
            setSelectedIds(ids, "viewer");
          }
        );
      }

      log("Loading 3D model...");
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }
      log("3D model loaded");

      // Carica i metadati BIM in parallelo (REST API, indipendente dal viewer)
      await loadBimData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SpeckleViewer] Viewer init failed:", msg);
      log(`Viewer error: ${msg}`);
      setLoadError(msg);
      setLoading(false);
    }
  }, [setSelectedIds, setLoading, setLoadError, loadBimData]);

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

  // ── Applica filtri al viewer 3D ──────────────────────────────
  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) return;
    try {
      filtering.resetFilters();
      if (filteredIds.length > 0) {
        filtering.isolateObjects(filteredIds, "filters", false);
      }
    } catch (e) {
      console.warn("[SpeckleViewer] Filter error:", e);
    }
  }, [filteredIds]);

  // ── Sincronizza selezione chart → viewer ─────────────────────
  useEffect(() => {
    const selection = selectionExtRef.current;
    if (!selection || lastSelectionSource !== "chart") return;
    try {
      selection.selectObjects([...selectedIds]);
    } catch {
      /* ignore */
    }
  }, [selectedIds, lastSelectionSource]);

  const handleReset = () => {
    try {
      filteringExtRef.current?.resetFilters?.();
      selectionExtRef.current?.clearSelection?.();
    } catch {
      /* ignore */
    }
    useBimStore.getState().clearFilters();
    useBimStore.getState().clearSelection();
  };

  return (
    <div className="relative w-full h-full bg-[#1a1f2e] rounded-xl overflow-hidden">
      {/* Canvas viewer 3D */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-3" />
          <p className="text-sm text-blue-200 font-medium">Loading BIM model…</p>
          <p className="text-xs text-blue-300/60 mt-1">Connecting to Speckle</p>
        </div>
      )}

      {/* Error overlay — mostrato solo se loadError E non sta caricando */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/95 z-10 p-6">
          <WifiOff className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-red-300 font-medium text-center mb-2">
            Failed to load BIM data
          </p>
          <p className="text-xs text-slate-500 text-center font-mono bg-slate-800/80 px-3 py-2 rounded max-w-sm break-all">
            {loadError}
          </p>
          <button
            onClick={() => {
              setLoadError(null);
              setLoading(true);
              isInitialized.current = false;
              loadBimData();
            }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            Retry
          </button>
          <p className="text-[10px] text-slate-600 mt-3 text-center max-w-xs">
            Check that the Speckle token is valid and the project is accessible.
          </p>
        </div>
      )}

      {/* Reset button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all"
          title="Reset filters and selection"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Status log (dev) */}
      {statusLines.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-20 bg-black/70 rounded p-2 pointer-events-none">
          {statusLines.map((line, i) => (
            <p key={i} className="text-[10px] font-mono text-green-300 leading-tight">
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Badge */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          BIM 3D · Speckle
        </span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
