#!/usr/bin/env python3
"""
broker_extract.py — 从目录中的 PDF / 图片型 DOCX 抽取纯文本。

依赖（Homebrew）：poppler（pdftotext）、tesseract、tesseract-lang（chi_sim 等）。

用法示例：
  python3 broker_extract.py -i "/path/经纪人备考/题库.../模拟题" -o ../broker-extracted
  python3 broker_extract.py -i /data --recursive -o ./out
  python3 broker_extract.py --pdf /a/1.pdf /a/2.pdf --docx /b/x.docx -o ./sample-out

说明：DOCX 分支会解压 word/media/ 下的图片并按文件名排序后依次 OCR（chi_sim+eng），
适合整页扫成图片的题库 Word；普通文字型 DOCX 请用 pandoc/textutil。
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path


def _run(cmd: list[str], *, cwd: Path | None = None) -> tuple[int, str, str]:
    p = subprocess.run(cmd, cwd=str(cwd) if cwd else None, capture_output=True, text=True)
    return p.returncode, p.stdout or "", p.stderr or ""


def _require_bin(name: str) -> str:
    path = shutil.which(name)
    if not path:
        sys.stderr.write(f"缺少可执行文件: {name}（请先 brew install 对应包）\n")
        sys.exit(2)
    return path


def _natural_key(s: str) -> list:
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", s)]


def pdf_to_txt(pdf: Path, out_txt: Path, pdftotext: str) -> None:
    out_txt.parent.mkdir(parents=True, exist_ok=True)
    code, _, err = _run([pdftotext, "-q", "-enc", "UTF-8", str(pdf), str(out_txt)])
    if code != 0:
        raise RuntimeError(f"pdftotext 失败 ({pdf}): {err.strip()}")


def docx_images_to_txt(docx: Path, out_txt: Path, tesseract: str) -> None:
    media_ext = {".png", ".jpg", ".jpeg", ".gif", ".tif", ".tiff", ".bmp", ".webp"}
    out_txt.parent.mkdir(parents=True, exist_ok=True)
    chunks: list[str] = []
    header = f"===== DOCX: {docx.name} =====\n路径: {docx}\n\n"
    chunks.append(header)

    with tempfile.TemporaryDirectory(prefix="docxocr_") as tmp:
        root = Path(tmp)
        with zipfile.ZipFile(docx, "r") as zf:
            media_names = sorted(
                (n for n in zf.namelist() if n.startswith("word/media/") and Path(n).suffix.lower() in media_ext),
                key=_natural_key,
            )
            if not media_names:
                chunks.append("(未在 word/media/ 中发现可 OCR 的图片)\n")
                out_txt.write_text("".join(chunks), encoding="utf-8")
                return
            for name in media_names:
                dest = root / Path(name).name
                dest.write_bytes(zf.read(name))
                code, text, err = _run(
                    [tesseract, str(dest), "stdout", "-l", "chi_sim+eng", "--psm", "3"],
                )
                if code != 0:
                    chunks.append(f"--- {name} [OCR 失败] ---\n{err.strip()}\n\n")
                    continue
                chunks.append(f"--- 图片: {Path(name).name} ---\n")
                chunks.append(text.strip() + "\n\n")

    out_txt.write_text("".join(chunks), encoding="utf-8")


def _collect_pdfs(paths: list[Path], roots: list[Path], recursive: bool) -> list[Path]:
    found: list[Path] = []
    for p in paths:
        if p.is_file() and p.suffix.lower() == ".pdf":
            found.append(p.resolve())
    for root in roots:
        r = root.resolve()
        if r.is_file():
            if r.suffix.lower() == ".pdf":
                found.append(r)
            continue
        pat = "**/*.pdf" if recursive else "*.pdf"
        found.extend(sorted(p.resolve() for p in r.glob(pat) if p.is_file()))
    seen: set[Path] = set()
    uniq: list[Path] = []
    for p in found:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq


def _collect_docx(paths: list[Path], roots: list[Path], recursive: bool) -> list[Path]:
    found: list[Path] = []
    for p in paths:
        if p.is_file() and p.suffix.lower() == ".docx":
            found.append(p.resolve())
    for root in roots:
        r = root.resolve()
        if r.is_file():
            if r.suffix.lower() == ".docx":
                found.append(r)
            continue
        pat = "**/*.docx" if recursive else "*.docx"
        found.extend(sorted(p.resolve() for p in r.glob(pat) if p.is_file()))
    seen: set[Path] = set()
    uniq: list[Path] = []
    for p in found:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq


def main() -> None:
    ap = argparse.ArgumentParser(description="PDF 文本抽取 + 图片型 DOCX OCR")
    ap.add_argument("-i", "--input", action="append", default=[], help="输入目录（可多次）")
    ap.add_argument("--pdf", action="append", default=[], help="单个或多个 PDF 文件")
    ap.add_argument("--docx", action="append", default=[], help="单个或多个 DOCX（OCR media 图片）")
    ap.add_argument("-o", "--output", type=Path, required=True, help="输出根目录")
    ap.add_argument("-r", "--recursive", action="store_true", help="在输入目录下递归查找")
    args = ap.parse_args()

    roots = [Path(p) for p in args.input]
    pdf_paths = [Path(p) for p in (args.pdf or [])]
    docx_paths = [Path(p) for p in (args.docx or [])]

    if not roots and not pdf_paths and not docx_paths:
        ap.error("请至少提供 --input、--pdf 或 --docx")

    out_root = args.output.expanduser().resolve()
    out_root.mkdir(parents=True, exist_ok=True)

    pdftotext = _require_bin("pdftotext")
    tesseract = _require_bin("tesseract")

    pdfs = _collect_pdfs(pdf_paths, roots, args.recursive)
    docxs = _collect_docx(docx_paths, roots, args.recursive)

    anchor_dirs = [d.resolve() for d in roots if d.is_dir()]

    def rel_under_anchors(f: Path) -> Path:
        for ad in anchor_dirs:
            try:
                return f.relative_to(ad)
            except ValueError:
                continue
        return Path(f.name)

    errors: list[str] = []
    for pdf in pdfs:
        rel = rel_under_anchors(pdf)
        target = out_root / "pdf" / rel.with_suffix(".txt")
        try:
            pdf_to_txt(pdf, target, pdftotext)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{pdf}: {e}")

    for docx in docxs:
        rel = rel_under_anchors(docx)
        target = out_root / "docx_ocr" / rel.with_suffix(".txt")
        try:
            docx_images_to_txt(docx, target, tesseract)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{docx}: {e}")

    print(f"输出目录: {out_root}")
    print(f"PDF 处理数: {len(pdfs)}, DOCX(OCR) 处理数: {len(docxs)}")
    if errors:
        print("失败条目:", file=sys.stderr)
        for e in errors:
            print(e, file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
