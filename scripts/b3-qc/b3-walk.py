#!/usr/bin/env python3
"""
B3 QC — the REAL browser walk of chapter 02 stations 13-18 (desktop + mobile).

Walks every station as a real learner: answers every graded surface correctly
(answer key extracted from the server content — EXACT label matching), advances
every teaching block, reaches the completion seal, and records console/page/HTTP
errors + horizontal overflow + screenshots.
Usage: python3 -u b3-walk.py <cookie_value> <desk|mob> <outdir> [station_slug]
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
ALL_STATIONS = [
    "stn-fm01-13-grammar-dewa",
    "stn-fm01-14-expression",
    "stn-fm01-15-listen",
    "stn-fm01-16-grammar-kara",
    "stn-fm01-17-practice",
    "stn-fm01-18-integrate",
]
VIEWPORTS = {"desk": (1280, 800), "mob": (390, 844)}
WS = re.compile(r"\s+")


def norm(s: str) -> str:
    return WS.sub(" ", s).strip()


class Walker:
    def __init__(self, page, key, st, out, width):
        self.page = page
        self.key = key
        self.st = st
        self.out = out
        self.width = width

    def shot(self, name):
        self.page.screenshot(path=str(self.out / f"{self.width}-{name}.png"))

    # ---------- helpers ----------

    def click_labeled(self, scope, labels, dir_ltr=True, record_prefix=""):
        """Click buttons under `scope` whose text EXACTLY equals each label."""
        ok = []
        for lbl in labels:
            sel = "div[dir=ltr] button:not([disabled])" if dir_ltr else "button:not([disabled])"
            btns = scope.locator(sel)
            found = False
            for i in range(btns.count()):
                if norm(btns.nth(i).inner_text()) == norm(lbl):
                    btns.nth(i).click(timeout=5000)
                    found = True
                    break
            if not found and lbl == "[نامت]":
                # name chip already placed -> the input exists; nothing to click
                found = True
            if not found:
                self.st.setdefault(record_prefix + "miss", []).append(f"{lbl}")
            ok.append(found)
        return all(ok)

    def pick_option(self, scope, label):
        radios = scope.locator("[role=radio]")
        for i in range(radios.count()):
            r = radios.nth(i)
            if norm(r.inner_text()) == norm(label):
                if not r.is_enabled():
                    return False  # locked/answered — caller waits
                r.click(timeout=5000)
                return True
        return False

    def find_ex_answer(self, slug, prompt):
        for v in self.key[slug]["exercises"].values():
            if norm(v["prompt"]) == norm(prompt):
                return v
        return None

    # ---------- surfaces ----------

    def do_exercise(self, slug, ex_sec):
        p = ex_sec.locator("p.text-body.font-medium")
        prompt = norm(p.first.inner_text()) if p.count() else ""
        entry = self.find_ex_answer(slug, prompt)
        if entry is None:
            self.st.setdefault("unmatched", []).append(prompt[:70])
            return "wait"
        if entry["kind"] == "option":
            if not self.pick_option(ex_sec, entry["labels"][0]):
                self.st.setdefault("option-miss", []).append(prompt[:50])
                return "wait"
        else:
            self.click_labeled(ex_sec, entry["labels"], record_prefix="chip-")
            if entry.get("name"):
                inp = ex_sec.locator('input[aria-label="نامت را بنویس"]')
                if inp.count() > 0:
                    inp.first.fill(entry["name"])
        btn = ex_sec.get_by_role("button", name="بررسی پاسخ")
        if btn.count() > 0 and btn.first.is_enabled():
            btn.first.click()
            self.st["answers"] += 1
            return "acted"
        return "wait"

    def do_scene_reply(self, slug):
        for pk, pv in self.key[slug].get("sceneReplies", {}).items():
            # the scene reply prompt is a bold p directly above the chips.
            # NOTE: plain substring (has_text with a raw string) — re.escape
            # backslash-escapes spaces in py3.12 and breaks literal matching.
            frag = pk.split("—")[0][:25].strip()
            if frag and self.page.locator("p.text-body.font-bold").filter(has_text=frag).count() > 0:
                self.click_labeled(self.page, pv["labels"], record_prefix="scene-")
                if pv.get("name"):
                    inp = self.page.locator('input[aria-label="نامت را بنویس"]')
                    if inp.count() > 0:
                        inp.first.fill(pv["name"])
                btn = self.page.get_by_role("button", name="بررسی پاسخ")
                if btn.count() > 0 and btn.first.is_enabled():
                    btn.first.click()
                    self.st["answers"] += 1
                    return "acted"
        return None

    def do_discovery(self, slug):
        radios = self.page.locator("[role=radio]")
        if radios.count() == 0:
            return None
        for q, correct in self.key[slug].get("discoveries", {}).items():
            probe = q[:22]
            if self.page.get_by_text(probe, exact=False).count() > 0:
                for i in range(radios.count()):
                    r = radios.nth(i)
                    if norm(r.inner_text()) == norm(correct):
                        if not r.is_enabled():
                            return None  # already answered — let the walk advance
                        r.click(timeout=5000)
                        self.st["answers"] += 1
                        return "acted"
        return None


def capture_text_states(w, page, slug, st):
    """B3TEXT: walk the station in REVIEW mode, capturing every unique text state."""
    import os

    if not os.environ.get("B3TEXT"):
        return
    page.goto(f"{BASE}/learn/first-meeting-01/journey/{slug}?mode=review", wait_until="load", timeout=60000)
    page.wait_for_timeout(1500)
    texts: list[str] = []
    for _ in range(120):
        t = page.evaluate("document.body.innerText")
        if not texts or t != texts[-1]:
            texts.append(t)
        acted = False
        ex_sec = page.locator('section[aria-label^="پرسش"]').first
        if ex_sec.count() > 0 and ex_sec.is_visible():
            w.do_exercise(slug, ex_sec)
            page.wait_for_timeout(800)
            acted = True
        if not acted:
            chk = page.get_by_role("button", name="بررسی پاسخ")
            if chk.count() > 0 and chk.first.is_visible():
                if w.do_scene_reply(slug) == "acted":
                    page.wait_for_timeout(800)
                    acted = True
        if not acted and w.do_discovery(slug) == "acted":
            page.wait_for_timeout(800)
            acted = True
        if not acted:
            fwd = page.get_by_role("button", name="ادامه")
            if fwd.count() > 0 and fwd.first.is_visible():
                try:
                    fwd.first.click()
                    page.wait_for_timeout(350)
                    acted = True
                except Exception:
                    pass
        if not acted:
            page.wait_for_timeout(600)
            t2 = page.evaluate("document.body.innerText")
            if t2 == texts[-1] and len(texts) > 1 and t2 == texts[-2]:
                break
    st["text_states"] = texts


def main() -> None:
    cookie_value, width, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
    only = sys.argv[4] if len(sys.argv) > 4 else None
    stations = [only] if only else ALL_STATIONS
    key = json.loads(Path("/tmp/b3-answerkey.json").read_text())
    out = Path(outdir)
    out.mkdir(parents=True, exist_ok=True)
    vw, vh = VIEWPORTS[width]

    report = {"width": width, "viewport": [vw, vh], "stations": {}}

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": vw, "height": vh})
        ctx.add_cookies([{"name": "hanaso_session", "value": cookie_value, "url": BASE}])
        page = ctx.new_page()

        console_errors, page_errors, http_errors = [], [], []
        page.on("console", lambda m: console_errors.append(f"[{m.type}] {m.text[:300]}") if m.type == "error" else None)
        page.on("pageerror", lambda e: page_errors.append(str(e)[:300]))
        page.on("response", lambda r: http_errors.append(f"{r.status} {r.url[:180]}") if r.status >= 400 else None)

        def overflow():
            return page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")

        for slug in stations:
            console_errors.clear()
            page_errors.clear()
            http_errors.clear()
            t0 = time.time()
            st = {"steps": 0, "answers": 0, "blocks": [], "overflow": False, "completed": False}
            w = Walker(page, key, st, out, width)

            page.goto(f"{BASE}/learn/first-meeting-01/journey/{slug}", wait_until="load", timeout=60000)
            for _ in range(80):
                if (
                    page.locator("[data-aizen-seal-frame]").count() > 0
                    or page.get_by_role("button", name="ادامه").count() > 0
                    or page.locator('section[aria-label^="پرسش"]').count() > 0
                    or page.get_by_role("button", name="بررسی پاسخ").count() > 0
                ):
                    break
                page.wait_for_timeout(500)
            page.wait_for_timeout(600)

            if page.locator("[data-aizen-seal-frame]").count() > 0:
                st["completed"] = True
                st["note"] = "already completed"
                w.shot(f"{slug}-settled")
                capture_text_states(w, page, slug, st)
                report["stations"][slug] = st
                print(f"{slug}: already completed")
                continue

            stall = 0
            last_sig = ""
            prev_bt = ""
            while st["steps"] < 400 and stall < 30:
                st["steps"] += 1

                # 1) completion seal
                if page.locator("[data-aizen-seal-frame]").count() > 0:
                    st["completed"] = True
                    page.wait_for_timeout(700)
                    w.shot(f"{slug}-done")
                    break

                # evidence: current section heading
                try:
                    heads = page.locator("section h3, section h2").all_inner_texts()
                    bt = norm(heads[-1])[:60] if heads else ""
                except Exception:
                    bt = ""
                if bt and bt != prev_bt:
                    st["blocks"].append(bt)
                    prev_bt = bt
                    if len(st["blocks"]) <= 4:
                        w.shot(f"{slug}-b{len(st['blocks'])}")

                # 2) exercise session
                ex_sec = page.locator('section[aria-label^="پرسش"]').first
                if ex_sec.count() > 0 and ex_sec.is_visible():
                    check = ex_sec.get_by_role("button", name="بررسی پاسخ")
                    retry = ex_sec.get_by_role("button", name="تلاش دوباره")
                    esc = ex_sec.get_by_role("button", name="ادامه")
                    # mid-advance (correct feedback beat): NO check, NO retry, NO escape
                    mid_advance = check.count() == 0 and retry.count() == 0 and esc.count() == 0
                    if mid_advance:
                        page.wait_for_timeout(500)  # correct-answer auto-advance beat
                        continue
                    w.do_exercise(slug, ex_sec)
                    page.wait_for_timeout(900)
                    continue

                # 3) scene reply
                if page.get_by_role("button", name="بررسی پاسخ").count() > 0:
                    import os

                    if os.environ.get("B3DEBUG"):
                        hits = [
                            page.locator("p.text-body.font-bold").filter(has_text=pk.split("—")[0][:25].strip()).count()
                            for pk in key[slug].get("sceneReplies", {})
                        ]
                        print(f"  [dbg] s{st['steps']} scene-branch; prompt-hit={hits}")
                    if w.do_scene_reply(slug) == "acted":
                        page.wait_for_timeout(900)
                        continue

                # 4) discovery
                if w.do_discovery(slug) == "acted":
                    page.wait_for_timeout(900)
                    continue

                # 5) plain forward
                fwd = page.get_by_role("button", name="ادامه")
                if fwd.count() > 0 and fwd.first.is_visible():
                    try:
                        fwd.first.click()
                        page.wait_for_timeout(350)
                    except Exception as e:
                        st.setdefault("click-fail", []).append(str(e)[:90])
                    continue

                # 6) wait
                page.wait_for_timeout(600)
                sig = str(page.evaluate("document.body.innerText.length")) + str(page.url)
                if sig == last_sig:
                    stall += 1
                else:
                    stall = 0
                    last_sig = sig

            # B3TEXT: capture every unique text state of the walk (review mode)
            capture_text_states(w, page, slug, st)

            st["overflow"] = overflow()
            st["console_errors"] = console_errors[:10]
            st["page_errors"] = page_errors[:10]
            st["http_errors"] = http_errors[:10]
            st["seconds"] = round(time.time() - t0, 1)
            report["stations"][slug] = st
            print(
                f"{slug}: completed={st['completed']} answers={st['answers']} blocks={len(st['blocks'])} "
                f"ovf={st['overflow']} err={len(console_errors) + len(page_errors) + len(http_errors)} "
                f"misses={ {k: len(v) for k, v in st.items() if isinstance(v, list) and k.endswith(('miss', 'unmatched'))} }"
            )

        browser.close()

    Path(out / f"report-{width}{'-' + only if only else ''}.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1)
    )
    total_err = sum(
        len(s.get("console_errors", [])) + len(s.get("page_errors", [])) + len(s.get("http_errors", []))
        for s in report["stations"].values()
    )
    all_done = all(s["completed"] for s in report["stations"].values())
    any_ovf = any(s["overflow"] for s in report["stations"].values())
    print(f"\n=== {width}: completed_all={all_done} overflow_any={any_ovf} errors_total={total_err} ===")
    sys.exit(0 if (all_done and not any_ovf and total_err == 0) else 1)


if __name__ == "__main__":
    main()
