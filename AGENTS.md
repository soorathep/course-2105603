# Course 2105603 agent instructions

These instructions supplement the account's lab standards.

## Inspect before editing

- The canonical course repository is `soorathep/course-2105603`. Publish course
  changes here, never to `soorathep/Test`.
- Inspect the working tree, branch, remotes, recent commits and
  `.github/workflows/pages.yml` before changes. Read `.gitignore` before staging.
- Preserve staged, unstaged and untracked work. Do not reset, discard, force push,
  change remotes or copy another actor's checkout over this one.
- Use a separate actor/task branch and workspace for concurrent work. Record the
  machine, actor, task and base commit in a local handoff outside the public site.
- `_teaching-src/2105603/` contains editable source; `teaching/2105603/` contains
  student-facing output. Inspect each material's build instructions. Older
  scripts may default to exporting to `Test`; use an explicit destination in
  this repository and review both source and generated changes.

## Preserve student access

- Keep existing content, paths, anchors, videos, downloads, examples and saved
  case/JSON behavior working. Retain the `/course-2105603` project-site prefix.
- Existing `skhgroup.net` pages and media remain compatibility endpoints. Do not
  remove them or introduce redirects without an impact review and owner approval.
- Do not copy the research site's `CNAME` or change its domain configuration.
- Preserve existing Test Release download URLs and cross-site resources unless
  a verified replacement is authorized. A successful HEAD request alone does
  not verify the complete download.
- Preserve feedback and attendance forms and their backend destinations. The
  2027 exit form is served on this course site after the relay's origin allowlist
  update; legacy forms remain available. Check origin authorization before any
  further change. The separate ChatGPT Sites service is not migrated here.
- Do not submit test answers to live student forms or access raw responses as
  part of routine site QA. Keep student data, credentials and private reports
  out of Git, Pages artifacts and public archives.

## Validate and report

Follow [PUBLISHING.md](PUBLISHING.md). Test the changed student flow, check links
and media as appropriate, then verify that GitHub Pages deploys the exact commit.
Report the change, repository, commit, published URL, checks and any broken links
or unresolved issues. Distinguish representative checks from a complete audit.

## Annual archive

Follow [ARCHIVING.md](ARCHIVING.md). The owner will specify when to prepare the
academic-year snapshot; do not schedule automatic preparation. Prepare a reviewed
candidate with metadata, credits, rights decisions and SHA-256 checksums. Do not
publish it to Zenodo or remove old materials without explicit owner approval.
Add a version-specific DOI link only after publication and verification.
