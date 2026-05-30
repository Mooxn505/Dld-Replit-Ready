/**
 * dxf.ts
 * ------
 * SolidWorks-compatible R12 ASCII DXF generator for DLD chip mold designs.
 *
 * The DXF represents a scaled-up top-down view (XY plane, units = mm) of the
 * pillar array mold — a raised positive where pillars stick up from a flat base.
 * The user extrudes in SolidWorks: 3mm base + 2mm pillars.
 *
 * Layers:
 *   BOUNDARY   – outer chip rectangle
 *   PILLARS    – array of cylindrical pillar cross-sections
 *   PORTS      – inlet / outlet port cross-sections
 *   ANNOTATION – text labels
 */

import { criticalDiameter } from "./dld";

export interface DxfOptions {
  G: number;
  N: number;
  scale: number;
  label?: string;
  n_rows?: number;
  n_cols?: number;
}

export interface DxfResult {
  filename: string;
  dxf_content: string;
  chip_width_mm: number;
  chip_height_mm: number;
  pillar_diameter_mm: number;
  scale: number;
}

function r(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}

function dxfHeader(units: "mm" | "inch" = "mm"): string {
  const insunit = units === "mm" ? 4 : 1;
  return [
    "  0", "SECTION",
    "  2", "HEADER",
    "  9", "$INSUNITS",
    " 70", String(insunit),
    "  9", "$LUNITS",
    " 70", "2",
    "  9", "$LUPREC",
    " 70", "4",
    "  0", "ENDSEC",
  ].join("\n");
}

function dxfLayersSection(layers: string[]): string {
  const layerDefs = layers.map((name) =>
    [
      "  0", "LAYER",
      "  2", name,
      " 70", "0",
      " 62", "7",
      "  6", "CONTINUOUS",
    ].join("\n")
  );

  return [
    "  0", "SECTION",
    "  2", "TABLES",
    "  0", "TABLE",
    "  2", "LAYER",
    " 70", String(layers.length),
    ...layerDefs,
    "  0", "ENDTAB",
    "  0", "ENDSEC",
  ].join("\n");
}

function dxfCircle(layer: string, cx: number, cy: number, radius: number): string {
  return [
    "  0", "CIRCLE",
    "  8", layer,
    " 10", r(cx),
    " 20", r(cy),
    " 30", "0.0000",
    " 40", r(radius),
  ].join("\n");
}

function dxfLine(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return [
    "  0", "LINE",
    "  8", layer,
    " 10", r(x1),
    " 20", r(y1),
    " 30", "0.0000",
    " 11", r(x2),
    " 21", r(y2),
    " 31", "0.0000",
  ].join("\n");
}

function dxfText(
  layer: string,
  x: number,
  y: number,
  height: number,
  text: string,
  justify = 0,
): string {
  return [
    "  0", "TEXT",
    "  8", layer,
    " 10", r(x),
    " 20", r(y),
    " 30", "0.0000",
    " 40", r(height),
    "  1", text,
    " 72", String(justify),
  ].join("\n");
}

function dxfRectangle(
  layer: string,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  return [
    dxfLine(layer, x, y, x + width, y),
    dxfLine(layer, x + width, y, x + width, y + height),
    dxfLine(layer, x + width, y + height, x, y + height),
    dxfLine(layer, x, y + height, x, y),
  ].join("\n");
}

export function generateDxf(opts: DxfOptions): DxfResult {
  const { G, N, scale, label = "", n_rows = 20, n_cols = 8 } = opts;

  const Dc = criticalDiameter(G, N);

  // All dimensions in mm (converted from µm via scale factor)
  const G_mm = (G * scale) / 1000;
  const pillar_r = 0.4 * G_mm;
  const pillar_d = 2 * pillar_r;
  const pitch = pillar_d + G_mm;

  // Array footprint
  const array_w = n_cols * pitch;
  const array_h = n_rows * pitch;

  // Chip footprint with margins
  const margin_x = 2.5 * pitch;
  const margin_y = 3.0 * pitch;

  // Port geometry
  const port_r = 2.0; // 4mm diameter → tubing fits 3–4mm OD
  const port_clearance = port_r + 1.5;

  const chip_w = array_w + 2 * margin_x;
  const chip_h = array_h + 2 * margin_y + 2 * port_clearance;

  // Pillar array origin (bottom-left corner of first pillar row)
  const arr_x0 = margin_x + pitch / 2;
  const arr_y0 = margin_y + port_clearance + pitch / 2;

  // Port positions
  //  inlet  – top center
  //  outlet A (bump / large cells)  – bottom left
  //  outlet B (zigzag / small cells) – bottom right
  const inlet_x = chip_w / 2;
  const inlet_y = chip_h - port_clearance;
  const outA_x = chip_w * 0.3;
  const outA_y = port_clearance;
  const outB_x = chip_w * 0.7;
  const outB_y = port_clearance;

  // ── Build entities ────────────────────────────────────────────────────────

  const entities: string[] = [];

  // Outer boundary
  entities.push(dxfRectangle("BOUNDARY", 0, 0, chip_w, chip_h));

  // Pillars
  for (let row = 0; row < n_rows; row++) {
    // Each row is staggered by pitch/N relative to the previous
    const row_offset = (row % N) * (pitch / N);
    for (let col = 0; col < n_cols; col++) {
      const cx = arr_x0 + col * pitch + row_offset;
      const cy = arr_y0 + row * pitch;
      // Only draw pillars inside chip boundary (with a small margin)
      if (cx - pillar_r >= 0 && cx + pillar_r <= chip_w) {
        entities.push(dxfCircle("PILLARS", cx, cy, pillar_r));
      }
    }
  }

  // Ports
  entities.push(dxfCircle("PORTS", inlet_x, inlet_y, port_r));
  entities.push(dxfCircle("PORTS", outA_x, outA_y, port_r));
  entities.push(dxfCircle("PORTS", outB_x, outB_y, port_r));

  // Annotation text
  const txt_h = Math.max(0.8, pitch * 0.4);

  const chipLabel = label || `DLD-G${G}-N${N}`;
  entities.push(dxfText("ANNOTATION", chip_w / 2, chip_h + 1.5, txt_h * 1.2, chipLabel, 1));
  entities.push(
    dxfText(
      "ANNOTATION",
      chip_w / 2,
      chip_h + 0.4,
      txt_h * 0.7,
      `G=${G}um N=${N} Dc=${Dc.toFixed(1)}um  Scale=${scale}x  Units=mm`,
      1,
    ),
  );

  // Port labels
  entities.push(dxfText("ANNOTATION", inlet_x, inlet_y + port_r + 0.5, txt_h * 0.6, "INLET", 1));
  entities.push(
    dxfText("ANNOTATION", outA_x, outA_y - port_r - 0.8, txt_h * 0.6, "OUTLET-A (bump)", 1),
  );
  entities.push(
    dxfText("ANNOTATION", outB_x, outB_y - port_r - 0.8, txt_h * 0.6, "OUTLET-B (zigzag)", 1),
  );

  // Flow direction arrows (short lines with arrowhead indicator)
  const arrow_len = pitch * 0.8;
  entities.push(
    dxfLine(
      "ANNOTATION",
      chip_w / 2,
      arr_y0 + array_h + pitch,
      chip_w / 2,
      arr_y0 + array_h + pitch + arrow_len,
    ),
  );

  // ── Assemble DXF ─────────────────────────────────────────────────────────

  const header = dxfHeader("mm");
  const tables = dxfLayersSection(["BOUNDARY", "PILLARS", "PORTS", "ANNOTATION"]);

  const entitiesSection = [
    "  0", "SECTION",
    "  2", "ENTITIES",
    entities.join("\n"),
    "  0", "ENDSEC",
  ].join("\n");

  const dxf = [header, tables, entitiesSection, "  0", "EOF"].join("\n");

  const safe_label = chipLabel.replace(/[^A-Za-z0-9_-]/g, "_");
  const filename = `DLD_mold_${safe_label}_${scale}x.dxf`;

  return {
    filename,
    dxf_content: dxf,
    chip_width_mm: Math.round(chip_w * 100) / 100,
    chip_height_mm: Math.round(chip_h * 100) / 100,
    pillar_diameter_mm: Math.round(pillar_d * 1000) / 1000,
    scale,
  };
}
