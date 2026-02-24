// ============================================================
// FILE: src/components/charts/LevelChart.tsx
// MODIFICATO: cross-filtering con CategoryChart
// ============================================================
// Quando CategoryChart ha filtri attivi, le barre di questa chart
// mostrano solo il conteggio degli elementi che passano il filtro
// categorie. Le barre con 0 elementi vengono opacizzate.
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

const ACTIVE_COLOR = "#06b6d4";
const INACTIVE_COLOR = "#1e293b";
const DEFAULT_COLOR = "#0ea5e9";

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { level: string; count: number; filteredCount: number; area: number } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const hasCategoryFilter = d.filteredCount !== d.count;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.level}</p>
      {hasCategoryFilter ? (
        <>
          <p className="text-cyan-300">{d.filteredCount} elementi (filtrati)</p>
          <p className="text-gray-500">{d.count} elementi totali</p>
        </>
      ) : (
        <p className="text-gray-300">{d.count} elementi</p>
      )}
      <p className="text-gray-400">{d.area.toFixed(0)} m² totali</p>
    </div>
  );
};

export const LevelChart = () => {
  const {
    bimObjects,
    selectedIds,
    activeFilters,
    filteredIdsExcludeCategories,
    setFilter,
    setSelectedIds,
  } = useBimStore();

  // Set degli ID che passano il filtro categorie (per cross-filtering)
  const categoryFilteredSet = useMemo(() => {
    if (activeFilters.categories.length === 0) return null;
    return new Set(filteredIdsExcludeCategories);
  }, [activeFilters.categories, filteredIdsExcludeCategories]);

  // Aggregazione per livello
  // count totale + filteredCount (rispettando filtro categorie)
  const data = useMemo(() => {
    const map = new Map<string, { count: number; filteredCount: number; area: number; ids: string[] }>();

    bimObjects.forEach((obj) => {
      const prev = map.get(obj.level) ?? { count: 0, filteredCount: 0, area: 0, ids: [] };
      const isInCategoryFilter = categoryFilteredSet ? categoryFilteredSet.has(obj.id) : true;
      map.set(obj.level, {
        count: prev.count + 1,
        filteredCount: prev.filteredCount + (isInCategoryFilter ? 1 : 0),
        area: prev.area + obj.area,
        ids: [...prev.ids, obj.id],
      });
    });

    return [...map.entries()]
      .map(([level, v]) => ({ level, ...v }))
      .sort((a, b) => {
        const numA = parseInt(a.level.replace(/\D/g, "") || "0");
        const numB = parseInt(b.level.replace(/\D/g, "") || "0");
        return numA - numB;
      });
  }, [bimObjects, categoryFilteredSet]);

  const activeLevels = activeFilters.levels;
  const hasCategoryFilter = activeFilters.categories.length > 0;

  const handleBarClick = useCallback(
    (entry: { level: string; ids: string[] }) => {
      const current = activeFilters.levels;
      const isActive = current.includes(entry.level);

      if (isActive) {
        const next = current.filter((l) => l !== entry.level);
        setFilter("levels", next);
        if (next.length === 0) setSelectedIds([], "chart");
        else {
          const ids = data.filter((d) => next.includes(d.level)).flatMap((d) => d.ids);
          setSelectedIds(ids, "chart");
        }
      } else {
        const next = [...current, entry.level];
        setFilter("levels", next);
        // Seleziona solo gli ID che passano anche il filtro categorie
        const ids = categoryFilteredSet
          ? entry.ids.filter((id) => categoryFilteredSet.has(id))
          : entry.ids;
        setSelectedIds(ids, "chart");
      }
    },
    [activeFilters.levels, data, setFilter, setSelectedIds, categoryFilteredSet]
  );

  const getBarColor = (entry: { level: string; ids: string[]; filteredCount: number }) => {
    // Se c'è un filtro categoria e questo livello non ha elementi → grigio scuro
    if (hasCategoryFilter && entry.filteredCount === 0) return INACTIVE_COLOR;

    if (activeLevels.length > 0) {
      return activeLevels.includes(entry.level) ? ACTIVE_COLOR : INACTIVE_COLOR;
    }
    if (selectedIds.size > 0) {
      return entry.ids.some((id) => selectedIds.has(id)) ? ACTIVE_COLOR : INACTIVE_COLOR;
    }
    return DEFAULT_COLOR;
  };

  const formatLevel = (level: string) =>
    level.length > 12 ? level.substring(0, 11) + "…" : level;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Distribuzione per Piano</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasCategoryFilter
              ? "Filtrato per categoria · clicca per selezionare"
              : "Filtra per livello"}
          </p>
        </div>
        {activeLevels.length > 0 && (
          <button
            onClick={() => {
              setFilter("levels", []);
              setSelectedIds([], "chart");
            }}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
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
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                handleBarClick(
                  e.activePayload[0].payload as { level: string; ids: string[] }
                );
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="level"
              tickFormatter={formatLevel}
              width={85}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            {/* Barra di sfondo (totale) quando c'è filtro categorie */}
            {hasCategoryFilter && (
              <Bar dataKey="count" radius={[0, 4, 4, 0]} cursor="pointer" opacity={0.15}>
                {data.map((entry) => (
                  <Cell key={`bg-${entry.level}`} fill={DEFAULT_COLOR} />
                ))}
              </Bar>
            )}
            {/* Barra principale */}
            <Bar
              dataKey={hasCategoryFilter ? "filteredCount" : "count"}
              radius={[0, 4, 4, 0]}
              cursor="pointer"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.level}
                  fill={getBarColor(entry)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {activeLevels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
          {activeLevels.map((lvl) => (
            <span
              key={lvl}
              className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400"
            >
              {lvl}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LevelChart;
