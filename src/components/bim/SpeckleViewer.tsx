// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// Usa l'API corretta di @speckle/viewer 2.x
// Fix bundler: carica via import() con keepNames esbuild config
// ============================================================

import { useEffect, useRef, useCallback } from "react";
import { useBimStore } from "@/store/bimStore";
import { fetchBimObjects } from "@/lib/speckleExtractor";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
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
      // Import con /* @vite-ignore */ per evitare pre-bundling
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

      if (!Viewer || !DefaultViewerParams) {
        throw new Error("@speckle/viewer non caricato correttamente");
      }

      // Crea viewer
      const params = { ...DefaultViewerParams, showStats: false, verbose: false };
      const viewer = new Viewer(containerRef.current, params);
      await viewer.init();
      viewerRef.current = viewer;

      // Registra le estensioni necessarie
      viewer.createExtension(CameraController);

      if (SelectionExtension) {
        const selection = viewer.createExtension(SelectionExtension);

        // Handler selezione oggetti → aggiorna store
        viewer.on(ViewerEvent.ObjectClicked, (event: unknown) => {
          const e = event as { hits?: Array<{ node?: { model?: { raw?: { id?: string } } } }> };
          const ids = (e?.hits ?? [])
            .map((h) => h?.node?.model?.raw?.id)
            .filter((id): id is string => Boolean(id));
          setSelectedIds(ids, "viewer");
        });

        void selection; // evita warning unused
      }

      if (FilteringExtension) {
        viewer.createExtension(FilteringExtension);
      }

      // Carica il modello usando UrlHelper + SpeckleLoader (API 2.x corretta)
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }

      // Carica dati BIM per i grafici
      const objects = await fetchBimObjects();
      setBimObjects(objects);

    } catch (err) {
      console.error("Speckle viewer init failed:", err);
      setLoadError(
        err instanceof Error ? err.message : "Impossibile caricare il viewer 3D."
      );
      try {
        const objects = await fetchBimObjects();
        setBimObjects(objects);
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
      isInitialized.current = false;
    };
  }, [initViewer]);

  // Filtri dai grafici → isola oggetti nel 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    try {
      if (filteredIds.length > 0) {
        viewer.getExtension?.("FilteringExtension")?.isolateObjects?.(filteredIds);
      } else {
        viewer.getExtension?.("FilteringExtension")?.resetFilters?.();
      }
    } catch { /* ignore */ }
  }, [filteredIds]);

  // Selezione dai grafici → highlight nel 3D
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || lastSelectionSource !== "chart") return;
    try {
      viewer.getExtension?.("SelectionExtension")?.selectObjects?.([...selectedIds]);
    } catch { /* ignore */ }
  }, [selectedIds, lastSelectionSource]);

  const handleReset = () => {
    try {
      viewerRef.current?.getExtension?.("CameraController")?.setCameraView("default");
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
          <p className="text-xs text-slate-400 text-center mb-4">I grafici mostrano i dati BIM del modello</p>
          <p className="text-xs text-slate-500 text-center font-mono bg-slate-800 px-3 py-2 rounded max-w-xs break-all">
            {loadError}
          </p>
        </div>
      )}

      {!isLoading && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleReset}
            title="Reset filtri e camera"
            className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-black/60 transition-all"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
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
