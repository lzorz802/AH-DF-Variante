// ============================================================
// FILE: src/components/charts/CategoryChart.tsx
// MODIFICATO: cross-filtering con LevelChart
// ============================================================
// Quando LevelChart ha filtri attivi, le barre di questa chart
// mostrano solo il conteggio degli elementi che passano il filtro
// livelli. Le barre con 0 elementi vengono opacizzate.
// ============================================================

import { useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { useBimStore } from "@/store/bimStore";
import { X } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Wall:     "#3b82f6",
  Floor:    "#8b5cf6",
  Column:   "#06b6d4",
  Beam:     "#10b981",
  Roof:     "#f59e0b",
  Window:   "#ec4899",
  Door:     "#f97316",
  Stair:    "#84cc16",
  Other:    "#94a3b8",
};

const getColor = (category: string) => CATEGORY_COLORS[category] ?? "#94a3b8";

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { category: string; count: number; filteredCount: number; volume: number } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const hasLevelFilter = d.filteredCount !== d.count;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.category}</p>
      {hasLevelFilter ? (
        <>
          <p className="text-blue-300">{d.filteredCount} elementi (filtrati)</p>
          <p className="text-gray-500">{d.count} elementi totali</p>
        </>
      ) : (
        <p className="text-gray-300">{d.count} elementi</p>
      )}
      <p className="text-gray-400">{d.volume.toFixed(0)} m³ totali</p>
    </div>
  );
};

export const CategoryChart = () => {
  const {
    bimObjects,
    selectedIds,
    activeFilters,
    filteredIdsExcludeLevels,
    setFilter,
    setSelectedIds,
  } = useBimStore();

  // Set degli ID che passano il filtro livelli (per cross-filtering)
  const levelFilteredSet = useMemo(() => {
    if (activeFilters.levels.length === 0) return null;
    return new Set(filteredIdsExcludeLevels);
  }, [activeFilters.levels, filteredIdsExcludeLevels]);

  // Aggregazione per categoria
  // count totale + filteredCount (rispettando filtro livelli)
  const data = useMemo(() => {
    const map = new Map<string, { count: number; filteredCount: number; volume: number; ids: string[] }>();

    bimObjects.forEach((obj) => {
      const prev = map.get(obj.category) ?? { count: 0, filteredCount: 0, volume: 0, ids: [] };
      const isInLevelFilter = levelFilteredSet ? levelFilteredSet.has(obj.id) : true;
      map.set(obj.category, {
        count: prev.count + 1,
        filteredCount: prev.filteredCount + (isInLevelFilter ? 1 : 0),
        volume: prev.volume + obj.volume,
        ids: [...prev.ids, obj.id],
      });
    });

    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [bimObjects, levelFilteredSet]);

  const activeCategories = activeFilters.categories;
  const hasLevelFilter = activeFilters.levels.length > 0;

  const handleBarClick = useCallback(
    (entry: { category: string; ids: string[] }) => {
      const current = activeFilters.categories;
      const isActive = current.includes(entry.category);

      if (isActive) {
        const next = current.filter((c) => c !== entry.category);
        setFilter("categories", next);
        if (next.length === 0) setSelectedIds([], "chart");
        else {
          const ids = data
            .filter((d) => next.includes(d.category))
            .flatMap((d) => d.ids);
          setSelectedIds(ids, "chart");
        }
      } else {
        const next = [...current, entry.category];
        setFilter("categories", next);
        // Seleziona solo gli ID che passano anche il filtro livelli
        const ids = levelFilteredSet
          ? entry.ids.filter((id) => levelFilteredSet.has(id))
          : entry.ids;
        setSelectedIds(ids, "chart");
      }
    },
    [activeFilters.categories, data, setFilter, setSelectedIds, levelFilteredSet]
  );

  const getBarColor = (entry: { category: string; ids: string[]; filteredCount: number }) => {
    // Se c'è un filtro livelli e questa categoria non ha elementi → grigio scuro
    if (hasLevelFilter && entry.filteredCount === 0) return "#1e293b";

    if (activeCategories.length > 0) {
      return activeCategories.includes(entry.category)
        ? getColor(entry.category)
        : "#1e293b";
    }
    if (selectedIds.size > 0) {
      const hasSelected = entry.ids.some((id) => selectedIds.has(id));
      return hasSelected ? getColor(entry.category) : "#1e293b";
    }
    return getColor(entry.category);
  };

  // Opacity barra: se c'è filtro livelli, mostra la proporzione filtrata
  const getBarOpacity = (entry: { filteredCount: number; count: number }) => {
    if (!hasLevelFilter) return 1;
    if (entry.count === 0) return 0.15;
    return Math.max(0.15, entry.filteredCount / entry.count);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Elementi per Categoria</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasLevelFilter
              ? "Filtrato per piano · clicca per selezionare"
              : "Clicca per filtrare il modello 3D"}
          </p>
        </div>
        {activeCategories.length > 0 && (
          <button
            onClick={() => {
              setFilter("categories", []);
              setSelectedIds([], "chart");
            }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                handleBarClick(
                  e.activePayload[0].payload as { category: string; ids: string[] }
                );
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={45}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {/* Barra di sfondo (totale) quando c'è filtro livelli */}
            {hasLevelFilter && (
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" opacity={0.15}>
                {data.map((entry) => (
                  <Cell key={`bg-${entry.category}`} fill={getColor(entry.category)} />
                ))}
              </Bar>
            )}
            {/* Barra principale (filtrata o totale) */}
            <Bar
              dataKey={hasLevelFilter ? "filteredCount" : "count"}
              radius={[4, 4, 0, 0]}
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={getBarColor(entry)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {activeCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
          {activeCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: getColor(cat) + "33", color: getColor(cat) }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getColor(cat) }} />
              {cat}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryChart;
