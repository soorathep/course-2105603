// Completeness for the "check AI-written code" steps (Labs 02, 05, 10, 12, 13).
// A check can only agree on the outputs a student entered. The step is complete only when every output
// and the specification, tool, prompt and code have been entered.
const $ = (id) => document.getElementById(id);
const TEXT_REQ = ['ai-spec', 'ai-tool', 'ai-prompt', 'ai-codetext'];
const label = (id) => {
  const l = document.querySelector(`label[for="${id}"]`);
  return (l ? l.textContent : id).replace(/\s+/g, ' ').trim();
};
export function missing(outIds) {
  const outs = outIds.filter((id) => $(id) && $(id).value.trim() === '');
  const texts = TEXT_REQ.filter((id) => $(id) && $(id).value.trim() === '');
  return { outputs: outs.map(label), texts: texts.map(label) };
}
export function statusLine(nCode, nBad, outIds) {
  const m = missing(outIds), total = outIds.length, entered = total - m.outputs.length;
  if (nCode === 0) {
    return `Incomplete: no outputs entered yet, so nothing has been checked. Enter all ${total} outputs from your code: ${m.outputs.join('; ')}.`;
  }
  const head = nBad ? `${nBad} of ${nCode} checks disagree with the lab. Find the cause in the code, fix it, rerun, and enter the new outputs.`
    : `All ${nCode} checks on the outputs you entered agree.`;
  const gaps = [];
  if (m.outputs.length) gaps.push(`Missing outputs (${m.outputs.length} of ${total}): ${m.outputs.join('; ')}.`);
  if (m.texts.length) gaps.push(`Still empty: ${m.texts.join('; ')}.`);
  if (gaps.length) return `${head} The step is incomplete. ${gaps.join(' ')} Complete them before you save and submit.`;
  return nBad ? head : `${head} All ${entered} outputs are entered. Now explain what the checks do not establish.`;
}
export function incompleteNote(outIds) {
  const m = missing(outIds);
  return m.outputs.length ? ` The step is incomplete until all ${outIds.length} outputs are entered (missing: ${m.outputs.join('; ')}).` : '';
}
export function completeness(outIds) { const m = missing(outIds); return { complete: !m.outputs.length && !m.texts.length, ...m }; }
