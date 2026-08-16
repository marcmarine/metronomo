import { TEMPOS, WEIGHT_BOTTOM, WEIGHT_TOP } from "./tempo";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Renders the tempo scale's tick marks (alternating left/right) plus its centre line. */
export function renderScaleMarks(group: SVGGElement): void {
  for (let i = 0; i < TEMPOS.length; i++) {
    const y = WEIGHT_TOP + (i * (WEIGHT_BOTTOM - WEIGHT_TOP)) / (TEMPOS.length - 1);
    const left = i % 2 === 0;

    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("class", "metronome__mark");
    line.setAttribute("x1", left ? "950.5" : "999.4");
    line.setAttribute("y1", y.toFixed(1));
    line.setAttribute("x2", left ? "999.4" : "1048.2");
    line.setAttribute("y2", y.toFixed(1));
    group.appendChild(line);
  }

  const centerLine = document.createElementNS(SVG_NS, "line");
  centerLine.setAttribute("class", "metronome__mark");
  centerLine.setAttribute("x1", "999.4");
  centerLine.setAttribute("y1", "380.4");
  centerLine.setAttribute("x2", "999.4");
  centerLine.setAttribute("y2", "854.4");
  group.appendChild(centerLine);
}
