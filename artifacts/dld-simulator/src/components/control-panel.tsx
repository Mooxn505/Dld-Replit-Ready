import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Play, Grid3X3, LineChart, Waves, Cpu, BookmarkPlus, BookmarkX, FileDown } from "lucide-react";
import type { CellEntry, AnalyzeResponse, FlowAnalysisResponse, ThroughputResponse, CascadeResponse, PurityResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { MoldExportPanel } from "./mold-export-panel";
import { ThroughputPanel } from "./throughput-panel";
import { DataExportPanel } from "./data-export-panel";
import { OptimizePanel } from "./optimize-panel";
import { CascadePanel } from "./cascade-panel";
import { PurityPanel } from "./purity-panel";
import { ReportHistoryPanel, type ReportHistoryEntry } from "./report-history-panel";

interface ControlPanelProps {
  cells?: CellEntry[];
  d1: number;
  setD1: (val: number) => void;
  d2: number;
  setD2: (val: number) => void;
  label1: string;
  setLabel1: (val: string) => void;
  label2: string;
  setLabel2: (val: string) => void;
  G: number;
  setG: (val: number) => void;
  N: number;
  setN: (val: number) => void;
  onAnalyze: () => void;
  onSweep: () => void;
  onDcCurves: () => void;
  onFlowAnalysis: () => void;
  onThroughputResult: (data: ThroughputResponse) => void;
  onOptimizeApply: () => void;
  onCascadeApply: () => void;
  onCascadeResult?: (data: CascadeResponse) => void;
  onPurityApply: () => void;
  onPurityResult?: (data: PurityResponse) => void;
  onPinReference: () => void;
  onClearReference: () => void;
  refLabel: string | null;
  isPinning: boolean;
  analyzeData: AnalyzeResponse | null;
  flowData: FlowAnalysisResponse | null;
  throughputData: ThroughputResponse | null;
  cascadeData: CascadeResponse | null;
  purityData: PurityResponse | null;
  isLoading: boolean;
  onGenerateFullReport?: () => void;
  isGeneratingReport?: boolean;
  reportStep?: string | null;
  reportHistory?: ReportHistoryEntry[];
  onClearReportHistory?: () => void;
  onRemoveReportHistoryEntry?: (id: string) => void;
  onLoadReportConfig?: (payload: { G: number; N: number; d1: number; d2: number; label1: string; label2: string }) => void;
}

export function ControlPanel({
  cells,
  d1,
  setD1,
  d2,
  setD2,
  label1,
  setLabel1,
  label2,
  setLabel2,
  G,
  setG,
  N,
  setN,
  onAnalyze,
  onSweep,
  onDcCurves,
  onFlowAnalysis,
  onThroughputResult,
  onOptimizeApply,
  onCascadeApply,
  onCascadeResult,
  onPurityApply,
  onPurityResult,
  onPinReference,
  onClearReference,
  refLabel,
  isPinning,
  analyzeData,
  flowData,
  throughputData,
  cascadeData,
  purityData,
  isLoading,
  onGenerateFullReport,
  isGeneratingReport,
  reportStep,
  reportHistory,
  onClearReportHistory,
  onRemoveReportHistoryEntry,
  onLoadReportConfig
}: ControlPanelProps) {
  
  const handleCellSelect = (cellName: string, isParticle1: boolean) => {
    const cell = cells?.find(c => c.name === cellName);
    if (!cell) return;
    
    if (isParticle1) {
      setD1(cell.diameter);
      setLabel1(cell.name);
    } else {
      setD2(cell.diameter);
      setLabel2(cell.name);
    }
  };

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col h-full z-20 flex-shrink-0">
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-md text-primary">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-mono font-bold text-sm tracking-widest text-foreground uppercase">DLD-Sim</h2>
          <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">v1.2.0-beta</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-smooth">
        
        {/* Particle 1 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#E24B4A]" />
              Particle 1
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Library Preset</Label>
              <Select onValueChange={(val) => handleCellSelect(val, true)}>
                <SelectTrigger className="font-mono text-xs bg-background/50 h-8">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {cells?.map(c => (
                    <SelectItem key={c.name} value={c.name} className="font-mono text-xs">
                      {c.name} ({c.diameter} µm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Diameter (µm)</Label>
                <Input 
                  type="number" 
                  value={d1} 
                  onChange={(e) => setD1(Number(e.target.value))}
                  className="font-mono text-xs h-8 bg-background/50"
                  step="0.1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Label</Label>
                <Input 
                  value={label1} 
                  onChange={(e) => setLabel1(e.target.value)}
                  className="font-mono text-xs h-8 bg-background/50"
                />
              </div>
            </div>
          </div>
        </section>

        <Separator className="opacity-50" />

        {/* Particle 2 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-foreground/80 uppercase tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#378ADD]" />
              Particle 2
            </h3>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Library Preset</Label>
              <Select onValueChange={(val) => handleCellSelect(val, false)}>
                <SelectTrigger className="font-mono text-xs bg-background/50 h-8">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {cells?.map(c => (
                    <SelectItem key={c.name} value={c.name} className="font-mono text-xs">
                      {c.name} ({c.diameter} µm)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Diameter (µm)</Label>
                <Input 
                  type="number" 
                  value={d2} 
                  onChange={(e) => setD2(Number(e.target.value))}
                  className="font-mono text-xs h-8 bg-background/50"
                  step="0.1"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Label</Label>
                <Input 
                  value={label2} 
                  onChange={(e) => setLabel2(e.target.value)}
                  className="font-mono text-xs h-8 bg-background/50"
                />
              </div>
            </div>
          </div>
        </section>

        <Separator className="opacity-50" />

        {/* Geometry */}
        <section className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-foreground/80 uppercase tracking-widest">
            Array Geometry
          </h3>
          
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Pillar Gap (G)</Label>
                <span className="font-mono text-xs text-primary">{G} µm</span>
              </div>
              <Slider 
                value={[G]} 
                onValueChange={(vals) => setG(vals[0])}
                min={5} 
                max={50} 
                step={1}
                className="py-1"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">Array Period (N)</Label>
                <span className="font-mono text-xs text-primary">{N}</span>
              </div>
              <Slider 
                value={[N]} 
                onValueChange={(vals) => setN(vals[0])}
                min={2} 
                max={12} 
                step={1}
                className="py-1"
              />
            </div>
          </div>
        </section>
      </div>

      <MoldExportPanel
        currentG={G}
        currentN={N}
        currentLabel1={label1}
        currentLabel2={label2}
      />

      <OptimizePanel
        d1={d1}
        d2={d2}
        setG={setG}
        setN={setN}
        onAnalyze={onOptimizeApply}
      />

      <CascadePanel
        d1={d1}
        d2={d2}
        currentG={G}
        currentN={N}
        setG={setG}
        setN={setN}
        onApply={onCascadeApply}
        onResult={onCascadeResult}
      />

      <PurityPanel
        d1={d1}
        d2={d2}
        label1={label1}
        label2={label2}
        currentG={G}
        currentN={N}
        setG={setG}
        setN={setN}
        onApply={onPurityApply}
        onResult={onPurityResult}
      />

      <ThroughputPanel
        d1={d1}
        d2={d2}
        G={G}
        N={N}
        onResult={onThroughputResult}
      />

      <DataExportPanel
        d1={d1}
        d2={d2}
        G={G}
        N={N}
        label1={label1}
        label2={label2}
        analyzeData={analyzeData}
        flowData={flowData}
        throughputData={throughputData}
        cascadeData={cascadeData}
        purityData={purityData}
      />

      {reportHistory && onClearReportHistory && onRemoveReportHistoryEntry && (
        <ReportHistoryPanel
          history={reportHistory}
          onClear={onClearReportHistory}
          onRemove={onRemoveReportHistoryEntry}
          onLoadConfig={onLoadReportConfig}
        />
      )}

      <div className="p-4 border-t border-border/50 bg-background/30 space-y-2">
        {onGenerateFullReport && (
          <div className="space-y-1">
            <Button
              onClick={onGenerateFullReport}
              disabled={isLoading || isGeneratingReport}
              variant="outline"
              className="w-full font-mono uppercase tracking-wider text-xs h-9 border-[#1D9E75]/50 text-[#1D9E75] bg-[#1D9E75]/10 hover:bg-[#1D9E75]/20"
            >
              {isGeneratingReport ? (
                <span className="animate-pulse">Generating Full Report…</span>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5 mr-2" />
                  Generate Full Report
                </>
              )}
            </Button>
            {isGeneratingReport && reportStep && (
              <p className="text-center text-[9px] font-mono text-[#1D9E75]/80 uppercase tracking-widest animate-pulse">
                Step: {reportStep}
              </p>
            )}
          </div>
        )}
        <Button 
          onClick={onAnalyze} 
          disabled={isLoading}
          className="w-full font-mono uppercase tracking-wider text-xs h-10 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/30 transition-colors" />
          <Play className="w-3.5 h-3.5 mr-2" />
          Run Analysis
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            onClick={onSweep} 
            disabled={isLoading}
            className="font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
          >
            <Grid3X3 className="w-3 h-3 mr-1.5 text-primary" />
            Sweep
          </Button>
          <Button 
            variant="outline" 
            onClick={onDcCurves} 
            disabled={isLoading}
            className="font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
          >
            <LineChart className="w-3 h-3 mr-1.5 text-primary" />
            Dc Curves
          </Button>
          <Button 
            variant="outline" 
            onClick={onFlowAnalysis} 
            disabled={isLoading}
            className="col-span-2 font-mono text-[10px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
          >
            <Waves className="w-3 h-3 mr-1.5 text-[#1D9E75]" />
            Flow Analysis
          </Button>
        </div>

        {/* Compare / Pin Reference */}
        {refLabel ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-[#EF9F27]/40 bg-[#EF9F27]/8 text-[#EF9F27]">
            <BookmarkX className="w-3 h-3 shrink-0" />
            <span className="flex-1 font-mono text-[10px] uppercase tracking-wider truncate">
              Ref: {refLabel}
            </span>
            <button
              onClick={onClearReference}
              className="ml-auto text-[9px] font-mono uppercase tracking-wider opacity-70 hover:opacity-100 transition-opacity"
            >
              Clear
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={onPinReference}
            disabled={isLoading || isPinning}
            className="w-full font-mono text-[10px] uppercase tracking-wider h-8 border-dashed border-[#EF9F27]/50 bg-[#EF9F27]/5 hover:bg-[#EF9F27]/10 text-[#EF9F27] hover:text-[#EF9F27]"
          >
            <BookmarkPlus className="w-3 h-3 mr-1.5" />
            {isPinning ? "Pinning…" : "Pin Reference"}
          </Button>
        )}

      </div>
    </aside>
  );
}
