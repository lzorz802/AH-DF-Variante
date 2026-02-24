import { useEffect } from "react";
import { useBimStore } from "@/store/bimStore";
import { fetchBimObjects } from "@/lib/speckleExtractor";
import { RotateCcw } from "lucide-react";

const EMBED_URL =
  "https://app.speckle.systems/projects/a0102047d4/models/all" +
  "?embedToken=0c70148e6c17a7848184ee9a7947313e5359b3bf70" +
  "#embed=%7B%22isEnabled%22%3Atrue%7D";

export const SpeckleViewer = () => {
  const { setBimObjects, clearFilters, clearSelection } = useBimStore();

  // Carica i dati BIM per i grafici (indipendente dal viewer)
  useEffect(() => {
    fetchBimObjects().then(setBimObjects);
  }, [setBimObjects]);

  const handleReset = () => {
    clearFilters();
    clearSelection();
  };

  return (
    <div className="relative w-full h-full bg-[#1a1f2e] rounded-xl overflow-hidden">
      <iframe
        src={EMBED_URL}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen"
        title="Speckle BIM Viewer"
      />

      {/* Toolbar overlay */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={handleReset}
          title="Reset filtri"
          className="p-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10
                     text-white/70 hover:text-white hover:bg-black/60 transition-all"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Label */}
      <div className="absolute bottom-3 left-3 z-10">
        <span className="text-xs text-white/50 bg-black/30 backdrop-blur-sm px-2 py-1 rounded">
          BIM 3D · Speckle
        </span>
      </div>
    </div>
  );
};

export default SpeckleViewer;
