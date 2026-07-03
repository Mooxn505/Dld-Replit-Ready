import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronDown, ChevronUp, FileText, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
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

const PAGE_MARGIN = 48;
const PAGE_WIDTH = 612; // US Letter, pt
const PAGE_HEIGHT = 792;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function buildPdf(props: DataExportPanelProps): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  let y = PAGE_MARGIN;

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_HEIGHT - PAGE_MARGIN) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
  };

  const sectionTitle = (title: string) => {
    ensureSpace(30);
    y += 10;
    doc.setDrawColor(29, 158, 117);
    doc.setLineWidth(1.2);
    doc.line(PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN, y);
    y += 16;
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(title.toUpperCase(), PAGE_MARGIN, y);
    y += 14;
  };

  const kvRow = (label: string, value: string) => {
    ensureSpace(16);
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(label, PAGE_MARGIN, y);
    doc.setTextColor(20, 20, 20);
    doc.setFont("courier", "bold");
    doc.text(value, PAGE_MARGIN + 260, y);
    y += 14;
  };

  const note = (text: string) => {
    ensureSpace(14);
    doc.setFont("courier", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(140, 140, 140);
    doc.text(text, PAGE_MARGIN, y);
    y += 14;
  };

  // Header
  doc.setFont("courier", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 20, 20);
  doc.text("DLD CELL SORTING SIMULATOR", PAGE_MARGIN, y);
  y += 18;
  doc.setFontSize(11);
  doc.setFont("courier", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text("Laboratory Report — Deterministic Lateral Displacement Analysis", PAGE_MARGIN, y);
  y += 14;
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  doc.setFontSize(9);
  doc.text(`Generated ${ts}  ·  v1.2.0-BETA`, PAGE_MARGIN, y);
  y += 6;

  sectionTitle("Geometry Parameters");
  kvRow("Particle 1 diameter (um)", `${props.d1}`);
  kvRow("Particle 1 label", props.label1);
  kvRow("Particle 2 diameter (um)", `${props.d2}`);
  kvRow("Particle 2 label", props.label2);
  kvRow("Pillar gap G (um)", `${props.G}`);
  kvRow("Array period N", `${props.N}`);

  sectionTitle("Separation Analysis");
  if (props.analyzeData) {
    const d = props.analyzeData;
    kvRow("Critical diameter Dc (um)", fmt(d.Dc));
    kvRow("Sorting efficiency (%)", fmt(d.efficiency, 1));
    kvRow("Separation status", d.separated ? "SEPARATED" : "MIXED");
    kvRow("Delta lateral displacement (um/row)", fmt(d.delta_lateral));
    kvRow("Particle 1 path", d.p1_path ?? "-");
    kvRow("Particle 2 path", d.p2_path ?? "-");
  } else {
    note("(Run Analysis to populate this section)");
  }

  sectionTitle("Flow Rate Analysis");
  if (props.flowData) {
    const f = props.flowData;
    kvRow("Ideal sorting efficiency (%)", fmt(f.ideal_efficiency, 1));
    kvRow("Re critical", `${f.re_crit}`);
    kvRow("Optimal velocity range (mm/s)", `${f.optimal_v_min_mm_s} - ${f.optimal_v_max_mm_s}`);
    kvRow("Optimal flow rate range (uL/min)", `${fmt(f.optimal_q_min_ul_min)} - ${fmt(f.optimal_q_max_ul_min)}`);
    kvRow("Channel height x width (um)", `${f.channel_height_um} x ${f.channel_width_um}`);
  } else {
    note("(Run Flow Analysis to populate this section)");
  }

  sectionTitle("Throughput Estimate");
  if (props.throughputData) {
    const t = props.throughputData;
    kvRow("Sample concentration (cells/mL)", formatCells(t.concentration_cells_per_ml));
    kvRow("Sample volume (mL)", `${t.sample_volume_ml}`);
    kvRow("Total cells in sample", formatCells(t.total_cells_in_sample));
    kvRow("Optimal flow rate max (uL/min)", fmt(t.optimal_q_max_ul_min));
    kvRow("Throughput (cells/min)", formatCells(t.throughput_cells_per_min));
    kvRow("Throughput (cells/hr)", formatCells(t.throughput_cells_per_hour));
    kvRow("Processing time (min)", fmt(t.processing_time_min, 1));
    kvRow("Recovered cells", formatCells(t.recovered_cells));
    kvRow("Recovery rate (%)", fmt((t.recovered_cells / t.total_cells_in_sample) * 100, 1));
  } else {
    note("(Run Throughput Estimator to populate this section)");
  }

  ensureSpace(30);
  y += 10;
  doc.setFont("courier", "italic");
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    "Physics model: Davis (2006) critical diameter formula; Reynolds-degraded efficiency model.",
    PAGE_MARGIN,
    y,
  );
  y += 12;
  doc.text("Prepared for BioGENEius competition submission.", PAGE_MARGIN, y);

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - PAGE_MARGIN - 60, PAGE_HEIGHT - 24);
  }

  void CONTENT_WIDTH;
  return doc;
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

  const handleDownloadPdf = () => {
    const doc = buildPdf(props);
    const ts = new Date().toISOString().slice(0, 10);
    doc.save(`dld_lab_report_G${props.G}_N${props.N}_${ts}.pdf`);
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

              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  onClick={handleDownloadCsv}
                  className="flex-1 font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
                >
                  <Download className="w-3 h-3 mr-1.5 text-primary" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  className="flex-1 font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
                >
                  <FileDown className="w-3 h-3 mr-1.5 text-primary" />
                  PDF Report
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
