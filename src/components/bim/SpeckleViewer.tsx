// FILE: src/components/bim/SpeckleViewer.tsx
// MODIFICATO: usa viewer.getObjectProperties() per leggere le
// proprietà reali (category, level, ecc.) invece di inferirle
// dal speckle_type — risolve il problema degli istogrammi vuoti.

import { useEffect, useRef, useCallback, useState } from "react";
import { useBimStore } from "@/store/bimStore";
import { Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { BimObject } from "@/store/bimStore";

const PROJECT_URL = "https://app.speckle.systems/projects/a0102047d4/models/all";
const EMBED_TOKEN = "0c70148e6c17a7848184ee9a7947313e5359b3bf70";

// ── Normalizza la categoria leggendo le proprietà reali ───────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function categoryFromProperties(props: Record<string, any>): string {
  const raw =
    props["category"] ??
    props["Category"] ??
    props["ifcType"] ??
    props["IfcType"] ??
    props["type"] ??
    props["Type"] ??
    "";
  if (raw && typeof raw === "string" && raw.trim()) {
    const c = raw.trim();
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
    const lower = c.toLowerCase();
    if (lower.includes("wall")) return "Wall";
    if (lower.includes("floor") || lower.includes("slab")) return "Floor";
    if (lower.includes("column")) return "Column";
    if (lower.includes("beam") || lower.includes("framing")) return "Beam";
    if (lower.includes("roof")) return "Roof";
    if (lower.includes("window")) return "Window";
    if (lower.includes("door")) return "Door";
    if (lower.includes("stair")) return "Stair";
    if (lower.includes("ceiling")) return "Ceiling";
    if (lower.includes("furniture")) return "Furniture";
    if (lower.includes("railing")) return "Railing";
    if (lower.includes("pipe") || lower.includes("duct")) return "MEP";
    if (lower.includes("site") || lower.includes("topograph") || lower.includes("terrain")) return "Site";
    if (lower.includes("room") || lower.includes("space")) return "Room";
    return c.charAt(0).toUpperCase() + c.slice(1);
  }
  return "Other";
}

// ── Estrae livello dalle proprietà reali ──────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function levelFromProperties(props: Record<string, any>): string {
  const candidates = [
    props["Level"],
    props["level"],
    props["Livello"],
    props["Floor"],
    props["Storey"],
    props["BuildingStorey"],
    props["IfcBuildingStorey"],
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

// ── Costruisce BimObject da una PropertyInfo di getObjectProperties() ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function bimObjectFromPropertyInfo(info: any): BimObject | null {
  const id = String(info.id ?? "");
  if (!id) return null;

  // Appiattisce le proprietà: Speckle può wrappare i valori in { value: ... }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawProps: Record<string, any> = {};
  if (info.properties && typeof info.properties === "object") {
    for (const [k, v] of Object.entries(info.properties)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawProps[k] = (v as any)?.value !== undefined ? (v as any).value : v;
    }
  }

  const speckleType = String(rawProps["speckle_type"] ?? rawProps["type"] ?? info.type ?? "");
  const name = String(
    rawProps["name"] ?? rawProps["Name"] ??
    rawProps["mark"] ?? rawProps["Mark"] ??
    id.slice(0, 12)
  );
  const category = categoryFromProperties(rawProps);
  const level = levelFromProperties(rawProps);
  const material = String(
    rawProps["material"] ?? rawProps["Material"] ??
    rawProps["MATERIAL_ASSET_PARAM"] ?? rawProps["STRUCTURAL_MATERIAL_PARAM"] ??
    "Unknown"
  ).trim();
  const volume = Number(rawProps["volume"] ?? rawProps["Volume"] ?? rawProps["HOST_VOLUME_COMPUTED"] ?? 0);
  const area = Number(rawProps["area"] ?? rawProps["Area"] ?? rawProps["HOST_AREA_COMPUTED"] ?? 0);

  return {
    id,
    speckleType,
    category,
    level,
    material: material || "Unknown",
    volume: isNaN(volume) ? 0 : volume,
    area: isNaN(area) ? 0 : area,
    family: rawProps["family"] ?? rawProps["Family"] ?? undefined,
    mark: name,
  };
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

      // ── USA getObjectProperties() per estrarre le proprietà reali ──
      log("Extracting BIM metadata...");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let propertyInfoList: any[] = [];

      if (typeof viewer.getObjectProperties === "function") {
        // Metodo ufficiale: restituisce PropertyInfo[] con id + properties
        propertyInfoList = await viewer.getObjectProperties();
        console.log(`[SpeckleViewer] getObjectProperties() → ${propertyInfoList.length} items`);

        // Log di debug sui primi 3 elementi per capire la struttura
        for (let i = 0; i < Math.min(3, propertyInfoList.length); i++) {
          const item = propertyInfoList[i];
          console.log(`[SpeckleViewer][${i}] id=${item.id}`);
          console.log(`[SpeckleViewer][${i}] properties keys:`, Object.keys(item.properties ?? {}).join(", "));
          // Log dei valori di category e level
          const p = item.properties ?? {};
          console.log(`[SpeckleViewer][${i}] category="${p.category ?? p.Category}", level="${p.Level ?? p.level}"`);
        }
      } else {
        // Fallback: usa il WorldTree come prima, ma logga un warning
        console.warn("[SpeckleViewer] getObjectProperties() non disponibile — fallback WorldTree");
        const worldTree = viewer.getWorldTree();
        if (typeof worldTree.walk === "function") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          worldTree.walk((node: any) => {
            const raw = node?.model?.raw ?? node?.raw;
            if (raw?.id) {
              propertyInfoList.push({ id: raw.id, properties: raw, type: raw.speckle_type });
            }
            return true;
          });
        }
      }

      // Filtra e converte in BimObject
      const seen = new Set<string>();
      const bimObjects: BimObject[] = [];

      for (const info of propertyInfoList) {
        const obj = bimObjectFromPropertyInfo(info);
        if (!obj || seen.has(obj.id)) continue;
        seen.add(obj.id);
        bimObjects.push(obj);
      }

      // Debug: distribuzione categorie
      const catCounts: Record<string, number> = {};
      for (const o of bimObjects) catCounts[o.category] = (catCounts[o.category] ?? 0) + 1;
      console.log("[SpeckleViewer] Category distribution:", catCounts);

      const levelSample = [...new Set(bimObjects.map(o => o.level))].slice(0, 10);
      console.log("[SpeckleViewer] Level sample:", levelSample);

      log(`Extracted ${bimObjects.length} elements`);

      if (bimObjects.length === 0) {
        throw new Error("0 elements extracted — controlla la console per i log di debug");
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
