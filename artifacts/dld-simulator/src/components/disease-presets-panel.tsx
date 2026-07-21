import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, FlaskConical, Zap } from "lucide-react";

export interface DiseasePreset {
  id: string;
  name: string;
  condition: string;
  category: string;
  d1: number;
  label1: string;
  d2: number;
  label2: string;
  G: number;
  N: number;
  description: string;
  clinicalNote: string;
  reference: string;
  urgency: "high" | "medium" | "research";
}

export const DISEASE_PRESETS: DiseasePreset[] = [
  // ── Blood parasites ──────────────────────────
  {
    id: "malaria",
    name: "Malaria Detection",
    condition: "Plasmodium falciparum",
    category: "Infectious Disease",
    d1: 7.5, label1: "Healthy RBC",
    d2: 10.0, label2: "Infected RBC",
    G: 12, N: 8,
    description: "Separate P. falciparum-infected RBCs from healthy cells. Infected cells enlarge and stiffen as the parasite matures.",
    clinicalNote: "~240M cases/year globally. DLD enables rapid diagnosis without expensive microscopy in field settings.",
    reference: "Hou et al., Lab Chip 2010",
    urgency: "high",
  },
  {
    id: "sleeping-sickness",
    name: "Sleeping Sickness",
    condition: "Trypanosoma brucei",
    category: "Infectious Disease",
    d1: 7.5, label1: "RBC",
    d2: 20.0, label2: "Trypanosoma",
    G: 15, N: 5,
    description: "Isolate Trypanosoma brucei parasites from blood for rapid PCR-ready concentrate.",
    clinicalNote: "Neglected tropical disease — 65M at risk in sub-Saharan Africa. Current diagnosis requires expert microscopy unavailable in remote areas.",
    reference: "Zheng et al., Microfluidics 2019",
    urgency: "high",
  },
  {
    id: "sepsis",
    name: "Sepsis — Bacterial Detection",
    condition: "Bacteremia / Sepsis",
    category: "Infectious Disease",
    d1: 2.0, label1: "Bacteria",
    d2: 7.5, label2: "Blood cells",
    G: 5, N: 10,
    description: "Rapidly isolate bacteria (1–3 µm) from blood cells to enable same-hour culture and antibiotic sensitivity testing.",
    clinicalNote: "Every hour of delayed antibiotic therapy increases sepsis mortality by ~7%. DLD reduces time-to-result from 72h to ~4h.",
    reference: "Hann et al., Nat. Biomed. Eng. 2022",
    urgency: "high",
  },
  // ── Cancer (CTCs) ───────────────────────────
  {
    id: "breast-ctc",
    name: "Breast Cancer CTC",
    condition: "Breast cancer (MCF-7)",
    category: "Oncology",
    d1: 12.0, label1: "WBC",
    d2: 20.0, label2: "MCF-7 CTC",
    G: 20, N: 5,
    description: "Enrich circulating tumor cells from whole blood for liquid biopsy and treatment monitoring.",
    clinicalNote: "CTCs: 1–10 cells per mL of blood. Early detection raises 5-year survival from 27% to 99%.",
    reference: "Cristofanilli et al., NEJM 2004",
    urgency: "high",
  },
  {
    id: "ovarian-ctc",
    name: "Ovarian Cancer CTC",
    condition: "Ovarian cancer",
    category: "Oncology",
    d1: 12.0, label1: "WBC",
    d2: 19.0, label2: "Ovarian CTC",
    G: 18, N: 6,
    description: "Isolate ovarian cancer CTCs for early-stage detection via liquid biopsy.",
    clinicalNote: "Stage I 5-year survival: 92%. Stage III: 29%. Most cases diagnosed late — DLD enables routine screening.",
    reference: "Obermayr et al., BMC Cancer 2013",
    urgency: "high",
  },
  {
    id: "pancreatic-ctc",
    name: "Pancreatic Cancer CTC",
    condition: "Pancreatic ductal adenocarcinoma",
    category: "Oncology",
    d1: 7.5, label1: "RBC",
    d2: 15.0, label2: "Pancreatic CTC",
    G: 14, N: 7,
    description: "Rare CTC isolation from blood for earliest possible detection of pancreatic cancer.",
    clinicalNote: "Overall 5-year survival: 11%. If caught before metastasis: 37%. Virtually no early-detection method exists.",
    reference: "Poruk et al., Annals of Surgery 2016",
    urgency: "high",
  },
  {
    id: "colorectal-ctc",
    name: "Colorectal Cancer CTC",
    condition: "Colorectal cancer",
    category: "Oncology",
    d1: 12.0, label1: "WBC",
    d2: 16.0, label2: "Colorectal CTC",
    G: 16, N: 7,
    description: "Non-invasive liquid biopsy alternative to colonoscopy for routine screening.",
    clinicalNote: "2nd leading cause of cancer death. DLD could replace or supplement invasive colonoscopy.",
    reference: "DLD-based CTC isolation, multiple groups",
    urgency: "medium",
  },
  {
    id: "prostate-ctc",
    name: "Prostate Cancer CTC",
    condition: "Prostate cancer (PC-3)",
    category: "Oncology",
    d1: 12.0, label1: "WBC",
    d2: 17.0, label2: "PC-3 CTC",
    G: 17, N: 6,
    description: "Monitor treatment response via CTC count — avoids repeated biopsies.",
    clinicalNote: "CTC count correlates with prognosis and predicts therapy response in real-time.",
    reference: "de Bono et al., Clin. Cancer Res. 2008",
    urgency: "medium",
  },
  // ── Hematology ──────────────────────────────
  {
    id: "sickle-cell",
    name: "Sickle Cell Disease",
    condition: "HbS sickle cell anemia",
    category: "Hematology",
    d1: 5.5, label1: "Sickled RBC",
    d2: 7.5, label2: "Healthy RBC",
    G: 8, N: 10,
    description: "Separate deformed sickled RBCs from healthy cells — useful for quality control in transfusion medicine.",
    clinicalNote: "HbS polymerization reduces RBC deformability and effective diameter. DLD separates by both size and stiffness.",
    reference: "Holm et al., Lab Chip 2011",
    urgency: "medium",
  },
  {
    id: "prenatal",
    name: "Prenatal NRBC Isolation",
    condition: "Non-invasive prenatal testing",
    category: "Prenatal",
    d1: 7.5, label1: "Maternal RBC",
    d2: 10.0, label2: "Fetal NRBC",
    G: 12, N: 8,
    description: "Isolate fetal nucleated red blood cells from maternal blood for chromosome analysis without amniocentesis.",
    clinicalNote: "NRBCs: 1 per 10^6–10^7 maternal cells. Enables Down syndrome & other chromosomal diagnoses from a blood draw.",
    reference: "Huang et al., Science 2008",
    urgency: "high",
  },
  {
    id: "stem-cell",
    name: "Stem Cell Therapy Prep",
    condition: "Hematopoietic stem cell isolation",
    category: "Cell Therapy",
    d1: 7.5, label1: "RBC",
    d2: 10.0, label2: "HSC (CD34+)",
    G: 12, N: 8,
    description: "Label-free enrichment of hematopoietic stem cells for bone marrow transplantation.",
    clinicalNote: "Current gold standard (magnetic MACS) adds labels. DLD enables label-free, GMP-compatible processing.",
    reference: "Bhagat et al., Lab Chip 2011",
    urgency: "research",
  },
];

interface DiseasePanelProps {
  onLoadPreset: (preset: DiseasePreset) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Infectious Disease": "text-[#E24B4A] border-[#E24B4A]/30 bg-[#E24B4A]/8",
  "Oncology": "text-[#8b5cf6] border-[#8b5cf6]/30 bg-[#8b5cf6]/8",
  "Hematology": "text-[#378ADD] border-[#378ADD]/30 bg-[#378ADD]/8",
  "Prenatal": "text-[#1D9E75] border-[#1D9E75]/30 bg-[#1D9E75]/8",
  "Cell Therapy": "text-[#EF9F27] border-[#EF9F27]/30 bg-[#EF9F27]/8",
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Clinical priority", color: "text-[#E24B4A]" },
  medium: { label: "Diagnostic", color: "text-[#EF9F27]" },
  research: { label: "Research", color: "text-muted-foreground" },
};

const ALL_CATEGORIES = ["All", ...Array.from(new Set(DISEASE_PRESETS.map(p => p.category)))];

export function DiseasePresetsPanel({ onLoadPreset }: DiseasePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = DISEASE_PRESETS.filter(
    p => activeCategory === "All" || p.category === activeCategory
  );

  return (
    <div className="border-t border-border/50">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5 text-[#8b5cf6]" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground/80">
            Disease Applications
          </span>
          <span className="text-[9px] font-mono text-muted-foreground bg-muted/30 rounded-full px-1.5 py-0.5">
            {DISEASE_PRESETS.length}
          </span>
        </div>
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-3">
              {/* Category filter */}
              <div className="flex flex-wrap gap-1">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                      activeCategory === cat
                        ? "bg-primary/20 border-primary/40 text-primary"
                        : "bg-muted/10 border-border/30 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Preset cards */}
              <div className="space-y-1.5">
                {filtered.map(preset => {
                  const isOpen = expandedId === preset.id;
                  const catColor = CATEGORY_COLORS[preset.category] ?? "text-muted-foreground border-border/30 bg-muted/10";
                  const urg = URGENCY_LABELS[preset.urgency];

                  return (
                    <div
                      key={preset.id}
                      className="border border-border/40 rounded-lg overflow-hidden bg-card/50"
                    >
                      {/* Header row */}
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/15 transition-colors text-left"
                        onClick={() => setExpandedId(isOpen ? null : preset.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-bold text-foreground/90 truncate">
                              {preset.name}
                            </span>
                            <span className={`text-[8px] font-mono px-1 py-0.5 rounded border ${catColor}`}>
                              {preset.category}
                            </span>
                          </div>
                          <div className="text-[8px] font-mono text-muted-foreground truncate italic">
                            {preset.condition}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[8px] font-mono ${urg.color}`}>
                            {urg.label}
                          </span>
                          {isOpen
                            ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                            : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 space-y-2 border-t border-border/30">
                              {/* Params row */}
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                <span className="text-[8px] font-mono bg-[#E24B4A]/10 text-[#E24B4A] border border-[#E24B4A]/30 rounded px-1.5 py-0.5">
                                  {preset.label1}: {preset.d1}µm
                                </span>
                                <span className="text-[8px] font-mono bg-[#378ADD]/10 text-[#378ADD] border border-[#378ADD]/30 rounded px-1.5 py-0.5">
                                  {preset.label2}: {preset.d2}µm
                                </span>
                                <span className="text-[8px] font-mono bg-muted/20 text-muted-foreground border border-border/30 rounded px-1.5 py-0.5">
                                  G={preset.G} N={preset.N}
                                </span>
                              </div>

                              <p className="text-[9px] font-mono text-foreground/70 leading-relaxed">
                                {preset.description}
                              </p>

                              <div className="bg-[#EF9F27]/8 border border-[#EF9F27]/20 rounded p-2">
                                <div className="text-[8px] font-mono text-[#EF9F27] uppercase tracking-wider mb-0.5">
                                  Clinical Impact
                                </div>
                                <p className="text-[9px] font-mono text-foreground/70 leading-relaxed">
                                  {preset.clinicalNote}
                                </p>
                              </div>

                              <div className="text-[8px] font-mono text-muted-foreground italic">
                                Ref: {preset.reference}
                              </div>

                              <button
                                onClick={() => {
                                  onLoadPreset(preset);
                                  setExpandedId(null);
                                }}
                                className="w-full flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase tracking-wider py-1.5 rounded border border-[#8b5cf6]/50 text-[#8b5cf6] bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/20 transition-colors"
                              >
                                <Zap className="w-3 h-3" />
                                Load Preset
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
