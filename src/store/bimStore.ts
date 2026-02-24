// ============================================================
// FILE: src/store/bimStore.ts  (MODIFICATO per cross-filtering)
// ============================================================

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface BimObject {
  id: string;
  speckleType: string;
  category: string;
  level: string;
  material: string;
  volume: number;
  area: number;
  family?: string;
  mark?: string;
}

export interface ActiveFilters {
  categories: string[];
  levels: string[];
  materials: string[];
}

interface BimStore {
  bimObjects: BimObject[];
  isLoading: boolean;
  loadError: string | null;

  selectedIds: Set<string>;
  lastSelectionSource: "viewer" | "chart" | null;

  activeFilters: ActiveFilters;

  // IDs che passano TUTTI i filtri (per viewer 3D e PropertiesPanel)
  filteredIds: string[];

  // IDs filtrati escludendo il filtro categorie
  // → usato da LevelChart per mostrare distribuzione corretta dei livelli
  filteredIdsExcludeCategories: string[];

  // IDs filtrati escludendo il filtro livelli
  // → usato da CategoryChart per mostrare distribuzione corretta delle categorie
  filteredIdsExcludeLevels: string[];

  setBimObjects: (objects: BimObject[]) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;

  setSelectedIds: (ids: string[], source: "viewer" | "chart") => void;
  toggleSelected: (id: string, source: "viewer" | "chart") => void;
  clearSelection: () => void;

  setFilter: (key: keyof ActiveFilters, values: string[]) => void;
  clearFilters: () => void;

  getCategories: () => string[];
  getLevels: () => string[];
  getMaterials: () => string[];
  getSelectedObjects: () => BimObject[];
}

// Filtra gli oggetti applicando tutti i filtri, opzionalmente escludendo una chiave
function filterObjects(
  objects: BimObject[],
  filters: ActiveFilters,
  excludeKey?: keyof ActiveFilters
): string[] {
  const categories = excludeKey === "categories" ? [] : filters.categories;
  const levels = excludeKey === "levels" ? [] : filters.levels;
  const materials = excludeKey === "materials" ? [] : filters.materials;

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

function computeAllFiltered(objects: BimObject[], filters: ActiveFilters) {
  return {
    filteredIds: filterObjects(objects, filters),
    filteredIdsExcludeCategories: filterObjects(objects, filters, "categories"),
    filteredIdsExcludeLevels: filterObjects(objects, filters, "levels"),
  };
}

export const useBimStore = create<BimStore>()(
  subscribeWithSelector((set, get) => ({
    bimObjects: [],
    isLoading: false,
    loadError: null,
    selectedIds: new Set<string>(),
    lastSelectionSource: null,
    activeFilters: { categories: [], levels: [], materials: [] },
    filteredIds: [],
    filteredIdsExcludeCategories: [],
    filteredIdsExcludeLevels: [],

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
      const computed = computeAllFiltered(get().bimObjects, filters);
      set({ activeFilters: filters, ...computed });
    },

    clearFilters: () =>
      set({
        activeFilters: { categories: [], levels: [], materials: [] },
        filteredIds: [],
        filteredIdsExcludeCategories: [],
        filteredIdsExcludeLevels: [],
      }),

    getCategories: () => [...new Set(get().bimObjects.map((o) => o.category))].sort(),
    getLevels: () => [...new Set(get().bimObjects.map((o) => o.level))].sort(),
    getMaterials: () => [...new Set(get().bimObjects.map((o) => o.material))].sort(),
    getSelectedObjects: () => {
      const ids = get().selectedIds;
      return get().bimObjects.filter((o) => ids.has(o.id));
    },
  }))
);
