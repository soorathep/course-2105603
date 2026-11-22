# Exit tickets and feedback (anonymous, stored on GitHub)

Students scan the QR code on the exit-ticket slide and open
`teaching/2105603/slides-2027/exit.html?s=<session>`. The page posts the answers
to a Cloudflare Worker (`worker.js`). The Worker holds a GitHub token and saves
each response as one JSON file in a private repository:

    responses/2105603/s01/2026-11-15-1a2b3c4d.json

No name, student ID, e-mail or IP address is stored. The page and the Worker
both accept only these answers: session, in class or on my own, exit ticket,
pace, confidence 1-5, lab worked, still unclear, one change. In the last session
(2105603 Session 7) the form adds an optional overview of the whole post-midterm
half: overall pace, quality of the slides/narration/captions/notes (1-5) with a
comment, quality of the labs (1-5), whether the labs worked reliably, a lab comment
and one change for next year. These `course_*` fields are saved only when answered,
and only for the session named in `WHOLE_AT` (2105603: Session 7) or else a course's
last session. The Worker ignores unknown fields and still saves the rest.

## One-time setup

1. Create a private repository, for example `soorathep/course-feedback`.
2. Create a fine-grained GitHub token for that repository only, permission
   "Contents: Read and write".
3. In Cloudflare (free plan), create a Worker, paste `worker.js`, deploy.
   Under Settings > Variables add `REPO` = `soorathep/course-feedback` and the
   secret `GITHUB_TOKEN`.
4. Put the Worker address in `RELAY_URL` at the bottom of `exit.html`, render
   and publish.

## Current deployment

- Repository: `soorathep/course-feedback` (private)
- Worker: `https://course-feedback-relay.ecs-thailand-election.workers.dev/`
  (Cloudflare account soorathep.k; token expires about November 2027)
- Allowed form origins: `https://soorathep.github.io`, `https://www.skhgroup.net`
  and `https://skhgroup.net`. Keep all three in `worker.js` when restoring the
  deployed service so both the dedicated course site and legacy forms work.
- The relay is deployed separately from GitHub Pages. Publishing this repository
  does not redeploy the Worker or move its private response repository.

## Courses using this relay

- 2105603, 7 sessions: `teaching/2105603/slides-2027/exit.html?s=<n>`
- 2105603P, sessions P1-P7 before the midterm: the same page with `?p=<n>` (added 22 Nov 2026).
  The page sends the whole-half answers at P7 with `course_scope` = `pre-midterm`, and at
  2105603 Session 7 with `post-midterm`; both send `edition` = `2027`.

`worker.js` here is a copy of the deployed Worker as of 22 Nov 2026. Edit the deployed code
line by line in Cloudflare; do not paste this file over it without comparing first.
- 2105315, 14 sessions: `teaching/2105315/slides/exit.html` (added 15 Nov 2026; the deployed
  Worker must carry the `COURSES` line from this `worker.js`, or 2105315 answers are refused as "Unknown course.")

## Reading the answers

Clone the private repository, then run `python3 collect.py` inside it (copy the
script there once). It writes one CSV per session under `summary/`, readable in
Excel with Thai text intact.
