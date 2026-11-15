# Full notebook execution check

`notebook_runtime.py` runs the six standalone teaching notebooks from their
published URLs. A JSON manifest records the source commit and expected SHA-256
for each notebook and `vlekit.zip`. It refuses changed downloads, a preinstalled
`vlekit`, and an existing output directory.

Use the account's M2 compute queue for execution. Prepare an isolated scratch
Python environment with `nbclient`, `nbformat`, `nbconvert`, `ipykernel`,
NumPy 2 or later, SciPy, Matplotlib, `thermo` and `chemicals`. Register a
scratch-local `courseqa` kernelspec using that environment's absolute interpreter.
Use the inline Matplotlib backend so plots appear in the saved notebook.

Run the driver with that absolute interpreter and explicit arguments:

```
<absolute-python> tools/notebook_runtime.py --manifest <manifest.json> --output <new-scratch-folder>
```

Before publishing a notebook fix, add `--source-dir <candidate-files-folder>`.
Candidate bytes must match the manifest hashes. The toolkit is still fetched
from its actual published URL, and each notebook must download its own copy.
After deployment, compare all published notebook hashes with the tested
candidates. The result records whether notebook bytes came from candidate files
or published URLs.

Each notebook receives a new working directory and kernel, with cached outputs
and execution counts cleared. All original code cells run in order. Errors are
collected so one failed cell does not silently exclude the remaining notebooks.
The final result fails if a code cell was not executed, any cell reports an
error, the actual download message is absent, or extracted toolkit files differ
from the verified published ZIP. Preserve iteration counts and random seeds.

Keep executed notebooks, HTML previews, cell events, package versions and logs
in runner scratch for verified archival. Do not put scratch environments or
complete job payloads in Git. Inspect numerical diagnostics and rendered figures
separately: successful execution alone does not establish model validity or
physical accuracy. After a fix, rerun the affected notebook top to bottom.
