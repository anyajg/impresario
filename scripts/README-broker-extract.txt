broker_extract.py — PDF pdftotext；图片型 DOCX 解压 word/media 后 tesseract（chi_sim+eng）。

安装（建议关闭自动更新以加快）：HOMEBREW_NO_AUTO_UPDATE=1 brew install poppler tesseract tesseract-lang pandoc

示例：
  python3 /Users/FIRE_1/coden/impresario/scripts/broker_extract.py -i "/Users/FIRE_1/Documents/经纪人备考/题库题库（含冲刺卷、押题卷等）/模拟题" -o /Users/FIRE_1/coden/impresario/broker-extracted
  python3 .../broker_extract.py --pdf a.pdf --docx b.docx -o ./out --recursive -i ./资料

build_auto_questions.py — 递归处理备考目录下全部 .pdf / .docx / .doc，解析客观题，生成 src/data/questions.auto.json（再由 questions.auto.ts 并入应用）。
  python3 scripts/build_auto_questions.py --root "/Users/FIRE_1/Documents/经纪人备考" --out-json src/data/questions.auto.json --cache-dir broker-extracted-full
  # 可选：对 textutil 过短的 docx 再跑 OCR（很慢）
  python3 scripts/build_auto_questions.py --root "..." --out-json src/data/questions.auto.json --ocr-docx
