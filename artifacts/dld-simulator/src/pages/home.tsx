import { useState, useEffect } from "react";
import {
  useGetCells,
  useAnalyzeParticles,
  useSweepGeometry,
  useGetDcCurve,
  useAnalyzeFlowRate,
  useEstimateThroughput,
  useAnalyzeCascade,
  useAnalyzePurity,
} from "@workspace/api-client-react";
import { ControlPanel } from "@/components/control-panel";
import { TrajectoryVisualizer } from "@/components/trajectory-visualizer";
import { ChartsPanel } from "@/components/charts-panel";
import { buildPdf } from "@/components/data-export-panel";
import type { ReportHistoryEntry } from "@/components/report-history-panel";
import { motion } from "framer-motion";
import {
  type AnalyzeResponse,
  type SweepResponse,
  type DcCurveResponse,
  type FlowAnalysisResponse,
  type ThroughputResponse,
  type CascadeResponse,
  type PurityResponse,
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
  const [throughputData, setThroughputData] = useState<ThroughputResponse | null>(null);
  const [cascadeData, setCascadeData] = useState<CascadeResponse | null>(null);
  const [purityData, setPurityData] = useState<PurityResponse | null>(null);

  const [refDcData, setRefDcData] = useState<DcCurveResponse | null>(null);
  const [refFlowData, setRefFlowData] = useState<FlowAnalysisResponse | null>(null);
  const [refLabel, setRefLabel] = useState<string | null>(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportStep, setReportStep] = useState<string | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem("dld-report-history");
      return raw ? (JSON.parse(raw) as ReportHistoryEntry[]) : [];
    } catch {
      return [];
    }
  });

  const persistHistory = (entries: ReportHistoryEntry[]) => {
    setReportHistory(entries);
    try {
      localStorage.setItem("dld-report-history", JSON.stringify(entries));
    } catch {
      // ignore storage errors (e.g. quota exceeded)
    }
  };

  const clearReportHistory = () => persistHistory([]);
  const removeReportHistoryEntry = (id: string) =>
    persistHistory(reportHistory.filter((e) => e.id !== id));

  const analyzeParticles = useAnalyzeParticles();
  const sweepGeometry = useSweepGeometry();
  const getDcCurve = useGetDcCurve();
  const analyzeFlow = useAnalyzeFlowRate();
  const getDcCurveRef = useGetDcCurve();
  const analyzeFlowRef = useAnalyzeFlowRate();
  const estimateThroughput = useEstimateThroughput();
  const analyzeCascade = useAnalyzeCascade();
  const analyzePurity = useAnalyzePurity();
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

  const pinReference = () => {
    setRefLabel(`G=${G} N=${N}`);
    getDcCurveRef.mutate(
      { data: { N_values: [3, 5, 7, 10] } },
      { onSuccess: (data) => setRefDcData(data) }
    );
    analyzeFlowRef.mutate(
      { data: { d1, d2, G, N } },
      { onSuccess: (data) => setRefFlowData(data) }
    );
  };

  const clearReference = () => {
    setRefDcData(null);
    setRefFlowData(null);
    setRefLabel(null);
  };

  const generateFullReport = async () => {
    setIsGeneratingReport(true);
    try {
      setReportStep("Analysis");
      const analyzeRes = await analyzeParticles.mutateAsync({
        data: { d1, d2, G, N, label1, label2 },
      });
      setAnalyzeData(analyzeRes);

      setReportStep("Flow Analysis");
      const flowRes = await analyzeFlow.mutateAsync({ data: { d1, d2, G, N } });
      setFlowData(flowRes);

      setReportStep("Throughput");
      const throughputRes = await estimateThroughput.mutateAsync({
        data: { d1, d2, G, N, concentration_cells_per_ml: 5_000_000, sample_volume_ml: 1 },
      });
      setThroughputData(throughputRes);

      setReportStep("Cascade");
      const stage2G = Math.max(5, G - 10);
      const stage2N = Math.min(15, N + 3);
      const cascadeRes = await analyzeCascade.mutateAsync({
        data: { d1, d2, stage1: { G, N }, stage2: { G: stage2G, N: stage2N } },
      });
      setCascadeData(cascadeRes);

      setReportStep("Purity");
      const purityRes = await analyzePurity.mutateAsync({
        data: {
          d1,
          d2,
          target_fraction_pct: 1,
          target: "d2",
          stage1: { G, N },
        },
      });
      setPurityData(purityRes);

      setReportStep("Building PDF");
      const reportProps = {
        d1,
        d2,
        G,
        N,
        label1,
        label2,
        analyzeData: analyzeRes,
        flowData: flowRes,
        throughputData: throughputRes,
        cascadeData: cascadeRes,
        purityData: purityRes,
      };
      const doc = buildPdf(reportProps);
      const ts = new Date().toISOString().slice(0, 10);
      doc.save(`dld_lab_report_G${G}_N${N}_${ts}.pdf`);

      const entry: ReportHistoryEntry = {
        ...reportProps,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      persistHistory([entry, ...reportHistory].slice(0, 20));
    } finally {
      setIsGeneratingReport(false);
      setReportStep(null);
    }
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
        onThroughputResult={setThroughputData}
        onOptimizeApply={() => runAnalysis()}
        onCascadeApply={() => runAnalysis()}
        onCascadeResult={setCascadeData}
        onPurityApply={() => runAnalysis()}
        onPurityResult={setPurityData}
        onPinReference={pinReference}
        onClearReference={clearReference}
        refLabel={refLabel}
        isPinning={getDcCurveRef.isPending || analyzeFlowRef.isPending}
        analyzeData={analyzeData}
        flowData={flowData}
        throughputData={throughputData}
        cascadeData={cascadeData}
        purityData={purityData}
        isLoading={analyzeParticles.isPending || sweepGeometry.isPending || getDcCurve.isPending || analyzeFlow.isPending}
        onGenerateFullReport={generateFullReport}
        isGeneratingReport={isGeneratingReport}
        reportStep={reportStep}
        reportHistory={reportHistory}
        onClearReportHistory={clearReportHistory}
        onRemoveReportHistoryEntry={removeReportHistoryEntry}
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
            <ChartsPanel
              sweepData={sweepData}
              dcCurveData={dcCurveData}
              flowData={flowData}
              throughputData={throughputData}
              refDcData={refDcData}
              refFlowData={refFlowData}
              refLabel={refLabel}
              currentG={G}
              currentN={N}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
