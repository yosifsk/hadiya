/* يحسب نسبة التباين ويقترح لونًا مقروءًا لـ --ink-3 */
const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
};
const lum = (h) => {
  const [r, g, b] = hex(h).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const l1 = lum(a);
  const l2 = lum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return +(((hi + 0.05) / (lo + 0.05)).toFixed(2));
};

const bgs = { light: '#ffffff', sand: '#fffdf8' };
console.log('current --ink-3 #7b8a84:');
for (const [name, bg] of Object.entries(bgs)) console.log(`  on ${name} (${bg}): ${ratio('#7b8a84', bg)}`);

console.log('\ncandidates:');
for (const c of ['#7b8a84', '#71817a', '#6b7a74', '#66756e', '#61706a', '#5c6b65', '#586660']) {
  const l = ratio(c, bgs.light);
  const s = ratio(c, bgs.sand);
  console.log(`  ${c}: light=${l} sand=${s} ${l >= 4.5 && s >= 4.5 ? '✔' : ''}`);
}
