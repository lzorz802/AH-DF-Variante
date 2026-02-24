// ============================================================
// FILE: src/components/bim/SpeckleViewer.tsx
// ============================================================
// STRATEGIA CORRETTA:
// Il viewer carica il modello → worldTree è già popolato.
// Leggiamo i dati BIM direttamente dal WorldTree DOPO il load,
// usando getAllObjects() che è l'API pubblica stabile di v2.
// ============================================================

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Tipi container da ignorare ───────────────────────────────
const SKIP_PREFIX = [
  "objects.geometry.",
  "objects.other.rendermaterial",
  "objects.other.displaystyle",
  "objects.other.collection",
  "objects.primitive.",
];
const SKIP_EXACT = new Set(["base", "reference"]);

function shouldSkip(t: string): boolean {
  const tl = t.toLowerCase();
  return SKIP_EXACT.has(tl) || SKIP_PREFIX.some((p) => tl.startsWith(p));
}

function categoryFromType(speckleType: string): string {
  const s = speckleType.toLowerCase();
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

// ── Estrae BimObject dal raw Speckle object ──────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromRaw(raw: Record<string, any>): BimObject | null {
  const id = String(raw.id ?? "");
  const speckleType = String(raw.speckle_type ?? "");
  if (!id || !speckleType || shouldSkip(speckleType)) return null;

  const lvl = raw.level;
  const levelName =
    lvl && typeof lvl === "object"
      ? String(lvl.name ?? lvl.elevation ?? "Unknown")
      : String(lvl ?? "Unknown");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = raw.parameters as Record<string, any> | undefined;
  const pv = (key: string) => params?.[key]?.value;

  const material = String(
    pv("MATERIAL_ASSET_PARAM") ??
    pv("ALL_MODEL_MATERIAL_NAME") ??
    pv("STRUCTURAL_MATERIAL_PARAM") ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (raw.materials as any[])?.[0]?.name ??
    raw.material ??
    "Unknown"
  ).trim();

  const volume = Number(pv("HOST_VOLUME_COMPUTED") ?? pv("VOLUME") ?? raw.volume ?? 0);
  const area = Number(pv("HOST_AREA_COMPUTED") ?? pv("AREA") ?? raw.area ?? 0);

  return {
    id,
    speckleType,
    category: categoryFromType(speckleType),
    level: levelName.trim() || "Unknown",
    material: material || "Unknown",
    volume: isNaN(volume) ? 0 : volume,
    area: isNaN(area) ? 0 : area,
    family: raw.family as string | undefined,
    mark: (raw.mark ?? raw["Mark"]) as string | undefined,
  };
}

// ── Estrae oggetti BIM dal WorldTree con tutti i metodi noti ─
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractFromWorldTree(worldTree: any): BimObject[] {
  const objects: BimObject[] = [];
  const seen = new Set<string>();
  const allTypes = new Set<string>();

  // METODO A: getAllObjects() — API pubblica di WorldTree v2
  try {
    if (typeof worldTree.getAllObjects === "function") {
      const allObjs = worldTree.getAllObjects();
      console.log(`[WorldTree] getAllObjects() returned ${allObjs?.length ?? 0} items`);
      for (const obj of (allObjs ?? [])) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw = (obj as any)?.raw ?? obj;
        const t = raw?.speckle_type as string | undefined;
        if (t) allTypes.add(t);
        const bimObj = extractFromRaw(raw ?? {});
        if (bimObj && !seen.has(bimObj.id)) {
          seen.add(bimObj.id);
          objects.push(bimObj);
        }
      }
      if (objects.length > 0) {
        console.log(`[WorldTree] getAllObjects() → ${objects.length} BIM elements`);
        return objects;
      }
    }
  } catch (e) { console.warn("[WorldTree] getAllObjects failed:", e); }

  // METODO B: walk() con callback che riceve TreeNode
  // In v2.x la firma è walk(callback) dove callback riceve il nodo
  // e il nodo ha struttura { model: { raw, children, atomic, id } }
  try {
    if (typeof worldTree.walk === "function") {
      // Prova prima la firma con nodo root esplicito
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const walk = (node: any) => {
        // Prova tutte le strutture possibili
        const raw =
          node?.model?.raw ??   // v2 standard
          node?.raw ??           // v2 alternativa
          node?.data?.raw ??     // v2 altro
          (node?.model?.id ? node.model : null); // fallback

        if (raw) {
          const t = raw?.speckle_type as string | undefined;
          if (t) allTypes.add(t);
          const bimObj = extractFromRaw(raw);
          if (bimObj && !seen.has(bimObj.id)) {
            seen.add(bimObj.id);
            objects.push(bimObj);
          }
        }
        return true; // continua il walk
      };

      worldTree.walk(walk);
      console.log(`[WorldTree] walk() → ${objects.length} objects, types: ${[...allTypes].join(", ")}`);
      if (objects.length > 0) return objects;
    }
  } catch (e) { console.warn("[WorldTree] walk() failed:", e); }

  // METODO C: accesso diretto all'internal _root o root
  try {
    const root = worldTree._root ?? worldTree.root ?? worldTree._tree;
    if (root) {
      console.log("[WorldTree] Trying internal root traversal");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const traverse = (node: any, depth = 0) => {
        if (depth > 50) return; // safety
        const raw = node?.model?.raw ?? node?.raw ?? node?.data;
        if (raw) {
          const t = raw?.speckle_type as string | undefined;
          if (t) allTypes.add(t);
          const bimObj = extractFromRaw(raw);
          if (bimObj && !seen.has(bimObj.id)) {
            seen.add(bimObj.id);
            objects.push(bimObj);
          }
        }
        const children = node?.model?.children ?? node?.children ?? [];
        for (const child of (Array.isArray(children) ? children : [])) {
          traverse(child, depth + 1);
        }
      };
      traverse(root);
      console.log(`[WorldTree] internal traversal → ${objects.length} objects`);
    }
  } catch (e) { console.warn("[WorldTree] internal traversal failed:", e); }

  console.log("[WorldTree] All types found:", [...allTypes]);
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

      // ── Estrai BIM data dal WorldTree (già caricato) ─────────
      log("Extracting BIM metadata from WorldTree...");
      const worldTree = viewer.getWorldTree();

      // Debug: mostra tutte le proprietà disponibili sul worldTree
      console.log("[WorldTree] Available methods:", Object.getOwnPropertyNames(
        Object.getPrototypeOf(worldTree)
      ).filter(n => !n.startsWith("_")));

      const bimObjects = extractFromWorldTree(worldTree);
      log(`Extracted ${bimObjects.length} elements`);

      if (bimObjects.length === 0) {
        // Ultimo tentativo: usa fetchBimObjects() come fallback HTTP
        log("WorldTree empty, trying REST API fallback...");
        const { fetchBimObjects } = await import("@/lib/speckleExtractor");
        const apiObjects = await fetchBimObjects();
        setBimObjects(apiObjects);
        log(`REST API: ${apiObjects.length} elements`);
      } else {
        setBimObjects(bimObjects);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SpeckleViewer] Error:", msg);
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

  // Filtri → isolamento nel 3D
  useEffect(() => {
    const filtering = filteringExtRef.current;
    if (!filtering) return;
    try {
      filtering.resetFilters();
      if (filteredIds.length > 0) {
        filtering.isolateObjects(filteredIds, "filters", false);
      }
    } catch (e) { console.warn("[SpeckleViewer] Filter error:", e); }
  }, [filteredIds]);

  // Selezione chart → viewer
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
          <p className="text-xs text-slate-400 text-center font-mono bg-slate-800/80 px-3 py-2 rounded max-w-sm break-all">
            {loadError}
          </p>
          <button
            onClick={() => { isInitialized.current = false; setLoadError(null); setLoading(true); initViewer(); }}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10">
        <button onClick={handleReset}
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white transition-all">
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
