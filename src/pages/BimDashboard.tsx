// FILE: src/pages/BimDashboard.tsx

import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Layers } from "lucide-react";
import { SpeckleViewer } from "@/components/bim/SpeckleViewer";
import { CategoryChart } from "@/components/charts/CategoryChart";
import { AreaVolumeChart } from "@/components/charts/AreaVolumeChart";
import { useBimStore } from "@/store/bimStore";

export const BimDashboard = () => {
  const navigate = useNavigate();
  const { bimObjects, isLoading, clearFilters, clearSelection, activeFilters, selectedIds } =
    useBimStore();

  const hasActiveState =
    activeFilters.categories.length > 0 ||
    activeFilters.levels.length > 0 ||
    selectedIds.size > 0;

  const handleReset = () => {
    clearFilters();
    clearSelection();
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f1117] overflow-hidden">
      {/* ── Topbar ── */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800 bg-[#0f1117] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-100 leading-tight">Speckle BIM Viewer</h1>
              <p className="text-[10px] text-gray-500 leading-tight">
                {isLoading ? "Caricamento…" : `${bimObjects.length} elementi · Modello federato`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveState && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                         border border-gray-700 text-gray-400 hover:text-gray-200
                         hover:border-gray-600 text-xs transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Reset filtri
            </button>
          )}
          <div className="flex gap-1 flex-wrap">
            {activeFilters.categories.map((c) => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">{c}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="flex-1 min-h-0 flex gap-2 p-2">

        {/* Colonna sinistra: CategoryChart + AreaVolumeChart */}
        <div className="w-[380px] shrink-0 flex flex-col gap-2">
          {/* Grafico conteggio per categoria */}
          <div className="flex-1 min-h-0 bg-[#161b27] rounded-xl border border-gray-800 p-4 flex flex-col overflow-hidden">
            <CategoryChart />
          </div>
          {/* Grafico area/volume per categoria */}
          <div className="flex-1 min-h-0 bg-[#161b27] rounded-xl border border-gray-800 p-4 flex flex-col overflow-hidden">
            <AreaVolumeChart />
          </div>
        </div>

        {/* Colonna destra: viewer 3D */}
        <div className="flex-1 min-h-0 min-w-0 rounded-xl overflow-hidden">
          <SpeckleViewer />
        </div>

      </main>
    </div>
  );
};

export default BimDashboard;
