// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// Fix: @speckle/viewer escluso dalla minificazione Vite
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useBimStore } from "@/store/bimStore";
import { fetchBimObjects } from "@/lib/speckleExtractor";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

const STREAM_URL = "https://app.speckle.systems/streams/a0102047d4";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

export const SpeckleViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewerRef = useRef<any>(null);
  const isInitialized = useRef(false);

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
      // Import diretto senza destructuring per evitare tree-shaking aggressivo
      const SpeckleModule = await import("@speckle/viewer");

      const Viewer = SpeckleModule.Viewer;
      const DefaultViewerParams = SpeckleModule.DefaultViewerParams;
      const ViewerEvent = SpeckleModule.ViewerEvent;

      if (!Viewer || !DefaultViewerParams) {
        throw new Error("@speckle/viewer non caricato correttamente.");
      }

      const params = {
        ...DefaultViewerParams,
        showStats: false,
        verbose: false,
      };

      const viewer = new Viewer(containerRef.current, params);
      await viewer.init();
      viewerRef.current = viewer;

      // Handler selezione oggetti nel viewer → aggiorna store
      const onSelect = (event: unknown) => {
        const e = event as { objects?: Array<{ id: string }> };
        const ids = (e?.objects ?? []).map((o) => o.id).filter(Boolean);
        setSelectedIds(ids, "viewer");
      };

      if (ViewerEvent) {
        const eventName =
          ViewerEvent.ObjectClicked ??
          (ViewerEvent as Record<string, string>)["ObjectClicked"] ??
          "select";
        viewer.on(eventName, onSelect);
      }

      // Carica il modello (ultimo commit)
      await viewer.loadObject(
        `${STREAM_URL}/objects/`,
        EMBED_TOKEN
      );

      // Carica dati BIM per i grafici
      const objects = await fetchBimObjects();
      setBimObjects(objects);

    } catch (err) {
      console.error("Speckle viewer init failed:", err);
      setLoadError(
        err instanceof Error ? err.message : "Impossibile caricare il viewer 3D."
      );
      // Carica comunque i dati per i grafici
      try {
        const objects = await fetchBimObjects();
        setBimObjects(objects);
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, [setSelectedIds, setLoading, setLoadError, setBimObjects]);

  useEffect(() => {
    initViewer();
    return () => {
      if (viewerRef.current?.dispose) {
        viewerRef.current.dispose();
      }
      viewerRef.current = null;
      isInitialized.current = false;
    };
  }, [initViewer]);

  // Filtri dai grafici → isola oggetti nel 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (filteredIds.length > 0) {
      viewer.isolateObjects?.(filteredIds, { ghost: true });
    } else {
      viewer.unIsolateObjects?.();
    }
  }, [filteredIds]);

  // Selezione dai grafici → highlight nel 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || lastSelectionSource !== "chart") return;
    viewer.highlightObjects?.([...selectedIds]);
  }, [selectedIds, lastSelectionSource]);

  const handleReset = () => {
    viewerRef.current?.World?.resetFocus?.();
    useBimStore.getState().clearFilters();
    useBimStore.getState().clearSelection();
  };

  return (
    <div className="relative w-full h-full bg-[#1a1f2e] rounded-xl overflow-hidden">
      {/* Canvas del viewer */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/90 z-10">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mb-3" />
          <p className="text-sm text-blue-200 font-medium">Caricamento modello BIM…</p>
          <p className="text-xs text-blue-300/60 mt-1">Connessione a Speckle in corso</p>
        </div>
      )}

      {/* Error overlay */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1f2e]/95 z-10 p-6">
          <AlertCircle className="h-8 w-8 text-amber-400 mb-3" />
          <p className="text-sm text-amber-200 font-medium text-center mb-1">
            Viewer non disponibile
          </p>
          <p className="text-xs text-slate-400 text-center mb-4">
            I grafici mostrano i dati BIM del modello
          </p>
          <p className="text-xs text-slate-500 text-center font-mono bg-slate-800 px-3 py-2 rounded">
            {loadError}
          </p>
        </div>
      )}

      {/* Toolbar */}
      {!isLoading && (
        <div className="absolute top-3 right-3 z-10 flex gap-2">
          <button
            onClick={handleReset}
            title="Reset filtri e camera"
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10
                       text-white/70 hover:text-white hover:bg-black/60 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Label */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          BIM 3D · Speckle
        </span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
