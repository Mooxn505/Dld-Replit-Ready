import { useState } from "react";
import { useGetDldPresets, useExportDxf } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Layers, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { DldPreset } from "@workspace/api-client-react/src/generated/api.schemas";

const SCALE_OPTIONS = [
  { value: "20", label: "20x  (min feature ~0.4 mm)" },
  { value: "30", label: "30x  (min feature ~0.6 mm)" },
  { value: "50", label: "50x  (min feature ~1.0 mm)" },
  { value: "100", label: "100x  (min feature ~2.0 mm)" },
];

function downloadText(filename: string, content: string): void {
  const blob = new Blob([content], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface PresetCardProps {
  preset: DldPreset;
  scale: number;
  onExport: (preset: DldPreset) => void;
  isPending: boolean;
  activeId: string | null;
}

function PresetCard({ preset, scale, onExport, isPending, activeId }: PresetCardProps) {
  const isActive = activeId === preset.id;

  return (
    <div
      className="border border-border/40 rounded-lg p-3 bg-background/40 space-y-2.5 hover:border-border/70 transition-colors"
      data-testid={`preset-card-${preset.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-foreground/90 tracking-wide truncate">
            {preset.name}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 leading-relaxed">
            {preset.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px]">
        <div className="bg-muted/30 rounded px-1.5 py-1 text-center">
          <div className="text-muted-foreground uppercase tracking-wider mb-0.5">G</div>
          <div className="text-primary font-bold">{preset.G} µm</div>
        </div>
        <div className="bg-muted/30 rounded px-1.5 py-1 text-center">
          <div className="text-muted-foreground uppercase tracking-wider mb-0.5">N</div>
          <div className="text-primary font-bold">{preset.N}</div>
        </div>
        <div className="bg-muted/30 rounded px-1.5 py-1 text-center">
          <div className="text-muted-foreground uppercase tracking-wider mb-0.5">Dc</div>
          <div className="text-[#1D9E75] font-bold">{preset.Dc.toFixed(1)} µm</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-mono truncate flex-1 mr-2">
          {preset.label1} / {preset.label2}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onExport(preset)}
          disabled={isPending}
          className="h-6 text-[10px] font-mono uppercase tracking-wider px-2 border-border/50 hover:bg-muted shrink-0"
          data-testid={`export-btn-${preset.id}`}
        >
          {isActive && isPending ? (
            <span className="animate-pulse">Generating...</span>
          ) : (
            <>
              <Download className="w-2.5 h-2.5 mr-1" />
              {scale}x DXF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface MoldExportPanelProps {
  currentG: number;
  currentN: number;
  currentLabel1: string;
  currentLabel2: string;
}

export function MoldExportPanel({ currentG, currentN, currentLabel1, currentLabel2 }: MoldExportPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState("50");
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const { data: presets } = useGetDldPresets();
  const exportDxf = useExportDxf();

  const handlePresetExport = (preset: DldPreset) => {
    setActivePresetId(preset.id);
    exportDxf.mutate(
      {
        data: {
          G: preset.G,
          N: preset.N,
          scale: Number(scale),
          label: `${preset.name.replace(/\s+/g, "_")}_G${preset.G}_N${preset.N}`,
        },
      },
      {
        onSuccess: (data) => {
          downloadText(data.filename, data.dxf_content);
          setActivePresetId(null);
        },
        onError: () => setActivePresetId(null),
      },
    );
  };

  const handleCurrentExport = () => {
    setActivePresetId("current");
    exportDxf.mutate(
      {
        data: {
          G: currentG,
          N: currentN,
          scale: Number(scale),
          label: `Custom_${currentLabel1.replace(/\s+/g, "")}_${currentLabel2.replace(/\s+/g, "")}_G${currentG}_N${currentN}`,
        },
      },
      {
        onSuccess: (data) => {
          downloadText(data.filename, data.dxf_content);
          setActivePresetId(null);
        },
        onError: () => setActivePresetId(null),
      },
    );
  };

  return (
    <div className="border-t border-border/50 bg-background/20">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        data-testid="mold-export-toggle"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Mold Export
          </span>
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
            <div className="px-4 pb-4 space-y-4">
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                Generates a SolidWorks-compatible R12 DXF — raised positive mold (pillars up),
                1 inlet + 2 outlets, flat base. Extrude 3 mm base + 2 mm pillars.
              </p>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                  Print scale
                </Label>
                <Select value={scale} onValueChange={setScale}>
                  <SelectTrigger
                    className="font-mono text-[11px] bg-background/50 h-7"
                    data-testid="scale-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCALE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="font-mono text-[11px]">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Preset geometries
                </p>
                {presets?.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    scale={Number(scale)}
                    onExport={handlePresetExport}
                    isPending={exportDxf.isPending}
                    activeId={activePresetId}
                  />
                ))}
              </div>

              <div className="border-t border-border/30 pt-3">
                <Button
                  variant="outline"
                  onClick={handleCurrentExport}
                  disabled={exportDxf.isPending}
                  className="w-full font-mono text-[11px] uppercase tracking-wider h-8 border-border/50 bg-background hover:bg-muted"
                  data-testid="export-current-btn"
                >
                  {activePresetId === "current" && exportDxf.isPending ? (
                    <span className="animate-pulse">Generating...</span>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-2" />
                      Export current geometry ({currentG} µm / N={currentN})
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-muted/20 rounded-md p-2.5 space-y-1">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                  Print settings
                </p>
                <ul className="font-mono text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  <li>Layer height: 0.1 mm for smooth pillar walls</li>
                  <li>Material: rigid resin or ABS for sharp edges</li>
                  <li>Use {scale}x DXF — base 3 mm + pillars 2 mm</li>
                  <li>Drill ports to 3–4 mm after printing</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
