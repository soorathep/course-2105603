// Cloudflare Worker: anonymous exit tickets and feedback -> one JSON file per response
// in a private GitHub repository. The browser never sees the GitHub token.
//
// Settings (Cloudflare dashboard > Worker > Settings > Variables):
//   GITHUB_TOKEN  secret: fine-grained token, "Contents: Read and write" on REPO only
//   REPO          e.g. soorathep/course-feedback   (private)
//   BRANCH        optional, default main
//
// No name, ID, e-mail or IP address is stored.

const ALLOWED_ORIGINS = ['https://www.skhgroup.net', 'https://skhgroup.net', 'https://soorathep.github.io'];
const COURSES = { '2105603': 8, '2105315': 15, '2105601': 8, '2105620': 15, '2105623': 15, '2105717': 8, '2182209': 8 };        // course code -> number of sessions
const CHOICES = {
  mode: ['In class', 'On my own'],
  pace: ['Too slow', 'About right', 'Too fast'],
  confidence: ['1', '2', '3', '4', '5'],
  lab: ['Yes', 'Partly', 'No, I need help', 'Not used'],
  // Whole-course questions, asked only on a course's last session; optional.
  course_overall: ['1', '2', '3', '4', '5'],
  course_skill: ['1', '2', '3', '4', '5'],
  course_slides: ['1', '2', '3', '4', '5'],
  course_labs: ['1', '2', '3', '4', '5'],
  course_workload: ['Too light', 'About right', 'Too heavy'],
  course_pace: ['Too slow', 'About right', 'Too fast'],
  course_labs_work: ['Always', 'Mostly', 'Often not'],
};
// Session that carries the whole-course questions when it is not the course's last allowed session.
// 2105603 (2027): Session 7 closes the post-midterm half.
const WHOLE_AT = { '2105603': 7 };
const TEXT_LIMIT = 3000;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function reply(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors(origin) } });
}

export function clean(d) {
  if (!d || typeof d !== 'object') throw new Error('Empty submission.');
  if (d.website) throw new Error('Rejected.');                       // honeypot field
  const course = String(d.course || '');
  if (!COURSES[course]) throw new Error('Unknown course.');
  const session = Number(d.session);
  if (!Number.isInteger(session) || session < 1 || session > COURSES[course]) throw new Error('Unknown session.');
  const text = (v) => (typeof v === 'string' ? v.trim().slice(0, TEXT_LIMIT) : '');
  const pick = (k) => (CHOICES[k].includes(d[k]) ? d[k] : '');
  const out = {
    course, session,
    mode: pick('mode'), exit_ticket: text(d.exit_ticket),
    pace: pick('pace'), confidence: pick('confidence'), lab: pick('lab'),
    unclear: text(d.unclear), change: text(d.change),
  };
  if (!out.exit_ticket) throw new Error('The exit-ticket answer is empty.');
  if (session === (WHOLE_AT[course] || COURSES[course])) {          // whole-course answers, kept only when given
    const whole = { course_overall: pick('course_overall'), course_skill: pick('course_skill'), course_workload: pick('course_workload'),
      course_slides: pick('course_slides'), course_labs: pick('course_labs'),
      course_pace: pick('course_pace'), course_labs_work: pick('course_labs_work'),
      course_slides_comment: text(d.course_slides_comment), course_labs_comment: text(d.course_labs_comment),
      course_best: text(d.course_best), course_weak: text(d.course_weak), course_improve: text(d.course_improve) };
    for (const [k, v] of Object.entries(whole)) if (v) out[k] = v;
  }
  return out;
}

function base64Utf8(s) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (request.method !== 'POST') return reply({ error: 'POST only' }, 405, origin);
    if (!ALLOWED_ORIGINS.includes(origin)) return reply({ error: 'Forbidden' }, 403, origin);
    let record;
    try {
      const raw = await request.text();
      if (raw.length > 20000) throw new Error('Too long.');
      record = clean(JSON.parse(raw));
    } catch (e) {
      return reply({ error: e.message }, 400, origin);
    }
    const now = new Date();
    record.received = now.toISOString();
    const day = record.received.slice(0, 10);
    const id = crypto.randomUUID().slice(0, 8);
    const path = `responses/${record.course}/s${String(record.session).padStart(2, '0')}/${day}-${id}.json`;
    const res = await fetch(`https://api.github.com/repos/${env.REPO}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'skh-course-feedback',
      },
      body: JSON.stringify({ message: `Response ${record.course} S${record.session}`, content: base64Utf8(JSON.stringify(record, null, 2) + '\n'), branch: env.BRANCH || 'main' }),
    });
    if (!res.ok) return reply({ error: 'Could not save. Please try again.' }, 502, origin);
    return reply({ ok: true }, 201, origin);
  },
};
