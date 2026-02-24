// ============================================================
// FILE: src/components/charts/PropertiesPanel.tsx  (FILE NUOVO)
// ============================================================
// Pannello proprietà: mostra dettagli degli oggetti selezionati
// (da viewer 3D o da grafici) con statistiche aggregate.
// ============================================================

import { useMemo } from "react";
import { useBimStore } from "@/store/bimStore";
import { Layers, Box, Maximize2, Package, X } from "lucide-react";

export const PropertiesPanel = () => {
  const { selectedIds, bimObjects, clearSelection, filteredIds, activeFilters, clearFilters } =
    useBimStore();

  // Oggetti da mostrare: prima la selezione diretta, poi il filtro
  const displayObjects = useMemo(() => {
    if (selectedIds.size > 0) {
      return bimObjects.filter((o) => selectedIds.has(o.id));
    }
    if (filteredIds.length > 0) {
      return bimObjects.filter((o) => filteredIds.includes(o.id));
    }
    return [];
  }, [selectedIds, bimObjects, filteredIds]);

  // Statistiche aggregate
  const stats = useMemo(() => {
    if (displayObjects.length === 0) return null;
    const totalVolume = displayObjects.reduce((s, o) => s + o.volume, 0);
    const totalArea = displayObjects.reduce((s, o) => s + o.area, 0);
    const categories = new Set(displayObjects.map((o) => o.category));
    const levels = new Set(displayObjects.map((o) => o.level));
    return { totalVolume, totalArea, categories, levels };
  }, [displayObjects]);

  // Stato: nessun filtro/selezione attiva
  const hasActiveFilter =
    activeFilters.categories.length > 0 ||
    activeFilters.levels.length > 0 ||
    activeFilters.materials.length > 0;

  if (!hasActiveFilter && selectedIds.size === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-3">
          <Layers className="h-6 w-6 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">Nessuna selezione</p>
        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
          Seleziona elementi dal modello 3D<br />o filtra dai grafici
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">
            {selectedIds.size > 0 ? "Selezione" : "Elementi Filtrati"}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {displayObjects.length} elementi
          </p>
        </div>
        <button
          onClick={() => {
            clearSelection();
            clearFilters();
          }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="h-3 w-3" />
          Deseleziona
        </button>
      </div>

      {/* Statistiche rapide */}
      {stats && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <StatCard
            icon={<Box className="h-3.5 w-3.5" />}
            label="Volume totale"
            value={`${stats.totalVolume.toFixed(1)} m³`}
            color="blue"
          />
          <StatCard
            icon={<Maximize2 className="h-3.5 w-3.5" />}
            label="Area totale"
            value={`${stats.totalArea.toFixed(1)} m²`}
            color="purple"
          />
          <StatCard
            icon={<Package className="h-3.5 w-3.5" />}
            label="Categorie"
            value={`${stats.categories.size} tipi`}
            color="cyan"
          />
          <StatCard
            icon={<Layers className="h-3.5 w-3.5" />}
            label="Piani"
            value={`${stats.levels.size} livelli`}
            color="emerald"
          />
        </div>
      )}

      {/* Lista oggetti (scrollabile) */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {displayObjects.slice(0, 50).map((obj) => (
          <div
            key={obj.id}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg
                       bg-gray-800/60 hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <CategoryDot category={obj.category} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-200 truncate">
                  {obj.mark ?? obj.id.slice(0, 12)}
                </p>
                <p className="text-[10px] text-gray-500 truncate">
                  {obj.category} · {obj.level}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <p className="text-[10px] text-gray-400">{obj.volume.toFixed(1)} m³</p>
              <p className="text-[10px] text-gray-600">{obj.material}</p>
            </div>
          </div>
        ))}
        {displayObjects.length > 50 && (
          <p className="text-center text-xs text-gray-600 py-2">
            … e altri {displayObjects.length - 50} elementi
          </p>
        )}
      </div>
    </div>
  );
};

// ── Sub-componenti ─────────────────────────────────────────────
const COLORS: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  cyan: "bg-cyan-500/20 text-cyan-400",
  emerald: "bg-emerald-500/20 text-emerald-400",
};

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`rounded-lg px-2.5 py-2 ${COLORS[color]}`}>
      <div className="flex items-center gap-1.5 mb-0.5 opacity-80">
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  Wall: "#3b82f6",
  Floor: "#8b5cf6",
  Column: "#06b6d4",
  Beam: "#10b981",
  Roof: "#f59e0b",
  Window: "#ec4899",
  Door: "#f97316",
  Stair: "#84cc16",
  Other: "#94a3b8",
};

function CategoryDot({ category }: { category: string }) {
  return (
    <span
      className="w-2 h-2 rounded-full shrink-0"
      style={{ backgroundColor: CAT_COLORS[category] ?? "#94a3b8" }}
    />
  );
}

export default PropertiesPanel;
