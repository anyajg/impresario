#!/usr/bin/env bash
# 将 macOS 下经纪人备考资料中的 .docx 转为纯文本（stdout）。
# 说明：部分题库 Word 以图片排版，textutil 会得到空或极少文字，需 OCR 或手工整理。
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "用法: $0 <文件.docx>" >&2
  exit 1
fi
exec textutil -stdout -convert txt "$1"
