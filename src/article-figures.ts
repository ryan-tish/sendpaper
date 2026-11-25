// Inline SVG figures for articles (2026-11-24, Ryan's feedback on /certified-mail-labels: "include a photo of what
// the label is… what all the different sections are… label them"). These are OUR simplified drawings, not USPS's
// images: no rights question, labels stay crisp at any width, and the numbered callouts match the list under them.
// The barcodes are deliberately meaningless bar patterns (not an encoding) and every number is zeros, so a drawing
// can never be printed and used as a real label. Colours are fixed (it's a picture of paper), so it reads the same in
// dark mode. Text inside the SVG is decorative at phone widths; the meaning lives in the alt text, the caption and
// the numbered list in the article.

const G = "#0b8a4f"; // form green
const INK = "#1d2a22";
const MUTED = "#6b7a71";
const FONT = `font-family="Inter, 'Helvetica Neue', Arial, sans-serif"`;

// A fixed, meaningless bar pattern.
const PATTERN = [2, 1, 3, 1, 1, 2, 4, 1, 2, 1, 1, 3, 2, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2, 4, 1, 1];
function bars(from: number, to: number, draw: (at: number, size: number) => string) {
  let out = "", at = from, i = 0;
  while (at < to) {
    const bar = PATTERN[i % PATTERN.length]! * 1.3, gap = PATTERN[(i + 7) % PATTERN.length]! * 1.1;
    if (at + bar > to) break;
    out += draw(at, bar);
    at += bar + gap;
    i++;
  }
  return out;
}

const callout = (n: number, x: number, y: number) =>
  `<g><circle cx="${x}" cy="${y}" r="14" fill="#111" stroke="#fff" stroke-width="2.5"/><text x="${x}" y="${y + 5.5}" text-anchor="middle" font-size="15" font-weight="700" fill="#fff">${n}</text></g>`;

const feeRow = (y: number, label: string, opts: { box?: boolean; bold?: boolean } = {}) =>
  `${opts.box ? `<rect x="196" y="${y - 8}" width="8" height="8" fill="#fff" stroke="${INK}" stroke-width="0.8"/>` : ""}
   <text x="${opts.box ? 210 : 196}" y="${y}" font-size="${opts.box ? 9.5 : 10.5}" ${opts.bold ? 'font-weight="700"' : ""} fill="${INK}">${label}</text>
   <text x="410" y="${y}" font-size="10.5" fill="${INK}">$</text><line x1="420" y1="${y + 1}" x2="468" y2="${y + 1}" stroke="${MUTED}" stroke-width="0.7"/>`;

const ZEROS = "0000 0000 0000 0000 0000 00";

export const PS3800_SVG = `<svg viewBox="0 0 680 340" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-labelledby="ps3800-t">
<title id="ps3800-t">Labeled drawing of PS Form 3800, the Certified Mail receipt</title>
<rect x="1" y="1" width="678" height="338" rx="6" fill="#fff" stroke="#c9d3cd"/>
<text transform="translate(20 170) rotate(-90)" text-anchor="middle" font-size="10.5" letter-spacing="1.5" fill="${MUTED}">${ZEROS}</text>
<rect x="32" y="16" width="64" height="308" fill="${G}"/>
<text transform="translate(40.5 170) rotate(-90)" text-anchor="middle" font-size="6" font-weight="700" fill="#fff">PLACE STICKER AT TOP OF ENVELOPE TO THE RIGHT</text>
<text transform="translate(48.5 170) rotate(-90)" text-anchor="middle" font-size="6" font-weight="700" fill="#fff">OF THE RETURN ADDRESS, FOLD AT DOTTED LINE</text>
<line x1="54" y1="19" x2="54" y2="321" stroke="#fff" stroke-width="1.1" stroke-dasharray="4 3"/>
<text transform="translate(84 178) rotate(-90)" text-anchor="middle" font-size="22" font-weight="800" letter-spacing="1" fill="#fff">CERTIFIED MAIL</text>
${bars(58, 316, (y, h) => `<rect x="104" y="${y.toFixed(1)}" width="42" height="${h.toFixed(1)}" fill="#111"/>`)}
<line x1="156" y1="10" x2="156" y2="330" stroke="#9aa5a0" stroke-width="1.2" stroke-dasharray="6 4"/>
<text transform="translate(172 170) rotate(-90)" text-anchor="middle" font-size="10.5" letter-spacing="1.5" fill="${MUTED}">${ZEROS}</text>
<rect x="186" y="16" width="480" height="58" fill="${G}"/>
<text x="198" y="34" font-size="11.5" fill="#fff">U.S. Postal Service™</text>
<text x="198" y="56" font-size="20" font-weight="800" fill="#fff">CERTIFIED MAIL® RECEIPT</text>
<text x="198" y="69" font-size="10" font-style="italic" font-weight="600" fill="#fff">Domestic Mail Only</text>
<rect x="186" y="78" width="480" height="16" fill="${G}"/>
<text x="198" y="90" font-size="9.5" font-weight="700" fill="#fff">For delivery information, visit our website at www.usps.com®.</text>
<rect x="186" y="98" width="320" height="150" fill="none" stroke="${G}"/>
${feeRow(114, "Certified Mail Fee")}
<text x="196" y="131" font-size="9.5" font-weight="700" fill="${INK}">Extra Services &amp; Fees <tspan font-weight="400">(check box, add fee as appropriate)</tspan></text>
${feeRow(146, "Return Receipt (hardcopy)", { box: true })}
${feeRow(159, "Return Receipt (electronic)", { box: true })}
${feeRow(172, "Certified Mail Restricted Delivery", { box: true })}
${feeRow(185, "Adult Signature Required", { box: true })}
${feeRow(198, "Adult Signature Restricted Delivery", { box: true })}
${feeRow(220, "Postage")}
${feeRow(240, "Total Postage and Fees", { bold: true })}
<rect x="516" y="98" width="150" height="150" fill="none" stroke="${G}"/>
<circle cx="591" cy="176" r="46" fill="none" stroke="#a9bfb2" stroke-width="1.2" stroke-dasharray="5 4"/>
<text x="591" y="173" text-anchor="middle" font-size="11" fill="${MUTED}">Postmark</text>
<text x="591" y="187" text-anchor="middle" font-size="11" fill="${MUTED}">Here</text>
<rect x="186" y="252" width="480" height="62" fill="none" stroke="${G}"/>
<text x="196" y="266" font-size="9.5" fill="${INK}">Sent To</text><line x1="240" y1="268" x2="600" y2="268" stroke="${MUTED}" stroke-width="0.7"/>
<text x="196" y="285" font-size="9.5" fill="${INK}">Street and Apt. No., or PO Box No.</text><line x1="368" y1="287" x2="600" y2="287" stroke="${MUTED}" stroke-width="0.7"/>
<text x="196" y="304" font-size="9.5" fill="${INK}">City, State, ZIP+4®</text><line x1="296" y1="306" x2="600" y2="306" stroke="${MUTED}" stroke-width="0.7"/>
<rect x="186" y="318" width="480" height="14" fill="${G}"/>
<text x="194" y="328.5" font-size="8.5" font-weight="700" fill="#fff">PS Form 3800, January 2023</text>
<text x="658" y="328.5" text-anchor="end" font-size="8.5" font-weight="700" fill="#fff">See Reverse for Instructions</text>
${callout(1, 76, 36)}${callout(2, 125, 36)}${callout(3, 644, 45)}${callout(4, 489, 114)}${callout(5, 648, 114)}${callout(6, 636, 285)}
</svg>`;

export const ENVELOPE_SVG = `<svg viewBox="0 0 680 300" xmlns="http://www.w3.org/2000/svg" ${FONT} role="img" aria-labelledby="env-t">
<title id="env-t">Drawing of a letter envelope showing where the Certified Mail sticker goes</title>
<rect x="20" y="20" width="640" height="260" rx="4" fill="#fbfaf6" stroke="#c9d3cd" stroke-width="1.5"/>
<text x="44" y="52" font-size="13" fill="${INK}">YOUR NAME</text>
<text x="44" y="70" font-size="13" fill="${INK}">YOUR STREET ADDRESS</text>
<text x="44" y="88" font-size="13" fill="${INK}">CITY ST ZIP</text>
<rect x="268" y="34" width="232" height="72" fill="#fff" stroke="#c9d3cd"/>
<rect x="268" y="34" width="232" height="22" fill="${G}"/>
<text x="384" y="50" text-anchor="middle" font-size="14" font-weight="800" letter-spacing="1" fill="#fff">CERTIFIED MAIL</text>
${bars(278, 490, (x, w) => `<rect x="${x.toFixed(1)}" y="60" width="${w.toFixed(1)}" height="28" fill="#111"/>`)}
<text x="384" y="101" text-anchor="middle" font-size="9.5" letter-spacing="1.5" fill="${MUTED}">${ZEROS}</text>
<rect x="584" y="34" width="56" height="64" fill="#f1efe8" stroke="#b9b4a5" stroke-dasharray="3 3"/>
<text x="612" y="70" text-anchor="middle" font-size="9.5" fill="${MUTED}">POSTAGE</text>
<text x="268" y="176" font-size="15" fill="${INK}">RECIPIENT NAME</text>
<text x="268" y="198" font-size="15" fill="${INK}">STREET ADDRESS</text>
<text x="268" y="220" font-size="15" fill="${INK}">CITY ST ZIP+4</text>
${callout(1, 268, 34)}
<path d="M384 116 L384 150" stroke="${INK}" stroke-width="1.4" stroke-dasharray="3 3"/>
<path d="M378 144 L384 154 L390 144" fill="none" stroke="${INK}" stroke-width="1.4"/>
</svg>`;
