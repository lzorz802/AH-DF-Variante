// FILE: src/components/charts/AreaVolumeChart.tsx
// Grafico a barre orizzontali: area (m²) e volume (m³) per categoria.
// Cliccando una barra filtra gli elementi di quella categoria nel 3D.

import { useMemo, useCallback, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { useBimStore } from "@/store/bimStore";
import { X } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  Wall: "#3b82f6", Floor: "#8b5cf6", Column: "#06b6d4",
  Beam: "#10b981", Roof: "#f59e0b", Window: "#ec4899",
  Door: "#f97316", Stair: "#84cc16", Ceiling: "#a78bfa",
  Furniture: "#fb923c", Railing: "#34d399", MEP: "#f43f5e",
  Site: "#65a30d", Room: "#0284c7", Building: "#7c3aed",
  Land: "#16a34a", Vegetation: "#15803d", Water: "#0ea5e9",
  Road: "#d97706", Bridge: "#b45309", Other: "#94a3b8",
  Instance: "#475569", Definition: "#334155", Collection: "#1e293b",
};
const getColor = (cat: string) => CATEGORY_COLORS[cat] ?? "#94a3b8";

type Metric = "area" | "volume";

const CustomTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { category: string; area: number; volume: number; count: number } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.category}</p>
      <p className="text-gray-300">{d.count} elementi</p>
      {d.area > 0 && <p className="text-blue-300">{d.area.toFixed(1)} m² area</p>}
      {d.volume > 0 && <p className="text-purple-300">{d.volume.toFixed(1)} m³ volume</p>}
    </div>
  );
};

export const AreaVolumeChart = () => {
  const { bimObjects, selectedIds, activeFilters, setFilter, setSelectedIds } = useBimStore();
  const [metric, setMetric] = useState<Metric>("area");

  // Aggrega area e volume per categoria, escludendo categorie strutturali pure
  const data = useMemo(() => {
    const map = new Map<string, { area: number; volume: number; count: number; ids: string[] }>();

    for (const obj of bimObjects) {
      const prev = map.get(obj.category) ?? { area: 0, volume: 0, count: 0, ids: [] };
      map.set(obj.category, {
        area: prev.area + obj.area,
        volume: prev.volume + obj.volume,
        count: prev.count + 1,
        ids: [...prev.ids, obj.id],
      });
    }

    return [...map.entries()]
      .map(([category, v]) => ({ category, ...v }))
      // Mostra solo categorie con almeno un valore significativo
      .filter((d) => d.count > 0)
      .sort((a, b) => {
        const valA = metric === "area" ? a.area : a.volume;
        const valB = metric === "area" ? b.area : b.volume;
        return valB - valA;
      });
  }, [bimObjects, metric]);

  const activeCategories = activeFilters.categories;

  const handleBarClick = useCallback(
    (entry: { category: string; ids: string[] }) => {
      const current = activeFilters.categories;
      const isActive = current.includes(entry.category);

      if (isActive) {
        const next = current.filter((c) => c !== entry.category);
        setFilter("categories", next);
        if (next.length === 0) setSelectedIds([], "chart");
        else {
          const ids = data.filter((d) => next.includes(d.category)).flatMap((d) => d.ids);
          setSelectedIds(ids, "chart");
        }
      } else {
        const next = [...current, entry.category];
        setFilter("categories", next);
        setSelectedIds(entry.ids, "chart");
      }
    },
    [activeFilters.categories, data, setFilter, setSelectedIds]
  );

  const getBarColor = (entry: { category: string; ids: string[] }) => {
    if (activeCategories.length > 0) {
      return activeCategories.includes(entry.category) ? getColor(entry.category) : "#1e293b";
    }
    if (selectedIds.size > 0) {
      return entry.ids.some((id) => selectedIds.has(id)) ? getColor(entry.category) : "#1e293b";
    }
    return getColor(entry.category);
  };

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Distribuzione per Piano</h3>
          <p className="text-xs text-gray-500 mt-0.5">Area e volume per categoria · clicca per filtrare</p>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCategories.length > 0 && (
            <button
              onClick={() => { setFilter("categories", []); setSelectedIds([], "chart"); }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mr-1"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
          {/* Toggle metrica */}
          <div className="flex rounded-md overflow-hidden border border-gray-700 text-[10px]">
            <button
              onClick={() => setMetric("area")}
              className={`px-2 py-1 transition-colors ${metric === "area" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
            >
              Area m²
            </button>
            <button
              onClick={() => setMetric("volume")}
              className={`px-2 py-1 transition-colors ${metric === "volume" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"}`}
            >
              Volume m³
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                handleBarClick(e.activePayload[0].payload as { category: string; ids: string[] });
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatValue}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={80}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + "…" : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey={metric} radius={[0, 4, 4, 0]} cursor="pointer" label={{
              position: "right",
              formatter: (v: number) => v > 0 ? formatValue(v) : "",
              fill: "#475569",
              fontSize: 9,
            }}>
              {data.map((entry) => (
                <Cell key={entry.category} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Badge categorie attive */}
      {activeCategories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
          {activeCategories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer"
              style={{ backgroundColor: getColor(cat) + "33", color: getColor(cat) }}
              onClick={() => handleBarClick({ category: cat, ids: data.find(d => d.category === cat)?.ids ?? [] })}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getColor(cat) }} />
              {cat}
              <X className="h-2.5 w-2.5 ml-0.5" />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AreaVolumeChart;
