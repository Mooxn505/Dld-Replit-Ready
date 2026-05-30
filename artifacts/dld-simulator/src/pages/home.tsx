import { useState, useEffect } from "react";
import { useGetCells, useAnalyzeParticles, useSweepGeometry, useGetDcCurve, useAnalyzeFlowRate } from "@workspace/api-client-react";
import { ControlPanel } from "@/components/control-panel";
import { TrajectoryVisualizer } from "@/components/trajectory-visualizer";
import { ChartsPanel } from "@/components/charts-panel";
import { motion } from "framer-motion";
import { 
  type AnalyzeResponse, 
  type SweepResponse, 
  type DcCurveResponse,
  type FlowAnalysisResponse,
} from "@workspace/api-client-react/src/generated/api.schemas";

export default function Home() {
  const [d1, setD1] = useState(8);
  const [d2, setD2] = useState(12);
  const [label1, setLabel1] = useState("RBC");
  const [label2, setLabel2] = useState("WBC");
  const [G, setG] = useState(20);
  const [N, setN] = useState(5);

  const [analyzeData, setAnalyzeData] = useState<AnalyzeResponse | null>(null);
  const [sweepData, setSweepData] = useState<SweepResponse | null>(null);
  const [dcCurveData, setDcCurveData] = useState<DcCurveResponse | null>(null);
  const [flowData, setFlowData] = useState<FlowAnalysisResponse | null>(null);

  const analyzeParticles = useAnalyzeParticles();
  const sweepGeometry = useSweepGeometry();
  const getDcCurve = useGetDcCurve();
  const analyzeFlow = useAnalyzeFlowRate();
  const { data: cells } = useGetCells();

  // Initial analysis on mount
  useEffect(() => {
    runAnalysis(8, 12, 20, 5, "RBC", "WBC");
  }, []);

  const runAnalysis = (d1Val = d1, d2Val = d2, gVal = G, nVal = N, l1 = label1, l2 = label2) => {
    analyzeParticles.mutate(
      { data: { d1: d1Val, d2: d2Val, G: gVal, N: nVal, label1: l1, label2: l2 } },
      { onSuccess: (data) => setAnalyzeData(data) }
    );
  };

  const runSweep = () => {
    sweepGeometry.mutate(
      { data: { d1, d2 } },
      { onSuccess: (data) => setSweepData(data) }
    );
  };

  const runDcCurves = () => {
    getDcCurve.mutate(
      { data: { N_values: [3, 5, 7, 10] } },
      { onSuccess: (data) => setDcCurveData(data) }
    );
  };

  const runFlowAnalysis = () => {
    analyzeFlow.mutate(
      { data: { d1, d2, G, N } },
      { onSuccess: (data) => setFlowData(data) }
    );
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <ControlPanel
        cells={cells}
        d1={d1}
        setD1={setD1}
        d2={d2}
        setD2={setD2}
        label1={label1}
        setLabel1={setLabel1}
        label2={label2}
        setLabel2={setLabel2}
        G={G}
        setG={setG}
        N={N}
        setN={setN}
        onAnalyze={() => runAnalysis()}
        onSweep={runSweep}
        onDcCurves={runDcCurves}
        onFlowAnalysis={runFlowAnalysis}
        isLoading={analyzeParticles.isPending || sweepGeometry.isPending || getDcCurve.isPending || analyzeFlow.isPending}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative border-l border-border/50">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background opacity-50" />
        
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative z-10 flex flex-col gap-6 scroll-smooth">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-shrink-0"
          >
            <div className="mb-4">
              <h1 className="text-2xl font-mono font-semibold text-foreground/90 tracking-tight uppercase">
                DLD Separation Array
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                Deterministic Lateral Displacement Simulation
              </p>
            </div>
            
            <TrajectoryVisualizer data={analyzeData} d1={d1} d2={d2} label1={label1} label2={label2} />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 min-h-[400px]"
          >
            <ChartsPanel sweepData={sweepData} dcCurveData={dcCurveData} flowData={flowData} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
