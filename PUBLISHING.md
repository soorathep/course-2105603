# Publishing course 2105603

Publish course changes to [soorathep/course-2105603](https://github.com/soorathep/course-2105603).
The [course website](https://soorathep.github.io/course-2105603/teaching/2105603/)
uses GitHub Pages. `soorathep/Test` continues to serve the research website and
legacy course URLs; it is not the destination for new course work.

## Before a change

Inspect `git status --short --branch`, `git remote -v`, recent commits and the
diff, including staged and untracked files. Check the current remote `main`
before choosing a base. Preserve other work and use a separate task workspace
when another actor is active. Do not change an existing remote merely to reuse
an old `Test` checkout.

Read `.github/workflows/pages.yml`, `_config.yml`, `tools/fix_site_links.py` and
the relevant source README. Identify the editable source and generated files.
Use explicit build/export paths within this repository. Do not run a historical
export command that writes into `Test` without reviewing its destination.

## Existing deployment contract

- A push to `main` triggers **Build and deploy course**. Manual dispatch is also
  available. The build uses Jekyll, runs `tools/fix_site_links.py`, checks the
  published size, uploads the site artifact and deploys through GitHub Pages.
- `_config.yml` uses `baseurl: /course-2105603` and
  `url: https://soorathep.github.io`. There is no course `CNAME`.
- The link fixer adds the project prefix and preserves cross-site resources.
  The 2105603 exit form is served on the course site following the relay's
  November 2026 origin allowlist update. Legacy forms and QR URLs remain
  available. Preserve backend destinations and inspect origin authorization
  when changing links, imports or forms.
- Large downloads excluded from the Pages artifact retain their existing Test
  Release URLs. The release assets remain dependencies, even though new course
  source work belongs here.
- Existing `skhgroup.net` pages and media must remain available. Changes that
  remove them or add redirects require an impact review and owner approval.

## Validation and publication

1. Review the scoped diff and stage explicit files. Check that private data,
   credentials, build caches and unrelated work are excluded.
2. Run the checks appropriate to the change. For a Lab, exercise its guided
   steps, units, numerical results, plots, imports and save/restore behavior.
   For slides or documents, inspect equations, links and rendered output.
3. Check affected links on the project-site path. For media, check MIME type,
   byte-range support and playback; for downloads, follow redirects and verify
   the downloaded payload when it changes. Check both old and new URLs for
   compatibility changes. Check forms without sending live student submissions.
4. Commit with a descriptive English message. Recheck remote `main` before a
   normal fast-forward push; if it advanced, reconcile in the task branch and
   repeat affected checks. Never overwrite another actor's content.
5. Wait for the Pages workflow and deployment to succeed for the exact pushed
   SHA. Inspect failures rather than treating a successful push as deployment.
6. Open or fetch the actual published URLs, check representative dependencies
   and changed student interactions, and confirm the deployed version. A
   successful workflow alone does not establish that all links work.

The completion report identifies the repository, commit, workflow result,
published URL, scope of validation and any broken links or remaining issues.
Keep detailed QA receipts locally outside the public Pages artifact. Do not
claim exhaustive link validation when only a sample was checked.

Annual archival preparation is separate from routine publishing. Follow
[ARCHIVING.md](ARCHIVING.md); a Pages deployment does not authorize a Zenodo
publication or removal of legacy materials.
