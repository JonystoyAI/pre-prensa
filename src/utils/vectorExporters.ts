import { DocumentDimensions, InkColor, VectorElement } from '../types/prepress';

const MM_TO_PT = 2.83465;

// Generate Level 3 Encapsulated PostScript (.eps) file
export function exportToEps(
  doc: DocumentDimensions,
  elements: VectorElement[],
  inks: InkColor[]
): string {
  const widthPt = (doc.widthMm * MM_TO_PT).toFixed(2);
  const heightPt = (doc.heightMm * MM_TO_PT).toFixed(2);

  const header = `%!PS-Adobe-3.0 EPSF-3.0
%%Creator: PressForge Studio CAD Pre-Press
%%Title: ${doc.name}
%%Pages: 1
%%BoundingBox: 0 0 ${Math.ceil(doc.widthMm * MM_TO_PT)} ${Math.ceil(doc.heightMm * MM_TO_PT)}
%%HiResBoundingBox: 0 0 ${widthPt} ${heightPt}
%%DocumentProcessColors: Cyan Magenta Yellow Black
%%DocumentCustomColors: ${inks.filter((i) => i.isSpot).map((i) => `(${i.name})`).join(' ')}
%%CMYKCustomColor: ${inks.filter((i) => i.isSpot).map((i) => `${(i.cmyk.c/100).toFixed(2)} ${(i.cmyk.m/100).toFixed(2)} ${(i.cmyk.y/100).toFixed(2)} ${(i.cmyk.k/100).toFixed(2)} (${i.name})`).join('\n%%+ ')}
%%EndComments

gsave
% Setup coordinate system (EPS origin bottom-left, units in points)
/mm { 2.83465 mul } def

`;

  const bodyParts: string[] = [];

  for (const el of elements) {
    if (el.visible === false) continue;
    const targetInk = inks.find((i) => i.id === el.inkId) || inks[0];
    if (!targetInk || !targetInk.visible) continue;

    // Convert CMYK
    const c = (targetInk.cmyk.c / 100).toFixed(3);
    const m = (targetInk.cmyk.m / 100).toFixed(3);
    const y = (targetInk.cmyk.y / 100).toFixed(3);
    const k = (targetInk.cmyk.k / 100).toFixed(3);

    const isFill = el.fill !== 'none';
    const isStroke = el.stroke !== 'none';
    const strokeWidthPt = (el.strokeWidthMm * MM_TO_PT).toFixed(2);

    // In PostScript, Y goes from bottom to top
    const psY = (doc.heightMm - el.y - el.height) * MM_TO_PT;
    const psX = el.x * MM_TO_PT;
    const psW = el.width * MM_TO_PT;
    const psH = el.height * MM_TO_PT;

    if (el.type === 'rect') {
      bodyParts.push(`% Element: ${el.name || 'Rect'} - Ink: ${targetInk.name}`);
      bodyParts.push(`${c} ${m} ${y} ${k} setcmykcolor`);
      bodyParts.push(`newpath ${psX.toFixed(2)} ${psY.toFixed(2)} ${psW.toFixed(2)} ${psH.toFixed(2)} rectfill`);
      if (isStroke) {
        bodyParts.push(`${strokeWidthPt} setlinewidth`);
        bodyParts.push(`newpath ${psX.toFixed(2)} ${psY.toFixed(2)} ${psW.toFixed(2)} ${psH.toFixed(2)} rectstroke`);
      }
    } else if (el.type === 'circle') {
      const cx = (el.x + el.width / 2) * MM_TO_PT;
      const cy = (doc.heightMm - (el.y + el.height / 2)) * MM_TO_PT;
      const r = (el.width / 2) * MM_TO_PT;
      bodyParts.push(`% Element: Circle - Ink: ${targetInk.name}`);
      bodyParts.push(`${c} ${m} ${y} ${k} setcmykcolor`);
      bodyParts.push(`newpath ${cx.toFixed(2)} ${cy.toFixed(2)} ${r.toFixed(2)} 0 360 arc`);
      if (isFill) bodyParts.push('fill');
      if (isStroke) {
        bodyParts.push(`${strokeWidthPt} setlinewidth stroke`);
      }
    } else if (el.type === 'line') {
      const psY1 = (doc.heightMm - el.y) * MM_TO_PT;
      const psY2 = (doc.heightMm - (el.y + el.height)) * MM_TO_PT;
      bodyParts.push(`% Element: Line - Ink: ${targetInk.name}`);
      bodyParts.push(`${c} ${m} ${y} ${k} setcmykcolor`);
      bodyParts.push(`${strokeWidthPt} setlinewidth`);
      bodyParts.push(`newpath ${psX.toFixed(2)} ${psY1.toFixed(2)} moveto ${(psX + psW).toFixed(2)} ${psY2.toFixed(2)} lineto stroke`);
    } else if (el.type === 'path' && el.pathData) {
      bodyParts.push(`% Element: Vector Path - Ink: ${targetInk.name}`);
      bodyParts.push(`${c} ${m} ${y} ${k} setcmykcolor`);
      bodyParts.push('newpath');

      // Convert SVG path commands to PostScript operators
      const tokens = el.pathData.split(/(?=[MmLlHhVvCcSsQqTtAaZz])/);
      for (const tok of tokens) {
        const cmd = tok[0];
        const args = tok.substring(1).trim().split(/[\s,]+/).map(parseFloat).filter((v) => !isNaN(v));

        if (cmd === 'M' && args.length >= 2) {
          const x = args[0] * MM_TO_PT;
          const y = (doc.heightMm - args[1]) * MM_TO_PT;
          bodyParts.push(`${x.toFixed(2)} ${y.toFixed(2)} moveto`);
        } else if (cmd === 'L' && args.length >= 2) {
          const x = args[0] * MM_TO_PT;
          const y = (doc.heightMm - args[1]) * MM_TO_PT;
          bodyParts.push(`${x.toFixed(2)} ${y.toFixed(2)} lineto`);
        } else if (cmd === 'C' && args.length >= 6) {
          const x1 = args[0] * MM_TO_PT;
          const y1 = (doc.heightMm - args[1]) * MM_TO_PT;
          const x2 = args[2] * MM_TO_PT;
          const y2 = (doc.heightMm - args[3]) * MM_TO_PT;
          const x3 = args[4] * MM_TO_PT;
          const y3 = (doc.heightMm - args[5]) * MM_TO_PT;
          bodyParts.push(`${x1.toFixed(2)} ${y1.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)} ${x3.toFixed(2)} ${y3.toFixed(2)} curveto`);
        } else if (cmd === 'Z' || cmd === 'z') {
          bodyParts.push('closepath');
        }
      }

      if (isFill) bodyParts.push('fill');
      if (isStroke) {
        bodyParts.push(`${strokeWidthPt} setlinewidth stroke`);
      }
    }
  }

  const footer = `
grestore
showpage
%%EOF
`;

  return header + bodyParts.join('\n') + footer;
}

// Generate Adobe Illustrator (.ai) compatible file
export function exportToAi(
  doc: DocumentDimensions,
  elements: VectorElement[],
  inks: InkColor[]
): string {
  // Adobe Illustrator files retain EPS 3.0 / AI 8 format markers with private dictionary
  const eps = exportToEps(doc, elements, inks);
  return eps.replace(
    '%%Creator: PressForge Studio CAD Pre-Press',
    '%%Creator: Adobe Illustrator(R) 8.0 & PressForge Studio Prepress'
  );
}

// Generate PressForge native JSON Project Backup
export function exportToJsonProject(
  doc: DocumentDimensions,
  elements: VectorElement[],
  inks: InkColor[],
  printSystem: string
): string {
  const project = {
    version: '1.0.0',
    app: 'PressForge Studio',
    exportedAt: new Date().toISOString(),
    document: doc,
    printSystem,
    inks,
    elements,
  };
  return JSON.stringify(project, null, 2);
}
