// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// Versione con debug panel visibile per diagnosticare il filtering
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { fetchBimObjects } from "@/lib/speckleExtractor";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";

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
  const [debugLines, setDebugLines] = useState<string[]>([]);

  const log = (msg: string) => {
    setDebugLines((prev) => [...prev.slice(-6), msg]);
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

  const initViewer = useCallback(async () => {
    if (!containerRef.current || isInitialized.current) return;
    isInitialized.current = true;
    setLoading(true);
    setLoadError(null);

    try {
      log("Importing @speckle/viewer...");
      const speckle = await import(/* @vite-ignore */ "@speckle/viewer");

      // Log delle chiavi disponibili nel modulo
      const keys = Object.keys(speckle).join(", ");
      log("Exports: " + keys.slice(0, 120));

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
        throw new Error("Viewer/DefaultViewerParams mancanti");
      }

      log("Creating viewer...");
      const params = { ...DefaultViewerParams, showStats: false, verbose: false };
      const viewer = new Viewer(containerRef.current, params);
      await viewer.init();
      viewerRef.current = viewer;
      log("Viewer init OK");

      viewer.createExtension(CameraController);

      if (FilteringExtension) {
        filteringExtRef.current = viewer.createExtension(FilteringExtension);
        // Log dei metodi disponibili sull'estensione
        const methods = Object.getOwnPropertyNames(
          Object.getPrototypeOf(filteringExtRef.current)
        ).join(", ");
        log("FilteringExt methods: " + methods.slice(0, 150));
      } else {
        log("FilteringExtension NOT FOUND in module");
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

      log("Loading model...");
      const urls = await UrlHelper.getResourceUrls(PROJECT_URL, EMBED_TOKEN);
      log(`URLs: ${urls.length}`);
      for (const url of urls) {
        const loader = new SpeckleLoader(viewer.getWorldTree(), url, EMBED_TOKEN);
        await viewer.loadObject(loader, true);
      }
      log("Model loaded OK");

      const objects = await fetchBimObjects();
      setBimObjects(objects);
      log(`BIM objects: ${objects.length}`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("ERROR: " + msg);
      setLoadError(msg);
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
      filteringExtRef.current = null;
      selectionExtRef.current = null;
      isInitialized.current = false;
    };
  }, [initViewer]);

  // Filtri dai grafici → isola oggetti nel 3D
  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) {
      if (filteredIds.length > 0) log("FILTER: no filteringExt ref!");
      return;
    }

    log(`FILTER: ${filteredIds.length} IDs, methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(filtering)).join(",")}`);

    try {
      if (filteredIds.length > 0) {
        // Prova i vari nomi di metodo possibili
        if (typeof filtering.isolateObjects === "function") {
          filtering.isolateObjects(filteredIds, "filters", true);
          log("Called isolateObjects OK");
        } else if (typeof filtering.setFilters === "function") {
          filtering.setFilters({ filterBy: { id: filteredIds } });
          log("Called setFilters OK");
        } else if (typeof filtering.filter === "function") {
          filtering.filter({ ids: filteredIds });
          log("Called filter OK");
        } else {
          log("No known filter method found!");
        }
      } else {
        if (typeof filtering.resetFilters === "function") {
          filtering.resetFilters();
          log("Called resetFilters OK");
        } else if (typeof filtering.reset === "function") {
          filtering.reset();
          log("Called reset OK");
        }
      }
    } catch (e) {
      log("Filter ERROR: " + String(e));
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

      {/* DEBUG PANEL - visibile in basso a sinistra */}
      {debugLines.length > 0 && (
        <div className="absolute bottom-8 left-2 right-2 z-20 bg-black/80 rounded p-2 max-h-40 overflow-y-auto">
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
