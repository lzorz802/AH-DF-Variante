// FILE: src/components/charts/CategoryChart.tsx
// Fixed: expanded color map + groups small categories into "Other" to avoid X-axis clutter

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

// Expanded color map covering IFC + Revit categories
const CATEGORY_COLORS: Record<string, string> = {
  Wall:           "#3b82f6",
  Floor:          "#8b5cf6",
  Column:         "#06b6d4",
  Beam:           "#10b981",
  Roof:           "#f59e0b",
  Window:         "#ec4899",
  Door:           "#f97316",
  Stair:          "#84cc16",
  Ceiling:        "#a78bfa",
  Furniture:      "#fb7185",
  Railing:        "#34d399",
  MEP:            "#f43f5e",
  Site:           "#16a34a",
  Room:           "#0ea5e9",
  Infrastructure: "#d97706",
  Vegetation:     "#22c55e",
  Sign:           "#e879f9",
  Opening:        "#64748b",
  Foundation:     "#92400e",
  Member:         "#10b981",
  Generic:        "#6b7280",
  Other:          "#475569",
};

const getColor = (category: string) => CATEGORY_COLORS[category] ?? "#94a3b8";

// How many individual categories to show before collapsing into "Other"
const MAX_BARS = 14;

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { category: string; count: number; filteredCount: number; volume: number; isOther?: boolean; subCategories?: string[] } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const hasLevelFilter = d.filteredCount !== d.count;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl max-w-[200px]">
      <p className="font-semibold text-white mb-1">{d.category}</p>
      {hasLevelFilter ? (
        <>
          <p className="text-blue-300">{d.filteredCount} elements (filtered)</p>
          <p className="text-gray-500">{d.count} total</p>
        </>
      ) : (
        <p className="text-gray-300">{d.count} elements</p>
      )}
      {d.volume > 0 && <p className="text-gray-400">{d.volume.toFixed(0)} m³</p>}
      {d.subCategories && d.subCategories.length > 0 && (
        <p className="text-gray-600 mt-1 text-[9px] leading-tight">
          {d.subCategories.slice(0, 8).join(", ")}{d.subCategories.length > 8 ? "…" : ""}
        </p>
      )}
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

  const levelFilteredSet = useMemo(() => {
    if (activeFilters.levels.length === 0) return null;
    return new Set(filteredIdsExcludeLevels);
  }, [activeFilters.levels, filteredIdsExcludeLevels]);

  // Aggregate by category
  const rawData = useMemo(() => {
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

  // Collapse small categories beyond MAX_BARS into "Other"
  const data = useMemo(() => {
    if (rawData.length <= MAX_BARS) return rawData.map((d) => ({ ...d, subCategories: undefined, isOther: false }));

    const main = rawData.slice(0, MAX_BARS - 1);
    const rest = rawData.slice(MAX_BARS - 1);
    const otherEntry = {
      category: "Other",
      count: rest.reduce((s, d) => s + d.count, 0),
      filteredCount: rest.reduce((s, d) => s + d.filteredCount, 0),
      volume: rest.reduce((s, d) => s + d.volume, 0),
      ids: rest.flatMap((d) => d.ids),
      subCategories: rest.map((d) => d.category),
      isOther: true,
    };
    return [...main.map((d) => ({ ...d, subCategories: undefined, isOther: false })), otherEntry];
  }, [rawData]);

  const activeCategories = activeFilters.categories;
  const hasLevelFilter   = activeFilters.levels.length > 0;

  const handleBarClick = useCallback(
    (entry: { category: string; ids: string[]; isOther?: boolean }) => {
      const current = activeFilters.categories;
      const isActive = current.includes(entry.category);

      if (isActive) {
        const next = current.filter((c) => c !== entry.category);
        setFilter("categories", next);
        if (next.length === 0) setSelectedIds([], "chart");
        else {
          const ids = rawData.filter((d) => next.includes(d.category)).flatMap((d) => d.ids);
          setSelectedIds(ids, "chart");
        }
      } else {
        const next = [...current, entry.category];
        setFilter("categories", next);
        const ids = levelFilteredSet ? entry.ids.filter((id) => levelFilteredSet.has(id)) : entry.ids;
        setSelectedIds(ids, "chart");
      }
    },
    [activeFilters.categories, rawData, setFilter, setSelectedIds, levelFilteredSet]
  );

  const getBarColor = (entry: { category: string; ids: string[]; filteredCount: number }) => {
    if (hasLevelFilter && entry.filteredCount === 0) return "#1e293b";
    if (activeCategories.length > 0) {
      return activeCategories.includes(entry.category) ? getColor(entry.category) : "#1e293b";
    }
    if (selectedIds.size > 0) {
      return entry.ids.some((id) => selectedIds.has(id)) ? getColor(entry.category) : "#1e293b";
    }
    return getColor(entry.category);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Elementi per Categoria</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {hasLevelFilter ? "Filtrato per piano · clicca per selezionare" : "Clicca per filtrare il modello 3D"}
          </p>
        </div>
        {activeCategories.length > 0 && (
          <button
            onClick={() => { setFilter("categories", []); setSelectedIds([], "chart"); }}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <X className="h-3 w-3" /> Reset
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
                handleBarClick(e.activePayload[0].payload as { category: string; ids: string[]; isOther?: boolean });
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="category"
              tick={{ fill: "#64748b", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={55}
            />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />

            {hasLevelFilter && (
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer" opacity={0.15}>
                {data.map((entry) => (
                  <Cell key={`bg-${entry.category}`} fill={getColor(entry.category)} />
                ))}
              </Bar>
            )}
            <Bar dataKey={hasLevelFilter ? "filteredCount" : "count"} radius={[4, 4, 0, 0]} cursor="pointer">
              {data.map((entry) => (
                <Cell key={entry.category} fill={getBarColor(entry)} />
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
