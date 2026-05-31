import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  AnalyzeResponse,
  FlowAnalysisResponse,
  ThroughputResponse,
} from "@workspace/api-client-react/src/generated/api.schemas";

interface DataExportPanelProps {
  d1: number;
  d2: number;
  G: number;
  N: number;
  label1: string;
  label2: string;
  analyzeData: AnalyzeResponse | null;
  flowData: FlowAnalysisResponse | null;
  throughputData: ThroughputResponse | null;
}

function fmt(n: number | undefined | null, decimals = 3): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

function formatCells(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return n.toFixed(0);
}

function buildCsv(props: DataExportPanelProps): string {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const lines: string[] = [];

  const row = (label: string, value: string | number) =>
    lines.push(`"${label}","${value}"`);
  const header = (title: string) => {
    lines.push("");
    lines.push(`"=== ${title} ==="`);
  };
  const comment = (text: string) => lines.push(`"${text}"`);

  comment("DLD Cell Sorting Simulator — Data Export");
  comment(`Generated: ${ts}`);
  comment("Physics model: Davis (2006) Dc formula + Re-degradation efficiency");

  header("GEOMETRY PARAMETERS");
  row("Particle 1 diameter (µm)", props.d1);
  row("Particle 1 label", props.label1);
  row("Particle 2 diameter (µm)", props.d2);
  row("Particle 2 label", props.label2);
  row("Pillar gap G (µm)", props.G);
  row("Array period N", props.N);

  header("SEPARATION ANALYSIS");
  if (props.analyzeData) {
    const d = props.analyzeData;
    row("Critical diameter Dc (µm)", fmt(d.Dc));
    row("Sorting efficiency (%)", fmt(d.efficiency, 1));
    row("Separation status", d.separated ? "SEPARATED" : "MIXED");
    row("Delta lateral displacement (µm/row)", fmt(d.delta_lateral));
    row("Particle 1 path", d.p1_path ?? "—");
    row("Particle 2 path", d.p2_path ?? "—");
  } else {
    comment("(Run Analysis to populate this section)");
  }

  header("FLOW RATE ANALYSIS");
  if (props.flowData) {
    const f = props.flowData;
    row("Ideal sorting efficiency (%)", fmt(f.ideal_efficiency, 1));
    row("Re critical", f.re_crit);
    row("Optimal velocity min (mm/s)", f.optimal_v_min_mm_s);
    row("Optimal velocity max (mm/s)", f.optimal_v_max_mm_s);
    row("Optimal flow rate min (µL/min)", fmt(f.optimal_q_min_ul_min));
    row("Optimal flow rate max (µL/min)", fmt(f.optimal_q_max_ul_min));
    row("Channel height (µm)", f.channel_height_um);
    row("Channel width (µm)", f.channel_width_um);
    lines.push("");
    comment("Flow sweep data (velocity vs efficiency vs Reynolds number):");
    lines.push('"v_mm_s","Re","flow_rate_ul_min","efficiency","regime"');
    for (const pt of f.points) {
      lines.push(
        `${pt.v_mm_s},${pt.Re},${pt.flow_rate_ul_min},${pt.efficiency},"${pt.regime}"`,
      );
    }
  } else {
    comment("(Run Flow Analysis to populate this section)");
  }

  header("THROUGHPUT ESTIMATE");
  if (props.throughputData) {
    const t = props.throughputData;
    row("Sample concentration (cells/mL)", formatCells(t.concentration_cells_per_ml));
    row("Sample volume (mL)", t.sample_volume_ml);
    row("Total cells in sample", formatCells(t.total_cells_in_sample));
    row("Optimal flow rate max (µL/min)", fmt(t.optimal_q_max_ul_min));
    row("Throughput (cells/min)", formatCells(t.throughput_cells_per_min));
    row("Throughput (cells/hr)", formatCells(t.throughput_cells_per_hour));
    row("Processing time (min)", fmt(t.processing_time_min, 1));
    row("Recovered cells", formatCells(t.recovered_cells));
    row("Sorting efficiency at optimal (%)", fmt(t.efficiency_at_optimal, 1));
    row("Recovery rate (%)", fmt((t.recovered_cells / t.total_cells_in_sample) * 100, 1));
  } else {
    comment("(Run Throughput Estimator to populate this section)");
  }

  lines.push("");
  comment("End of export");
  return lines.join("\n");
}

export function DataExportPanel(props: DataExportPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const hasAny = !!(props.analyzeData || props.flowData || props.throughputData);

  const handleDownloadCsv = () => {
    const csv = buildCsv(props);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().slice(0, 10);
    a.download = `dld_sim_G${props.G}_N${props.N}_${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { label: "Geometry", ready: true },
    { label: "Separation", ready: !!props.analyzeData },
    { label: "Flow", ready: !!props.flowData },
    { label: "Throughput", ready: !!props.throughputData },
  ];

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Data Export
          </span>
          {hasAny && (
            <span className="text-[9px] font-mono text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded px-1.5 py-0.5">
              CSV ready
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                Exports all simulation results to a structured CSV — suitable for lab notebooks,
                supplementary data, or BioGENEius competition submissions.
              </p>

              <div className="space-y-1">
                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">
                  Sections included
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {sections.map((s) => (
                    <div
                      key={s.label}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono border ${
                        s.ready
                          ? "border-[#1D9E75]/40 bg-[#1D9E75]/8 text-[#1D9E75]"
                          : "border-border/30 bg-muted/10 text-muted-foreground/50"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.ready ? "bg-[#1D9E75]" : "bg-muted-foreground/30"}`} />
                      {s.label}
                    </div>
                  ))}
                </div>
                {!props.flowData && (
                  <p className="text-[9px] font-mono text-muted-foreground/60 pt-1">
                    Run Flow Analysis + Throughput Estimator to include all sections.
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                onClick={handleDownloadCsv}
                className="w-full font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
              >
                <Download className="w-3 h-3 mr-1.5 text-primary" />
                Download CSV
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
