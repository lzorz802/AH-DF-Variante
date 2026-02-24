// ============================================================
// FILE: src/store/bimStore.ts  (FILE NUOVO)
// ============================================================
// Stato centralizzato condiviso tra viewer 3D e grafici.
// Installa zustand prima: npm install zustand
// ============================================================

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

// ── Tipi ─────────────────────────────────────────────────────
export interface BimObject {
  id: string;
  speckleType: string;   // es. "Objects.BuiltElements.Wall"
  category: string;      // es. "Wall", "Beam", "Column", "Slab" …
  level: string;         // es. "Level 1", "Ground Floor" …
  material: string;      // es. "Concrete", "Steel" …
  volume: number;        // m³
  area: number;          // m²
  family?: string;       // Revit family name
  mark?: string;         // elemento mark
}

export interface ActiveFilters {
  categories: string[];
  levels: string[];
  materials: string[];
}

interface BimStore {
  // ── Dati grezzi estratti dal modello ─────────────────────
  bimObjects: BimObject[];
  isLoading: boolean;
  loadError: string | null;

  // ── Selezione (può venire da viewer O da grafico) ─────────
  selectedIds: Set<string>;
  lastSelectionSource: "viewer" | "chart" | null;

  // ── Filtri attivi (dai grafici) ───────────────────────────
  activeFilters: ActiveFilters;

  // ── IDs che passano il filtro (calcolato) ─────────────────
  filteredIds: string[];

  // ── Azioni ───────────────────────────────────────────────
  setBimObjects: (objects: BimObject[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;

  setSelectedIds: (ids: string[], source: "viewer" | "chart") => void;
  toggleSelected: (id: string, source: "viewer" | "chart") => void;
  clearSelection: () => void;

  setFilter: (key: keyof ActiveFilters, values: string[]) => void;
  clearFilters: () => void;

  // ── Dati derivati (getters) ───────────────────────────────
  getCategories: () => string[];
  getLevels: () => string[];
  getMaterials: () => string[];
  getSelectedObjects: () => BimObject[];
}

// ── Helper: ricalcola filteredIds ─────────────────────────────
function computeFilteredIds(objects: BimObject[], filters: ActiveFilters): string[] {
  const { categories, levels, materials } = filters;
  const noFilter =
    categories.length === 0 && levels.length === 0 && materials.length === 0;
  if (noFilter) return [];

  return objects
    .filter((obj) => {
      const okCat = categories.length === 0 || categories.includes(obj.category);
      const okLvl = levels.length === 0 || levels.includes(obj.level);
      const okMat = materials.length === 0 || materials.includes(obj.material);
      return okCat && okLvl && okMat;
    })
    .map((o) => o.id);
}

// ── Store ─────────────────────────────────────────────────────
export const useBimStore = create<BimStore>()(
  subscribeWithSelector((set, get) => ({
    bimObjects: [],
    isLoading: false,
    loadError: null,
    selectedIds: new Set<string>(),
    lastSelectionSource: null,
    activeFilters: { categories: [], levels: [], materials: [] },
    filteredIds: [],

    setBimObjects: (objects) => set({ bimObjects: objects }),
    setLoading: (loading) => set({ isLoading: loading }),
    setLoadError: (error) => set({ loadError: error }),

    setSelectedIds: (ids, source) =>
      set({ selectedIds: new Set(ids), lastSelectionSource: source }),

    toggleSelected: (id, source) => {
      const prev = new Set(get().selectedIds);
      if (prev.has(id)) prev.delete(id);
      else prev.add(id);
      set({ selectedIds: prev, lastSelectionSource: source });
    },

    clearSelection: () =>
      set({ selectedIds: new Set(), lastSelectionSource: null }),

    setFilter: (key, values) => {
      const filters = { ...get().activeFilters, [key]: values };
      const filteredIds = computeFilteredIds(get().bimObjects, filters);
      set({ activeFilters: filters, filteredIds });
    },

    clearFilters: () =>
      set({
        activeFilters: { categories: [], levels: [], materials: [] },
        filteredIds: [],
      }),

    // Getters
    getCategories: () => [...new Set(get().bimObjects.map((o) => o.category))].sort(),
    getLevels: () => [...new Set(get().bimObjects.map((o) => o.level))].sort(),
    getMaterials: () => [...new Set(get().bimObjects.map((o) => o.material))].sort(),
    getSelectedObjects: () => {
      const ids = get().selectedIds;
      return get().bimObjects.filter((o) => ids.has(o.id));
    },
  }))
);
