#!/usr/bin/env python3
"""audit-external-skills.py — security & quality audit for vendored/external Agent Skills.

Scans a directory of skill folders (each containing SKILL.md) for:
  - dangerous shell patterns (curl|bash, eval, sudo, rm -rf /, ...)
  - secret/credential access attempts (.ssh, .env, ghp_ patterns, ...)
  - exfiltration surfaces (webhooks, generic POST collectors)
  - prompt-injection phrasing (ignore instructions, override policies, ...)
  - network surface (all external URLs, for human review)
  - frontmatter validity per the Agent Skills spec (name == folder, description)
and prints a structured report. Exit code 0 = no HIGH/MEDIUM findings.

Usage:
  python3 scripts/audit-external-skills.py <skills-dir> [--json out.json]

Every finding must be reviewed by a human before a skill is accepted:
this tool is a first-pass filter, not approval. (TASK-ENG, ADR-006)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys

# rule: (name, pattern, flags)  flags: re.IGNORECASE where noted
PATTERNS: dict[str, list[tuple[str, str, int]]] = {
    "HIGH": [
        ("pipe-to-shell", r"curl[^|>\n]*\|\s*(?:ba|z|da)?sh\b", 0),
        ("pipe-to-shell", r"wget[^|>\n]*\|\s*(?:ba|z|da)?sh\b", 0),
        ("destructive-fs", r"rm\s+-rf?\s+/(?!tmp\b|home/z\b)", 0),
        ("destructive-fs", r"\bmkfs\b|\bdd\s+if=/dev/(?:zero|random)", 0),
        ("secret-read", r"~?/\.ssh/|id_rsa|id_ed25519|\.netrc|\.npmrc(?!\s*example)", 0),
        ("secret-read", r"\bghp_[A-Za-z0-9]{16,}|\bgithub_pat_[A-Za-z0-9_]{16,}|\bAKIA[0-9A-Z]{16}\b", 0),
        ("exfiltration", r"discord(?:app)?\.com/api/webhooks|hooks\.slack\.com|api\.telegram\.org|pastebin\.com", 0),
        ("prompt-injection", r"\bignore\s+(?:all|any|the|your|prior|previous)\s+(?:previous\s+|prior\s+|above\s+)?(?:instructions?|prompts?|rules?|directives?)\b", re.IGNORECASE),
        ("prompt-injection", r"\bdisregard\s+(?:all|any|the|your|prior|previous|above)\b", re.IGNORECASE),
        ("prompt-injection", r"\b(?:jailbreak|developer\s+mode)\b", re.IGNORECASE),
        ("prompt-injection", r"\boverride\s+(?:all|any|the|project|system)\s+(?:instructions?|rules?|policies?|guardrails?|security)\b", re.IGNORECASE),
    ],
    "MEDIUM": [
        ("privilege-escalation", r"\bsudo\b", 0),
        ("dangerous-exec", r"\beval\s+[\"']|\bexec\s*\(|base64\s+--?d|openssl\s+enc\s+-[dA]", 0),
        ("env-secret-read", r"read\s+\.env\b|cat\s+\.env\b|source\s+\.env\b", re.IGNORECASE),
        ("unpinned-install", r"npm\s+install\s+-g\s+[a-z]|\bpip\s+install\s+[a-z]", re.IGNORECASE),
        ("global-vps-change", r"systemctl\s+(?:restart|stop|disable)|(?:service\s+\w+\s+restart)|crontab\b", re.IGNORECASE),
    ],
    "LOW": [
        ("chmod-777", r"chmod\s+777", 0),
        ("force-push", r"git\s+push\s+(?:--force|-f)\b|git\s+push\s+-u\s+\w+\s+main\b", 0),
        ("telemetry", r"telemetry|analytics\.send|posthog|segment(?:\.io|\.com)", re.IGNORECASE),
    ],
}

URL_RE = re.compile(r"https?://[^\s\"'`<>)\]}]+")
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)

TEXT_EXT = {".md", ".txt", ".markdown", ".mjs", ".cjs"}
CODE_EXT = {".py", ".sh", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml", ".css"}


def audit_file(path: str) -> tuple[list[dict], list[str]]:
    findings: list[dict] = []
    urls: list[str] = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            text = f.read()
    except OSError as e:
        return ([{"severity": "HIGH", "rule": "unreadable", "match": str(e), "line": 0}], [])
    ext = os.path.splitext(path)[1].lower()
    if ext not in TEXT_EXT | CODE_EXT:
        return findings, urls
    urls = sorted(set(m.group(0).rstrip(".,;") for m in URL_RE.finditer(text)))
    for severity, rules in PATTERNS.items():
        for name, pat, flags in rules:
            for m in re.finditer(pat, text, flags):
                line = text.count("\n", 0, m.start()) + 1
                snippet = text.splitlines()[line - 1].strip()[:120]
                findings.append(
                    {"severity": severity, "rule": name, "match": m.group(0)[:80], "line": line, "snippet": snippet}
                )
    return findings, urls


def check_frontmatter(skill_dir: str, skill_file: str) -> tuple[dict, list[str]]:
    issues = []
    meta: dict = {}
    with open(skill_file, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    m = FRONTMATTER_RE.match(text)
    if not m:
        return meta, ["HIGH: no YAML frontmatter found"]
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if kv:
            meta[kv.group(1)] = kv.group(2).strip().strip("'\"")
    name = meta.get("name", "")
    if name != os.path.basename(skill_dir):
        issues.append(f"HIGH: frontmatter name '{name}' != folder '{os.path.basename(skill_dir)}'")
    if not meta.get("description"):
        issues.append("HIGH: missing description")
    elif not (20 <= len(meta["description"]) <= 1024):
        issues.append(f"LOW: description length {len(meta['description'])} outside 20-1024")
    return meta, issues


def audit_skill(skill_dir: str) -> dict:
    rel = os.path.basename(skill_dir)
    skill_file = os.path.join(skill_dir, "SKILL.md")
    result = {
        "skill": rel,
        "files": [],
        "n_files": 0,
        "n_bytes": 0,
        "frontmatter": {},
        "findings": [],
        "urls": [],
        "executable_scripts": [],
        "frontmatter_issues": [],
        "has_skill_md": os.path.isfile(skill_file),
    }
    if not result["has_skill_md"]:
        result["frontmatter_issues"].append("HIGH: SKILL.md missing")
    else:
        result["frontmatter"], result["frontmatter_issues"] = check_frontmatter(skill_dir, skill_file)
    for root, _dirs, files in os.walk(skill_dir):
        for fn in sorted(files):
            p = os.path.join(root, fn)
            st = os.stat(p)
            relp = os.path.relpath(p, skill_dir)
            result["files"].append({"file": relp, "bytes": st.st_size})
            result["n_files"] += 1
            result["n_bytes"] += st.st_size
            if os.access(p, os.X_OK) or fn.endswith((".sh", ".py", ".mjs")):
                result["executable_scripts"].append(relp)
            f_findings, f_urls = audit_file(p)
            for fd in f_findings:
                fd["file"] = relp
            result["findings"].extend(f_findings)
            result["urls"].extend(f_urls)
    result["urls"] = sorted(set(result["urls"]))
    result["scripts_flagged"] = [f["file"] for f in result["findings"]]
    return result


def render(reports: list[dict]) -> str:
    out = ["# External Skill Audit — automated first-pass", ""]
    counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for r in reports:
        for f in r["findings"]:
            counts[f["severity"]] += 1
        for i in r["frontmatter_issues"]:
            if i.startswith("HIGH"):
                counts["HIGH"] += 1
    out.append(f"Skills scanned: {len(reports)} · files: {sum(r['n_files'] for r in reports)}"
               f" · findings: HIGH={counts['HIGH']} MEDIUM={counts['MEDIUM']} LOW={counts['LOW']}")
    out.append("")
    for r in reports:
        out.append(f"## {r['skill']}")
        out.append(f"- files: {r['n_files']} ({r['n_bytes']:,} B) · SKILL.md: {'yes' if r['has_skill_md'] else 'NO'}")
        fm = r["frontmatter"]
        if fm:
            out.append(f"- frontmatter: name=`{fm.get('name','')}` license=`{fm.get('license','—')}` "
                       f"desc_len={len(fm.get('description',''))}")
        if r["frontmatter_issues"]:
            out.append(f"- frontmatter issues: {'; '.join(r['frontmatter_issues'])}")
        if r["executable_scripts"]:
            out.append(f"- executable/script files: {', '.join(r['executable_scripts'][:12])}")
        if r["findings"]:
            out.append("- findings:")
            for f in r["findings"]:
                out.append(f"  - [{f['severity']}] {f['file']}:{f['line']} {f['rule']} — `{f['match']}`")
        else:
            out.append("- findings: none")
        if r["urls"]:
            interesting = [u for u in r["urls"] if not re.match(r"https?://(?:www\.)?(?:example\.com|localhost|127\.0\.0\.1)", u)]
            out.append(f"- external URLs ({len(interesting)}): " + (", ".join(interesting[:25]) if interesting else "(only local/example)"))
        out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("dir", help="directory containing skill folders")
    ap.add_argument("--json", dest="json_out", default=None)
    args = ap.parse_args()

    if not os.path.isdir(args.dir):
        print(f"ERROR: not a directory: {args.dir}", file=sys.stderr)
        return 2
    reports = []
    for entry in sorted(os.listdir(args.dir)):
        p = os.path.join(args.dir, entry)
        if os.path.isdir(p) and not entry.startswith("."):
            reports.append(audit_skill(p))
    if not reports:
        print(f"ERROR: no skill folders in {args.dir}", file=sys.stderr)
        return 2
    print(render(reports))
    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as f:
            json.dump(reports, f, indent=2, ensure_ascii=False)
    hard = sum(1 for r in reports for f in r["findings"] if f["severity"] in ("HIGH", "MEDIUM"))
    hard += sum(1 for r in reports for i in r["frontmatter_issues"] if i.startswith("HIGH"))
    print(f"AUDIT_EXIT: {'FAIL' if hard else 'PASS'} ({hard} HIGH/MEDIUM findings require human review)")
    return 1 if hard else 0


if __name__ == "__main__":
    sys.exit(main())
