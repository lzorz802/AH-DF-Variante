const LineChart = () => (
  <svg viewBox="0 0 280 120" fill="none" className="w-full h-full">
    {/* Bars */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
      const heights = [45, 60, 50, 75, 55, 80, 65, 70, 58, 85, 62, 72];
      const x = 12 + i * 22;
      return (
        <rect
          key={i}
          x={x}
          y={120 - heights[i]}
          width={14}
          height={heights[i]}
          rx={3}
          fill={i === 9 ? "hsl(217, 100%, 37%)" : "hsl(217, 80%, 75%)"}
          opacity={i === 9 ? 1 : 0.5}
        />
      );
    })}
    {/* Line overlay */}
    <polyline
      points="19,78 41,62 63,72 85,48 107,68 129,42 151,58 173,52 195,65 217,38 239,60 261,50"
      stroke="hsl(217, 100%, 37%)"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {[19, 41, 63, 85, 107, 129, 151, 173, 195, 217, 239, 261].map((x, i) => {
      const ys = [78, 62, 72, 48, 68, 42, 58, 52, 65, 38, 60, 50];
      return <circle key={i} cx={x} cy={ys[i]} r="3" fill="hsl(217, 100%, 37%)" />;
    })}
  </svg>
);

const DonutBarChart = () => (
  <svg viewBox="0 0 280 120" fill="none" className="w-full h-full">
    {/* Donut */}
    <circle cx="60" cy="60" r="35" stroke="hsl(217, 80%, 80%)" strokeWidth="12" />
    <circle
      cx="60"
      cy="60"
      r="35"
      stroke="hsl(217, 100%, 37%)"
      strokeWidth="12"
      strokeDasharray="154 220"
      strokeLinecap="round"
      transform="rotate(-90 60 60)"
    />
    <circle
      cx="60"
      cy="60"
      r="35"
      stroke="hsl(217, 70%, 55%)"
      strokeWidth="12"
      strokeDasharray="44 220"
      strokeDashoffset="-154"
      strokeLinecap="round"
      transform="rotate(-90 60 60)"
    />
    {/* Bars */}
    {[0, 1, 2, 3, 4].map((i) => {
      const widths = [100, 75, 120, 60, 90];
      const y = 10 + i * 22;
      return (
        <rect
          key={i}
          x={130}
          y={y}
          width={widths[i]}
          height={14}
          rx={4}
          fill={i === 2 ? "hsl(217, 100%, 37%)" : "hsl(217, 70%, 78%)"}
          opacity={i === 2 ? 1 : 0.55}
        />
      );
    })}
  </svg>
);

const HorizontalBarChart = () => (
  <svg viewBox="0 0 280 120" fill="none" className="w-full h-full">
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const widths = [220, 180, 250, 140, 200, 160];
      const y = 5 + i * 19;
      return (
        <rect
          key={i}
          x={10}
          y={y}
          width={widths[i]}
          height={13}
          rx={4}
          fill={i === 2 ? "hsl(217, 100%, 37%)" : "hsl(217, 65%, 78%)"}
          opacity={i === 2 ? 1 : 0.5}
        />
      );
    })}
  </svg>
);

const AreaLineChart = () => (
  <svg viewBox="0 0 280 120" fill="none" className="w-full h-full">
    {/* Area */}
    <path
      d="M0,90 L30,70 L60,80 L90,50 L120,65 L150,35 L180,55 L210,40 L240,60 L270,45 L280,50 L280,120 L0,120Z"
      fill="hsl(217, 80%, 80%)"
      opacity="0.35"
    />
    {/* Bars behind */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
      const heights = [40, 55, 35, 65, 50, 70, 45, 60];
      const x = 15 + i * 33;
      return (
        <rect
          key={i}
          x={x}
          y={120 - heights[i]}
          width={18}
          height={heights[i]}
          rx={3}
          fill="hsl(217, 60%, 75%)"
          opacity={0.45}
        />
      );
    })}
    {/* Line */}
    <polyline
      points="0,90 30,70 60,80 90,50 120,65 150,35 180,55 210,40 240,60 270,45"
      stroke="hsl(217, 100%, 37%)"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type ChartType = "line" | "donut-bar" | "horizontal-bar" | "area-line";

const chartMap: Record<ChartType, React.FC> = {
  line: LineChart,
  "donut-bar": DonutBarChart,
  "horizontal-bar": HorizontalBarChart,
  "area-line": AreaLineChart,
};

interface ChartIllustrationProps {
  type: ChartType;
}

const ChartIllustration = ({ type }: ChartIllustrationProps) => {
  const Chart = chartMap[type];
  return (
    <div className="w-full h-32 px-2 py-1">
      <Chart />
    </div>
  );
};

export type { ChartType };
export default ChartIllustration;
