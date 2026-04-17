#!/usr/bin/env python3
"""
从「经纪人备考」目录下所有 PDF / docx / doc 抽取文本，解析客观题，生成
src/data/questions.auto.json（不含 id，由 TS 侧分配）。

依赖：pdftotext（poppler）、textutil（macOS）、可选 tesseract（--ocr-docx）。

用法：
  python3 scripts/build_auto_questions.py \\
    --root "/Users/FIRE_1/Documents/经纪人备考" \\
    --out-json src/data/questions.auto.json \\
    --cache-dir broker-extracted-full

  # 对 textutil 几乎为空的 docx 再跑 OCR（较慢）
  python3 scripts/build_auto_questions.py --root "..." --out-json ... --ocr-docx
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any


def _run(cmd: list[str]) -> tuple[int, str, str]:
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode, p.stdout or "", p.stderr or ""


def normalize_cjk(s: str) -> str:
    s = s.replace("\x0c", "\n").replace("\r", "\n")
    for _ in range(20):
        ns = re.sub(r"([\u4e00-\u9fff])\s([\u4e00-\u9fff])", r"\1\2", s)
        if ns == s:
            break
        s = ns
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def strip_headers(text: str) -> str:
    text = re.sub(r"专业网校课程[\s\S]{0,200}?职业考试学习平台\s*", "", text)
    text = re.sub(r"钉题库演出经纪人[\s\S]{0,80}?资格\s*", "", text)
    text = re.sub(r"慧考智学官网[\s\S]{0,120}?版权所有\s*", "", text)
    text = re.sub(r"羿文教育\s*", "", text)
    return text


def clean_answer_leak(s: str) -> str:
    """去掉选项/题干尾部粘连的「参考答案：X」等。"""
    s = re.sub(r"参考答案[：:][ABCD对错,\s、，]*\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"【解析】[\s\S]*$", "", s)
    return s.strip()


def is_junk_question(q: dict[str, Any]) -> bool:
    c = q.get("content", "")
    if re.search(r"www\.(huikao|钉题|羿文)|版权所有|课程选择\s*\(", c):
        return True
    for o in q.get("options", []):
        if "参考答案" in o or "【解析】" in o:
            return True
    return False


def guess_chapter(rel: str) -> int:
    r = rel.replace("\\", "/")
    if any(k in r for k in ("思想政治", "法律", "法规", "宪法", "民法", "刑法")):
        return 1
    if any(k in r for k in ("安全", "消防", "应急", "治安", "大型群众性")):
        return 4
    if any(k in r for k in ("舞台", "艺术", "舞美", "灯光", "剧目", "戏曲")):
        return 3
    if any(k in r for k in ("经纪", "市场", "佣金", "合同", "演出项目")):
        return 2
    return 1


def pdf_to_text(path: Path, pdftotext: str) -> str:
    code, out, err = _run([pdftotext, "-q", "-enc", "UTF-8", str(path), "-"])
    if code != 0:
        return ""
    return out


def textutil_to_text(path: Path) -> str:
    code, out, _ = _run(["textutil", "-stdout", "-convert", "txt", str(path)])
    return out if code == 0 else ""


def _natural_key(s: str) -> list:
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def ocr_docx_media(docx: Path, tesseract: str | None) -> str:
    if not tesseract:
        return ""
    media_ext = {".png", ".jpg", ".jpeg", ".gif", ".tif", ".tiff", ".bmp", ".webp"}
    chunks: list[str] = []
    try:
        with tempfile.TemporaryDirectory(prefix="docxocr_") as tmp:
            root = Path(tmp)
            with zipfile.ZipFile(docx, "r") as zf:
                media_names = sorted(
                    (
                        n
                        for n in zf.namelist()
                        if n.startswith("word/media/") and Path(n).suffix.lower() in media_ext
                    ),
                    key=_natural_key,
                )
                if not media_names:
                    return ""
                for name in media_names:
                    dest = root / Path(name).name
                    dest.write_bytes(zf.read(name))
                    code, text, _ = _run(
                        [tesseract, str(dest), "stdout", "-l", "chi_sim+eng", "--psm", "3"],
                    )
                    if code == 0 and text.strip():
                        chunks.append(text.strip())
    except (zipfile.BadZipFile, OSError):
        return ""
    return "\n\n".join(chunks)


def parse_answer_key(raw: str) -> tuple[str, list[int]] | None:
    raw = raw.strip().upper()
    if raw in ("对", "错"):
        return ("judge", [0] if raw == "对" else [1])
    letters = re.findall(r"[ABCD]", raw)
    if not letters:
        return None
    uniq = sorted(set(letters))
    idxs = [ord(x) - ord("A") for x in uniq]
    if len(idxs) == 1:
        return ("single", idxs)
    return ("multi", idxs)


def parse_blocks_number_dot(text: str, source: str, chapter: int) -> list[dict[str, Any]]:
    """解析「1. 题干… A. … 参考答案：X」类（含羿文/钉题库等模拟卷）。"""
    text = strip_headers(normalize_cjk(text))
    blocks: list[str] = []
    for m in re.finditer(r"(?m)^(\d{1,3})\.\s*", text):
        blocks.append(m.start())
    out: list[dict[str, Any]] = []
    for i, start in enumerate(blocks):
        end = blocks[i + 1] if i + 1 < len(blocks) else len(text)
        block = text[start:end]
        mnum = re.match(r"(?m)^(\d{1,3})\.\s*", block)
        if not mnum:
            continue
        ref_m = re.search(
            r"参考答案[：:]\s*\n?\s*([ABCD]{1,4}|对|错)",
            block,
            re.IGNORECASE,
        )
        if not ref_m:
            continue
        parsed = parse_answer_key(ref_m.group(1))
        if not parsed:
            continue
        kind, ans_idx = parsed
        opt_lines = list(
            re.finditer(
                r"(?m)^\s*([ABCD])[\.．、]\s*(\S.*?)\s*$",
                block,
            )
        )
        if kind == "judge":
            stem = block[mnum.end() : ref_m.start()].strip()
            stem = re.sub(r"[（(]\s*[)）]\s*$", "", stem).strip()
            if len(stem) < 6:
                continue
            expl_m = re.search(r"【解析】\s*([\s\S]*?)(?=\n\d{1,3}\.\s|$)", block[ref_m.end() :])
            expl = expl_m.group(1).strip()[:800] if expl_m else ""
            rec = {
                "chapter": chapter,
                "type": "single",
                "content": stem[:2000],
                "options": ["对", "错"],
                "answer": ans_idx[0],
                "explanation": expl or "（摘自备考资料）",
                "source": source,
            }
            if not is_junk_question(rec):
                out.append(rec)
            continue
        if len(opt_lines) < 4:
            continue
        opts = [clean_answer_leak(opt_lines[j].group(2).strip())[:800] for j in range(4)]
        if any(len(o) < 1 for o in opts):
            continue
        first_opt_start = opt_lines[0].start()
        stem = clean_answer_leak(block[mnum.end() : first_opt_start].strip())
        stem = re.sub(r"\s+", " ", stem)
        if len(stem) < 5:
            continue
        expl_m = re.search(r"【解析】\s*([\s\S]*?)(?=\n\d{1,3}\.\s|$)", block[ref_m.end() :])
        expl = expl_m.group(1).strip()[:800] if expl_m else ""
        if kind == "multi":
            rec = {
                "chapter": chapter,
                "type": "multi",
                "content": stem[:2000],
                "options": opts,
                "answer": ans_idx,
                "explanation": expl or "（摘自备考资料）",
                "source": source,
            }
        else:
            rec = {
                "chapter": chapter,
                "type": "single",
                "content": stem[:2000],
                "options": opts,
                "answer": ans_idx[0],
                "explanation": expl or "（摘自备考资料）",
                "source": source,
            }
        if not is_junk_question(rec):
            out.append(rec)
    return out


def parse_inline_number_dun(text: str, source: str, chapter: int) -> list[dict[str, Any]]:
    """解析「1、题干（ C ） … A. …」教材/练习排版（答案在括号）。"""
    t = strip_headers(normalize_cjk(text))
    out: list[dict[str, Any]] = []
    starts = [m.start() for m in re.finditer(r"(?m)^(\d{1,3})、\s*", t)]
    for i, start in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(t)
        chunk = t[start:end]
        head = re.match(r"^(\d{1,3})、\s*", chunk)
        if not head:
            continue
        rest = chunk[head.end() :]
        am = re.search(r"(?m)^\s*A[\.．、]\s*", rest)
        if not am:
            continue
        before_a = rest[: am.start()]
        keys = list(re.finditer(r"（\s*([ABCD]+)\s*）", before_a))
        if not keys:
            continue
        letters_raw = keys[-1].group(1).upper()
        letters = sorted(set(re.findall(r"[ABCD]", letters_raw)))
        if not letters:
            continue
        stem = before_a[: keys[-1].start()].strip()
        stem = re.sub(r"^\d{1,3}、\s*", "", stem).strip()
        stem = re.sub(r"\s+", " ", stem)
        if len(stem) < 8:
            continue
        opt_part = rest[am.start() :]
        opts: list[str] = []
        for lab in ("A", "B", "C", "D"):
            om = re.search(rf"(?m)^\s*{lab}[\.．、]\s*(.+?)(?=\n\s*[ABCD][\.．、]|\n详|\Z)", opt_part, re.DOTALL)
            if not om:
                opts = []
                break
            opts.append(clean_answer_leak(re.sub(r"\s+", " ", om.group(1).strip())[:800]))
        if len(opts) != 4:
            continue
        ans_idx = [ord(x) - ord("A") for x in letters]
        expl_m = re.search(r"详\s*见[\s\S]{0,1200}?(?=\n\d{1,3}、|\Z)", chunk)
        expl = (expl_m.group(0).strip()[:600] if expl_m else "") or "（摘自备考资料）"
        if len(ans_idx) > 1:
            rec = {
                "chapter": chapter,
                "type": "multi",
                "content": stem[:2000],
                "options": opts,
                "answer": ans_idx,
                "explanation": expl,
                "source": source,
            }
        else:
            rec = {
                "chapter": chapter,
                "type": "single",
                "content": stem[:2000],
                "options": opts,
                "answer": ans_idx[0],
                "explanation": expl,
                "source": source,
            }
        if not is_junk_question(rec):
            out.append(rec)
    return out


def parse_practice_correct_label(text: str, source: str, chapter: int) -> list[dict[str, Any]]:
    """舞台艺术等：题号单独一行 + 正确答案：字母。"""
    t = strip_headers(normalize_cjk(text))
    if "正确答案" not in t or "本题得分" not in t:
        return []
    out: list[dict[str, Any]] = []
    for m in re.finditer(r"(?:^|\n)\s*(\d{1,3})\s*\n+(?=[\u4e00-\u9fff（【「])", t):
        start = m.start()
        end = t.find("\n正确答案", m.end())
        if end == -1:
            continue
        tail = t[end : end + 80]
        rm = re.search(r"正确答案[：:]\s*\n?\s*([ABCD])", tail)
        if not rm:
            continue
        letter = rm.group(1).upper()
        ans = ord(letter) - ord("A")
        block = t[m.start() : end]
        inner = re.search(r"(?:^|\n)\s*(\d{1,3})\s*\n+(.*)", block, re.DOTALL)
        if not inner:
            continue
        mid = inner.group(2)
        am = re.search(r"(?m)\n\s*A[\.．、]\s*", mid)
        if not am:
            continue
        stem = mid[: am.start()].strip()
        stem = re.sub(r"\s+", " ", stem)
        if len(stem) < 8:
            continue
        opt_part = mid[am.start() :]
        opts: list[str] = []
        for lab in ("A", "B", "C", "D"):
            om = re.search(
                rf"(?m)^\s*{lab}[\.．、]\s*(.+?)(?=\n\s*[ABCD][\.．、]|\n\s*本题得分|\Z)",
                opt_part,
                re.DOTALL,
            )
            if not om:
                opts = []
                break
            opts.append(clean_answer_leak(re.sub(r"\s+", " ", om.group(1).strip())[:800]))
        if len(opts) != 4:
            continue
        rec = {
            "chapter": chapter,
            "type": "single",
            "content": stem[:2000],
            "options": opts,
            "answer": ans,
            "explanation": "（摘自备考资料练习系统）",
            "source": source,
        }
        if not is_junk_question(rec):
            out.append(rec)
    return out


def dedupe_key(q: dict[str, Any]) -> str:
    c = re.sub(r"\s+", "", q.get("content", ""))[:120]
    return hashlib.sha256(c.encode("utf-8")).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, required=True)
    ap.add_argument("--out-json", type=Path, required=True)
    ap.add_argument("--cache-dir", type=Path, default=Path("broker-extracted-full"))
    ap.add_argument("--ocr-docx", action="store_true", help="对 text 过短的 docx 用 tesseract OCR")
    args = ap.parse_args()

    root: Path = args.root.expanduser().resolve()
    out_json: Path = args.out_json.expanduser().resolve()
    cache: Path = args.cache_dir.expanduser().resolve()
    cache.mkdir(parents=True, exist_ok=True)

    pdftotext = shutil.which("pdftotext")
    if not pdftotext:
        sys.stderr.write("未找到 pdftotext，请先 brew install poppler\n")
        sys.exit(2)
    tesseract = shutil.which("tesseract") if args.ocr_docx else None

    pdfs = sorted(root.rglob("*.pdf"))
    docxs = sorted(root.rglob("*.docx"))
    docs = sorted(root.rglob("*.doc"))

    all_items: list[dict[str, Any]] = []
    seen: set[str] = set()

    def add_batch(batch: list[dict[str, Any]]) -> None:
        for q in batch:
            if is_junk_question(q):
                continue
            k = dedupe_key(q)
            if k in seen:
                continue
            seen.add(k)
            all_items.append(q)

    for pdf in pdfs:
        rel = str(pdf.relative_to(root))
        ch = guess_chapter(rel)
        txt = pdf_to_text(pdf, pdftotext)
        if len(txt) < 80:
            continue
        (cache / "pdf").mkdir(parents=True, exist_ok=True)
        safe = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", rel)[:180]
        (cache / "pdf" / f"{safe}.txt").write_text(txt, encoding="utf-8")
        b1 = parse_blocks_number_dot(txt, rel, ch)
        b2 = parse_inline_number_dun(txt, rel, ch)
        b3 = parse_practice_correct_label(txt, rel, ch)
        add_batch(b1)
        if len(b1) < 3:
            add_batch(b2)
        if len(b1) < 3 and len(b2) < 3:
            add_batch(b3)

    for docx in docxs:
        rel = str(docx.relative_to(root))
        ch = guess_chapter(rel)
        txt = textutil_to_text(docx)
        if len(txt) < 150 and tesseract:
            txt = ocr_docx_media(docx, tesseract)
        if len(txt) < 80:
            continue
        (cache / "docx").mkdir(parents=True, exist_ok=True)
        safe = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", rel)[:180]
        (cache / "docx" / f"{safe}.txt").write_text(txt, encoding="utf-8")
        add_batch(parse_blocks_number_dot(txt, rel, ch))
        add_batch(parse_inline_number_dun(txt, rel, ch))
        add_batch(parse_practice_correct_label(txt, rel, ch))

    for doc in docs:
        rel = str(doc.relative_to(root))
        ch = guess_chapter(rel)
        txt = textutil_to_text(doc)
        if len(txt) < 80:
            continue
        (cache / "doc").mkdir(parents=True, exist_ok=True)
        safe = re.sub(r"[^\w\u4e00-\u9fff\-]+", "_", rel)[:180]
        (cache / "doc" / f"{safe}.txt").write_text(txt, encoding="utf-8")
        add_batch(parse_blocks_number_dot(txt, rel, ch))
        add_batch(parse_inline_number_dun(txt, rel, ch))

    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(
        json.dumps({"version": 1, "count": len(all_items), "items": all_items}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"写入 {out_json} 共 {len(all_items)} 条（去重后）")


if __name__ == "__main__":
    main()
