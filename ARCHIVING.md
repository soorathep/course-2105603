# Annual course archive for Zenodo

Prepare an academic-year snapshot when the owner requests it. The owner will
specify the timing; no recurring automation is scheduled. Preparation produces
a private candidate and review report. It does not authorize Zenodo publication,
a GitHub release connected to Zenodo, or removal of old course materials.

## Freeze the scope and provenance

Record the academic year, title, version, preparation date, repository URL,
exact source commit, preparer and build environment. Preserve uncommitted work
separately; never discard it to obtain a clean snapshot. Identify which course
edition and supplementary materials belong in this year's snapshot.

Use an explicit, reviewed inclusion inventory. Do not upload the whole checkout
blindly: migrated shared assets and `_data` can include unrelated site content.
Do not include `.git`, secrets, live databases, private reports or build caches.
Prepare the candidate outside the public site, for example in the ignored
`.archive-preparation/` directory or a separate private local folder. This
Zenodo process does not authorize NFS migration, cleanup or system changes.

## Collect a usable snapshot

Include the files necessary to read and use the selected course edition:

- Built site pages, slides, PDFs, worksheets, publicly released solutions and
  Lab code with the required shared scripts, styles, fonts and example data.
- Editable course sources, figure-generation code, build instructions and
  recorded dependency versions where available. Record source gaps explicitly.
- Rights-cleared videos, narration, captions/transcripts and downloadable
  examples, spreadsheets, JSON cases, toolkits and offline packages.
- A top-level README describing the contents, entry points, course sequence,
  local serving/build instructions, network dependencies and known limitations.
- Metadata, credits, a rights inventory, provenance, a complete file inventory
  and SHA-256 verification files.

Existing Test Release downloads and other remote media are part of the dependency
review. Record their original URL, local archive path, byte size, SHA-256 and
rights decision. Preserve rights-cleared payloads, not just links, when they are
needed for a complete snapshot. Do not claim an archive is complete if a required
payload is missing. Where redistribution is prohibited, obtain permission or
agree on the documented omission with the owner before publication.

External feedback/attendance services are documented dependencies. Include the
public question text and safe configuration or source where permitted, with no
credentials. Do not package live student responses or imply the archived static
site includes a functioning response database.

## Privacy and rights review

Review filenames, page text, PDFs, workbook sheets/comments, embedded media,
document properties and example/JSON data for names, student IDs, email addresses,
grades, attendance and free-text feedback. Exclude raw responses and private
reports. Anonymization requires checking re-identification risk; removing a name
alone is not sufficient. Check for API keys, tokens and connection strings.

For each redistributed third-party item, record its creator, source, license or
permission evidence, attribution and any restrictions. Include required license
notices for bundled software, libraries and fonts. Check figures, textbook
extracts, photographs and voice/media rights. Do not infer rights from public
availability or apply a blanket course license to third-party material. Resolve
uncertain rights before publication and record exclusions without deleting the
working originals. Do not include unpublished assessment answers.

## Metadata and checksums

Prepare metadata for owner review: title, academic year, version, creators and
affiliations, verified ORCIDs if supplied, description, language, keywords,
resource type, related course/repository URLs, funding if applicable and the
approved license or file-specific rights statement. Credit human contributors,
third-party materials and relevant production tools. Do not invent identifiers,
license grants or a DOI.

Generate a sorted `SHA256SUMS` for every payload file using relative paths,
excluding the checksum file itself. Include byte sizes in a separate inventory.
Verify all hashes after copying the candidate. Package the reviewed files and
compute a separate SHA-256 for the final archive file. Keep the package checksum
beside the archive and in the review receipt. Recompute after any modification.

Test the unpacked archive: open representative slides and documents, run the
selected Labs through a local server, check links and play sampled media.
Report any network-only features and missing dependencies. Checksums establish
file integrity, not privacy, rights clearance or functional completeness.

## Approval, publication and verification

Present the owner with the exact candidate version, source commit, inclusion and
exclusion inventory, privacy/rights findings, metadata, credits, validation
results, archive size and final SHA-256. Obtain explicit approval for that
candidate before uploading or publishing it to Zenodo. Do not enable automatic
GitHub-to-Zenodo publication as part of routine course deployment.

After approved publication, verify the record, version-specific DOI, metadata,
file list and downloaded archive checksum. Only then add the version-specific
DOI and academic-year label to a course archive index. Do not substitute the
concept DOI for the version-specific snapshot link. Record the Zenodo record URL,
DOI, source commit, checksums and verification date in the publication receipt.

Keep current and legacy materials available. Any removal or redirect requires
a separate impact review and owner approval. A published Zenodo record does not
authorize cleanup. No Zenodo publication is performed by this policy update.
