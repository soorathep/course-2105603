"""Execute the published teaching notebooks in separate, empty working folders.

Run with an isolated Python environment and a kernel named courseqa whose argv
uses that same absolute interpreter. No notebook cells or model parameters are
changed. Execution artifacts belong in scratch, outside the published site.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import importlib.util
import io
import json
from pathlib import Path
import platform
import time
import traceback
from urllib.request import urlopen
import zipfile

import nbformat
from nbclient import NotebookClient
from nbconvert import HTMLExporter


def now():
    return datetime.now(timezone.utc).isoformat()


def save_json(path, obj):
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")


def fetch_checked(url, digest):
    with urlopen(url, timeout=60) as response:
        content = response.read(16 * 1024 * 1024 + 1)
        status = response.status
    if status != 200 or len(content) > 16 * 1024 * 1024:
        raise RuntimeError(f"Unexpected download: HTTP {status}, {len(content)} bytes")
    actual = hashlib.sha256(content).hexdigest()
    if actual != digest:
        raise RuntimeError(f"Published payload changed: {url}: {actual} != {digest}")
    return content


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--source-dir", type=Path,
                        help="Use hash-verified local candidate notebooks before publication")
    parser.add_argument("--cell-timeout", type=int, default=1200)
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text())
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    events_path = output / "events.jsonl"

    def event(kind, **details):
        item = {"time_utc": now(), "kind": kind, **details}
        with events_path.open("a") as stream:
            stream.write(json.dumps(item, ensure_ascii=False) + "\n")
        print(json.dumps(item, ensure_ascii=False), flush=True)

    if importlib.util.find_spec("vlekit") is not None:
        raise RuntimeError("vlekit is already importable; use a fresh isolated environment")
    versions = {}
    for package in ["nbclient", "nbformat", "nbconvert", "ipykernel", "numpy",
                    "scipy", "matplotlib", "thermo", "chemicals"]:
        versions[package] = importlib.metadata.version(package)
    save_json(output / "environment.json", {
        "python": platform.python_version(), "platform": platform.platform(),
        "versions": versions, "vlekit_importable_before_run": False,
    })
    toolkit = fetch_checked(manifest["toolkit"]["url"], manifest["toolkit"]["sha256"])
    (output / "reference-vlekit.zip").write_bytes(toolkit)
    with zipfile.ZipFile(io.BytesIO(toolkit)) as archive:
        if archive.testzip() is not None:
            raise RuntimeError("Invalid reference toolkit archive")
        members = {info.filename: hashlib.sha256(archive.read(info)).hexdigest()
                   for info in archive.infolist() if not info.is_dir()}
    summary = {"started_utc": now(), "source_commit": manifest["source_commit"],
               "toolkit": manifest["toolkit"], "notebooks": []}
    exporter = HTMLExporter(template_name="lab")

    for entry in manifest["notebooks"]:
        name = entry["filename"]
        folder = output / Path(name).stem
        folder.mkdir()
        work = folder / "work"
        work.mkdir()
        record = {"filename": name, "url": entry["url"], "sha256": entry["sha256"],
                  "source": "local_candidate" if args.source_dir else "published_url",
                  "started_utc": now(), "cells": [], "errors": []}
        summary["notebooks"].append(record)
        started = time.monotonic()
        nb = None
        event("notebook_start", notebook=name)
        try:
            if args.source_dir:
                if Path(name).name != name:
                    raise ValueError("Candidate filename must be a basename")
                content = (args.source_dir / name).read_bytes()
                if len(content) > 16 * 1024 * 1024 or hashlib.sha256(content).hexdigest() != entry["sha256"]:
                    raise RuntimeError(f"Candidate payload changed: {name}")
            else:
                content = fetch_checked(entry["url"], entry["sha256"])
            (folder / "downloaded.ipynb").write_bytes(content)
            nb = nbformat.reads(content.decode(), as_version=4)
            nbformat.validate(nb)
            for cell in nb.cells:
                if cell.cell_type == "code":
                    cell.outputs = []
                    cell.execution_count = None
            record["code_cells_expected"] = sum(c.cell_type == "code" for c in nb.cells)
            cell_starts = {}

            def on_start(cell, cell_index, **kwargs):
                if cell.cell_type == "code":
                    cell_starts[cell_index] = time.monotonic()
                    event("cell_start", notebook=name, index=cell_index)

            def on_executed(cell, cell_index, **kwargs):
                if cell.cell_type != "code":
                    return
                errors = [dict(o) for o in cell.outputs if o.output_type == "error"]
                row = {"index": cell_index, "execution_count": cell.execution_count,
                       "seconds": round(time.monotonic() - cell_starts[cell_index], 3),
                       "errors": [{"ename": e["ename"], "evalue": e["evalue"]} for e in errors]}
                record["cells"].append(row)
                record["errors"].extend({"index": cell_index, **e} for e in row["errors"])
                nbformat.write(nb, folder / "executed.ipynb")
                save_json(folder / "progress.json", record)
                event("cell_complete", notebook=name, **row)

            client = NotebookClient(
                nb, kernel_name="courseqa", timeout=args.cell_timeout,
                allow_errors=True, record_timing=True,
                resources={"metadata": {"path": str(work)}},
                on_cell_start=on_start, on_cell_executed=on_executed,
            )
            client.execute()
            actual_errors = [{"index": i, "ename": o.ename, "evalue": o.evalue}
                             for i, c in enumerate(nb.cells) if c.cell_type == "code"
                             for o in c.outputs if o.output_type == "error"]
            record["errors"] = actual_errors
            output_text = "\n".join(
                str(o.get("text", "")) for c in nb.cells if c.cell_type == "code"
                for o in c.outputs if o.output_type == "stream")
            (folder / "stdout.txt").write_text(output_text)
            record["download_message_seen"] = "downloaded vlekit from the course page" in output_text
            member_checks = []
            for relative, expected_hash in members.items():
                file = work / relative
                member_checks.append(file.is_file() and
                                     hashlib.sha256(file.read_bytes()).hexdigest() == expected_hash)
            record["downloaded_toolkit_member_count"] = len(member_checks)
            record["downloaded_toolkit_matches_published_zip"] = all(member_checks)
            record["executed_code_cells"] = sum(c.cell_type == "code" and
                                                c.execution_count is not None for c in nb.cells)
            record["passed"] = (not actual_errors and record["download_message_seen"] and
                                all(member_checks) and record["executed_code_cells"] ==
                                record["code_cells_expected"])
        except Exception as exc:
            record["passed"] = False
            record["exception"] = {"type": type(exc).__name__, "message": str(exc)}
            (folder / "exception.txt").write_text(traceback.format_exc())
        finally:
            if nb is not None:
                nbformat.write(nb, folder / "executed.ipynb")
                try:
                    html, _ = exporter.from_notebook_node(nb)
                    (folder / "executed.html").write_text(html)
                except Exception as exc:
                    record["render_error"] = str(exc)
            record["seconds"] = round(time.monotonic() - started, 3)
            record["finished_utc"] = now()
            save_json(folder / "result.json", record)
            save_json(output / "summary.json", summary)
            event("notebook_complete", notebook=name, passed=record.get("passed"),
                  seconds=record["seconds"], errors=record["errors"])

    summary["finished_utc"] = now()
    summary["passed"] = all(n.get("passed", False) for n in summary["notebooks"])
    summary["executed_code_cells"] = sum(n.get("executed_code_cells", 0)
                                         for n in summary["notebooks"])
    save_json(output / "summary.json", summary)
    event("run_complete", passed=summary["passed"],
          executed_code_cells=summary["executed_code_cells"])
    return 0 if summary["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
