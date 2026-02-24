// FILE: src/components/charts/AreaVolumeChart.tsx
// Grafico area/volume aggregato in MACRO-CATEGORIE.
// Mapping pensato per modelli civili/GIS/IFC misti.

import { useMemo, useCallback, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import { useBimStore } from "@/store/bimStore";
import { X } from "lucide-react";

// ── Macro-categorie e loro colori ─────────────────────────────
const MACRO_GROUPS: Record<string, { label: string; color: string; categories: string[] }> = {
  infrastrutture: {
    label: "Infrastrutture",
    color: "#f59e0b",
    categories: ["Road", "Bridge", "Tunnel", "Utility", "Network", "Railway", "Road"],
  },
  edifici: {
    label: "Edifici",
    color: "#3b82f6",
    categories: ["Building", "Wall", "Floor", "Column", "Beam", "Roof", "Ceiling", "Stair", "Railing"],
  },
  aperture: {
    label: "Aperture",
    color: "#06b6d4",
    categories: ["Window", "Door"],
  },
  impianti: {
    label: "Impianti MEP",
    color: "#f43f5e",
    categories: ["MEP"],
  },
  territorio: {
    label: "Territorio",
    color: "#16a34a",
    categories: ["Site", "Land", "Terrain", "Topography", "Water", "Vegetation"],
  },
  arredo: {
    label: "Arredo/Segnaletica",
    color: "#8b5cf6",
    categories: ["Furniture", "Generic", "IFC-Other", "IfcSign", "Sign"],
  },
  spazi: {
    label: "Spazi",
    color: "#0ea5e9",
    categories: ["Room", "Space"],
  },
  altro: {
    label: "Altro",
    color: "#475569",
    categories: [], // catch-all
  },
};

// Mappa ogni categoria al proprio gruppo
function getMacroGroup(category: string): string {
  const cat = category.toLowerCase();
  for (const [key, group] of Object.entries(MACRO_GROUPS)) {
    if (key === "altro") continue;
    for (const c of group.categories) {
      if (cat === c.toLowerCase() || cat.includes(c.toLowerCase())) return key;
    }
  }
  // Fallback: cerca per keyword nel nome categoria
  if (cat.includes("road") || cat.includes("bridge") || cat.includes("tunnel") ||
      cat.includes("railway") || cat.includes("utility") || cat.includes("pavement") ||
      cat.includes("carriageway") || cat.includes("lane") || cat.includes("kerb") ||
      cat.includes("marking") || cat.includes("barrier") || cat.includes("guardrail")) return "infrastrutture";
  if (cat.includes("wall") || cat.includes("floor") || cat.includes("slab") ||
      cat.includes("column") || cat.includes("beam") || cat.includes("roof") ||
      cat.includes("build") || cat.includes("stair") || cat.includes("ceil") ||
      cat.includes("railing") || cat.includes("framing")) return "edifici";
  if (cat.includes("window") || cat.includes("door")) return "aperture";
  if (cat.includes("pipe") || cat.includes("duct") || cat.includes("mep") ||
      cat.includes("cable") || cat.includes("conduit")) return "impianti";
  if (cat.includes("site") || cat.includes("land") || cat.includes("terrain") ||
      cat.includes("topograph") || cat.includes("water") || cat.includes("river") ||
      cat.includes("tree") || cat.includes("vegetation") || cat.includes("plant") ||
      cat.includes("green") || cat.includes("soil") || cat.includes("earth") ||
      cat.includes("polygon") || cat.includes("parcel")) return "territorio";
  if (cat.includes("sign") || cat.includes("furniture") || cat.includes("equipment") ||
      cat.includes("generic") || cat.includes("ifc-other")) return "arredo";
  if (cat.includes("room") || cat.includes("space") || cat.includes("zone")) return "spazi";
  return "altro";
}

type Metric = "area" | "volume" | "count";

const CustomTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; area: number; volume: number; count: number; categories: string[] } }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[160px]">
      <p className="font-semibold text-white mb-1.5">{d.label}</p>
      <p className="text-gray-300 mb-1">{d.count} elementi</p>
      {d.area > 0 && <p className="text-blue-300">{d.area >= 1000 ? (d.area / 1000).toFixed(1) + "k" : d.area.toFixed(0)} m²</p>}
      {d.volume > 0 && <p className="text-purple-300">{d.volume >= 1000 ? (d.volume / 1000).toFixed(1) + "k" : d.volume.toFixed(0)} m³</p>}
      {d.categories.length > 0 && (
        <p className="text-gray-600 mt-1.5 text-[9px] leading-tight">{d.categories.slice(0, 6).join(", ")}{d.categories.length > 6 ? "…" : ""}</p>
      )}
    </div>
  );
};

export const AreaVolumeChart = () => {
  const { bimObjects, selectedIds, activeFilters, setFilter, setSelectedIds } = useBimStore();
  const [metric, setMetric] = useState<Metric>("count");

  // Aggrega per macro-categoria
  const data = useMemo(() => {
    const map = new Map<string, {
      area: number; volume: number; count: number;
      ids: string[]; categorySet: Set<string>;
    }>();

    for (const obj of bimObjects) {
      const macroKey = getMacroGroup(obj.category);
      const prev = map.get(macroKey) ?? { area: 0, volume: 0, count: 0, ids: [], categorySet: new Set() };
      prev.area += obj.area;
      prev.volume += obj.volume;
      prev.count += 1;
      prev.ids.push(obj.id);
      prev.categorySet.add(obj.category);
      map.set(macroKey, prev);
    }

    return [...map.entries()]
      .map(([key, v]) => ({
        key,
        label: MACRO_GROUPS[key]?.label ?? key,
        color: MACRO_GROUPS[key]?.color ?? "#94a3b8",
        area: v.area,
        volume: v.volume,
        count: v.count,
        ids: v.ids,
        categories: [...v.categorySet].sort(),
      }))
      .filter((d) => d.count > 0)
      .sort((a, b) => {
        if (metric === "area") return b.area - a.area;
        if (metric === "volume") return b.volume - a.volume;
        return b.count - a.count;
      });
  }, [bimObjects, metric]);

  // Le categorie Speckle che appartengono ai macro-gruppi attivi
  const activeMacroKeys = useMemo(() => {
    // Ricava quali macro-gruppi sono attivi guardando le categorie nel filtro
    if (activeFilters.categories.length === 0) return [];
    const active = new Set<string>();
    for (const cat of activeFilters.categories) {
      active.add(getMacroGroup(cat));
    }
    return [...active];
  }, [activeFilters.categories]);

  const handleBarClick = useCallback(
    (entry: { key: string; ids: string[]; categories: string[] }) => {
      const isActive = activeMacroKeys.includes(entry.key);

      if (isActive) {
        // Deseleziona questo macro-gruppo: rimuovi le sue categorie dai filtri
        const nextCats = activeFilters.categories.filter(
          (c) => getMacroGroup(c) !== entry.key
        );
        setFilter("categories", nextCats);
        if (nextCats.length === 0) setSelectedIds([], "chart");
        else {
          const ids = bimObjects
            .filter((o) => nextCats.includes(o.category))
            .map((o) => o.id);
          setSelectedIds(ids, "chart");
        }
      } else {
        // Attiva: aggiungi tutte le categorie di questo macro-gruppo
        const newCats = [...new Set([...activeFilters.categories, ...entry.categories])];
        setFilter("categories", newCats);
        setSelectedIds(entry.ids, "chart");
      }
    },
    [activeMacroKeys, activeFilters.categories, bimObjects, setFilter, setSelectedIds]
  );

  const getBarColor = (entry: { key: string; color: string }) => {
    if (activeMacroKeys.length > 0) {
      return activeMacroKeys.includes(entry.key) ? entry.color : "#1e293b";
    }
    return entry.color;
  };

  const formatValue = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);

  const dataKey = metric === "area" ? "area" : metric === "volume" ? "volume" : "count";
  const unit = metric === "area" ? " m²" : metric === "volume" ? " m³" : "";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">Distribuzione per Macro-categoria</h3>
          <p className="text-xs text-gray-500 mt-0.5">Clicca per filtrare nel modello 3D</p>
        </div>
        <div className="flex items-center gap-1.5">
          {activeMacroKeys.length > 0 && (
            <button
              onClick={() => { setFilter("categories", []); setSelectedIds([], "chart"); }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors mr-1"
            >
              <X className="h-3 w-3" /> Reset
            </button>
          )}
          {/* Toggle metrica */}
          <div className="flex rounded-md overflow-hidden border border-gray-700 text-[10px]">
            {(["count", "area", "volume"] as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-2 py-1 transition-colors ${
                  metric === m
                    ? m === "area" ? "bg-blue-600 text-white"
                    : m === "volume" ? "bg-purple-600 text-white"
                    : "bg-gray-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {m === "count" ? "N°" : m === "area" ? "m²" : "m³"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 50, left: 0, bottom: 0 }}
            onClick={(e) => {
              if (e?.activePayload?.[0]) {
                handleBarClick(e.activePayload[0].payload as { key: string; ids: string[]; categories: string[] });
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
              dataKey="label"
              width={90}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar
              dataKey={dataKey}
              radius={[0, 4, 4, 0]}
              cursor="pointer"
              label={{
                position: "right",
                formatter: (v: number) => v > 0 ? `${formatValue(v)}${unit}` : "",
                fill: "#475569",
                fontSize: 9,
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.key} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Badge macro-gruppi attivi */}
      {activeMacroKeys.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-800">
          {activeMacroKeys.map((key) => {
            const group = MACRO_GROUPS[key];
            const entry = data.find((d) => d.key === key);
            return (
              <span
                key={key}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full cursor-pointer"
                style={{ backgroundColor: group.color + "33", color: group.color }}
                onClick={() => entry && handleBarClick(entry)}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color }} />
                {group.label}
                <X className="h-2.5 w-2.5 ml-0.5" />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AreaVolumeChart;
