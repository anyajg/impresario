#!/usr/bin/env python3
"""
生成 src/data/knowledge.json：
  1) 「经纪人考试考点.docx」textutil 抽文本后分段（讲义纲要）
  2) 备考目录下 PDF：pdftotext，启发式切块；明显「题库/模考卷」跳过

用法：
  python3 scripts/build_knowledge_json.py
  python3 scripts/build_knowledge_json.py --root "/path/经纪人备考"
  python3 scripts/build_knowledge_json.py --max-articles 2000
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

DOCX_SOURCE = Path(
    "/Users/FIRE_1/Documents/经纪人备考/题库题库（含冲刺卷、押题卷等）/word版/经纪人考试考点.docx"
)
DEFAULT_ROOT = Path("/Users/FIRE_1/Documents/经纪人备考")
OUT = Path(__file__).resolve().parent.parent / "src" / "data" / "knowledge.json"

MAX_CONTENT_LEN = 48000
CHUNK_SOFT = 11000


def chapter_for_title(title: str) -> int:
    t = title
    if any(k in t for k in ("舞台", "灯光", "音响", "布景", "视频", "效果", "装卸", "排练")):
        return 3
    if any(k in t for k in ("安全", "秩序", "险", "消防", "疏散", "治安", "大型群众性")):
        return 4
    if any(
        k in t
        for k in (
            "经纪人",
            "洽谈",
            "票价",
            "风险",
            "协议",
            "歌友会",
            "公益",
            "佣金",
            "周期",
            "成本",
        )
    ):
        return 2
    if any(k in t for k in ("条例", "法律", "法规", "著作权", "竞争", "文化部", "资格认定")):
        return 1
    return 1


def chapter_from_path(rel: str) -> int:
    r = rel.replace("\\", "/")
    if any(k in r for k in ("思想政治", "法律", "法规", "宪法", "民法")):
        return 1
    if any(k in r for k in ("安全", "消防", "应急", "治安", "大型群众性")):
        return 4
    if any(k in r for k in ("舞台", "艺术", "舞美", "实务", "市场政策", "经纪实务")):
        return 3
    if any(k in r for k in ("经纪", "市场", "基础")):
        return 2
    return 1


def normalize_ws(s: str) -> str:
    s = s.replace("\x0c", "\n").replace("\r", "\n")
    for _ in range(16):
        ns = re.sub(r"([\u4e00-\u9fff])\s([\u4e00-\u9fff])", r"\1\2", s)
        if ns == s:
            break
        s = ns
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def strip_pdf_noise(s: str) -> str:
    s = re.sub(r"专业网校课程[\s\S]{0,220}?职业考试学习平台\s*", "", s)
    s = re.sub(r"钉题库演出经纪人[\s\S]{0,100}?资格\s*", "", s)
    s = re.sub(r"慧考智学官网[\s\S]{0,120}?版权所有\s*", "", s)
    return s


def content_fingerprint(content: str) -> str:
    t = re.sub(r"\s+", "", content)[:400]
    return hashlib.sha256(t.encode("utf-8", errors="ignore")).hexdigest()


def looks_like_exam_bank(text: str, rel_path: str) -> bool:
    """明显题库/模考卷：跳过；讲义 PDF 保留。"""
    rp = rel_path.replace("\\", "/")
    ref = text.count("参考答案")
    par = text.count("【解析】")
    if "模拟试卷" in rp or "/模拟题/" in rp:
        if ref >= 4 or par >= 2:
            return True
    if ref >= 22:
        return True
    if par >= 14:
        return True
    lines = [ln for ln in text.split("\n") if ln.strip()][:280]
    if len(lines) < 40:
        return False
    num_starts = sum(1 for ln in lines if re.match(r"^\s*\d{1,3}[\.．、]", ln))
    if num_starts / len(lines) > 0.28 and ("单项选择" in text or "多项选择" in text) and ref >= 6:
        return True
    return False


def split_sections_docx(text: str) -> list[tuple[str, str]]:
    lines = [ln.rstrip() for ln in text.splitlines()]
    buf: list[str] = []
    sections: list[tuple[str, str]] = []

    def flush(title: str, body_lines: list[str]) -> None:
        body = "\n".join(body_lines).strip()
        if len(body) < 40:
            return
        sections.append((title[:120], body[:MAX_CONTENT_LEN]))

    title = "备考知识点"
    for ln in lines:
        if not ln.strip():
            if buf:
                buf.append("")
            continue
        stripped = ln.strip()
        maybe_title = (
            len(stripped) <= 52
            and not re.match(r"^[\d（]", stripped)
            and not stripped.startswith("（")
            and "详见" not in stripped
            and "：" not in stripped[:25]
        ) or (
            len(stripped) <= 60
            and stripped.endswith("：")
            and not re.match(r"^第[一二三四五六七八九十\d]+条", stripped)
        )
        if maybe_title and buf and sum(len(x) for x in buf) > 180:
            flush(title, buf)
            title = stripped.rstrip("：").strip() or stripped
            buf = []
        else:
            buf.append(stripped)

    if buf:
        flush(title, buf)
    return sections


def docx_to_text(path: Path) -> str:
    r = subprocess.run(
        ["textutil", "-stdout", "-convert", "txt", str(path)],
        capture_output=True,
        text=True,
    )
    return r.stdout or "" if r.returncode == 0 else ""


def pdf_to_text(path: Path, pdftotext: str) -> str:
    p = subprocess.run(
        [pdftotext, "-q", "-enc", "UTF-8", str(path), "-"],
        capture_output=True,
        text=True,
    )
    return p.stdout or "" if p.returncode == 0 else ""


def split_pdf_into_articles(text: str, stem: str, rel: str) -> list[tuple[str, str]]:
    """按大标题切分，过长则按段落再切。"""
    t = strip_pdf_noise(normalize_ws(text))
    if len(t) < 400:
        return []

    # 按「第X章」「一、」类标题切
    pieces = re.split(
        r"(?=\n(?:第[一二三四五六七八九十百千零\d两]+[章节篇编]|[一二三四五六七八九十百千]+[、．]\s*[^\n]{0,40}))",
        "\n" + t,
    )
    pieces = [p.strip() for p in pieces if len(p.strip()) > 350]

    if len(pieces) <= 1:
        pieces = re.split(r"\n{2,}", t)
        pieces = [p.strip() for p in pieces if len(p.strip()) > 350]

    out: list[tuple[str, str]] = []
    for i, p in enumerate(pieces):
        first = p.split("\n", 1)[0].strip()[:80]
        base = first if len(first) >= 4 and len(first) < 70 else stem
        if len(p) <= CHUNK_SOFT + 2000:
            out.append((base, p[:MAX_CONTENT_LEN]))
            continue
        paras = re.split(r"\n{2,}", p)
        buf: list[str] = []
        cur = 0
        part = 1
        for para in paras:
            lp = len(para) + 2
            if cur + lp > CHUNK_SOFT and buf:
                title = base if part == 1 else f"{base}（{part}）"
                out.append((title[:120], "\n\n".join(buf)[:MAX_CONTENT_LEN]))
                part += 1
                buf = [para]
                cur = lp
            else:
                buf.append(para)
                cur += lp
        if buf:
            title = base if part == 1 else f"{base}（{part}）"
            out.append((title[:120], "\n\n".join(buf)[:MAX_CONTENT_LEN]))
    return out[:22]


def build_docx_items(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = docx_to_text(path)
    if len(text) < 80:
        return []
    pairs = split_sections_docx(text)
    items = []
    for title, content in pairs:
        items.append(
            {
                "chapter": chapter_for_title(title),
                "title": title,
                "content": content,
                "source": path.name,
            }
        )
    return items


def build_pdf_items(root: Path, pdftotext: str) -> list[dict]:
    items: list[dict] = []
    for pdf in sorted(root.rglob("*.pdf")):
        try:
            rel = str(pdf.relative_to(root))
        except ValueError:
            rel = pdf.name
        txt = pdf_to_text(pdf, pdftotext)
        if len(txt) < 400:
            continue
        if looks_like_exam_bank(txt, rel):
            continue
        stem = pdf.stem[:60]
        ch = chapter_from_path(rel)
        for title, body in split_pdf_into_articles(txt, stem, rel):
            ct = chapter_for_title(title)
            use_ch = ct if ct != 1 else ch
            items.append(
                {
                    "chapter": use_ch,
                    "title": title[:120],
                    "content": body,
                    "source": rel.replace("\\", "/"),
                }
            )
    return items


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="备考资料根目录（递归 PDF）")
    ap.add_argument("--docx", type=Path, default=DOCX_SOURCE, help="考点 docx 路径")
    ap.add_argument("--no-docx", action="store_true")
    ap.add_argument("--no-pdf", action="store_true")
    ap.add_argument("--max-articles", type=int, default=2500, help="总篇数上限（含 docx）")
    args = ap.parse_args()

    merged: list[dict] = []
    if not args.no_docx:
        merged.extend(build_docx_items(args.docx))
    pdftotext = shutil.which("pdftotext")
    if not args.no_pdf:
        if not pdftotext:
            print("警告：未找到 pdftotext，跳过 PDF（brew install poppler）", file=sys.stderr)
        else:
            merged.extend(build_pdf_items(args.root.expanduser().resolve(), pdftotext))

    seen: set[str] = set()
    final: list[dict] = []
    for it in merged:
        fp = content_fingerprint(it["content"])
        if fp in seen:
            continue
        seen.add(fp)
        final.append(it)
        if len(final) >= args.max_articles:
            break

    for i, it in enumerate(final, start=1):
        it["id"] = i

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"version": 2, "items": final}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"写入 {OUT}，共 {len(final)} 篇（docx: {not args.no_docx}, pdf: {bool(pdftotext) and not args.no_pdf}）")


if __name__ == "__main__":
    main()
