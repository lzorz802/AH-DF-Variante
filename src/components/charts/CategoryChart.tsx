// ============================================================
// FILE: src/components/charts/CategoryChart.tsx  (FILE NUOVO)
// ============================================================
// Grafico a barre: distribuzione elementi per categoria.
// Click su barra → filtra il viewer 3D.
// Selezione nel 3D → evidenzia le barre corrispondenti.
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

// Colori per categoria
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

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { category: string; count: number; volume: number } }> }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.category}</p>
      <p className="text-gray-300">{d.count} elementi</p>
      <p className="text-gray-400">{d.volume.toFixed(0)} m³ totali</p>
    </div>
  );
};

export const CategoryChart = () => {
  const {
    bimObjects,
    selectedIds,
    activeFilters,
    setFilter,
    clearFilters,
    setSelectedIds,
  } = useBimStore();

  // Aggregazione per categoria
  const data = useMemo(() => {
    const map = new Map<string, { count: number; volume: number; ids: string[] }>();
    bimObjects.forEach((obj) => {
      const prev = map.get(obj.category) ?? { count: 0, volume: 0, ids: [] };
      map.set(obj.category, {
        count: prev.count + 1,
        volume: prev.volume + obj.volume,
        ids: [...prev.ids, obj.id],
      });
    });
    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count);
  }, [bimObjects]);

  // Categorie attualmente selezionate nel filtro
  const activeCategories = activeFilters.categories;

  // Click su barra → toggle filtro categoria
  const handleBarClick = useCallback(
    (entry: { category: string; ids: string[] }) => {
      const current = activeFilters.categories;
      const isActive = current.includes(entry.category);

      if (isActive) {
        // Deseleziona
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
        // Seleziona (multi-select con Ctrl, altrimenti replace)
        const next = [...current, entry.category];
        setFilter("categories", next);
        setSelectedIds(entry.ids, "chart");
      }
    },
    [activeFilters.categories, data, setFilter, setSelectedIds]
  );

  // Tinta barra: selected > active filter > dimmed se c'è selezione 3D
  const getBarColor = (entry: { category: string; ids: string[] }) => {
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Elementi per Categoria</h3>
          <p className="text-xs text-gray-500 mt-0.5">Clicca per filtrare il modello 3D</p>
        </div>
        {activeCategories.length > 0 && (
          <button
            onClick={() => { setFilter("categories", []); setSelectedIds([], "chart"); }}
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
                handleBarClick(e.activePayload[0].payload as { category: string; ids: string[] });
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
            <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer">
              {data.map((entry) => (
                <Cell key={entry.category} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda attiva */}
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
