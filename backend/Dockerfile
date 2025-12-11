# --------------------------
# 1) Base Linux image
# --------------------------
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# --------------------------
# 2) Install system packages
# --------------------------
RUN apt update && apt install -y \
    software-properties-common \
    curl wget git unzip \
    python3 python3-pip \
    nodejs npm \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-jpn \
    tesseract-ocr-spa \
    tesseract-ocr-fra \
    tesseract-ocr-chi-sim \
    fonts-noto \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    && apt clean

# --------------------------
# 3) Python packages
# --------------------------
RUN pip3 install --upgrade pip
RUN pip3 install argostranslate ctranslate2 sentencepiece spacy

# --------------------------
# 4) Install Argos models
# --------------------------
RUN python3 - <<EOF
import argostranslate.package, argostranslate.translate
argostranslate.package.update_package_index()

pairs = [
    ("en","hi"), ("hi","en"),
    ("en","fr"), ("fr","en"),
    ("en","es"), ("es","en"),
    ("en","ja"), ("ja","en"),
    ("en","zh"), ("zh","en"),
    ("en","ar"), ("ar","en"),
    ("en","ru"), ("ru","en")
]

available = argostranslate.package.get_available_packages()

for fr, to in pairs:
    try:
        pkg = next(p for p in available if p.from_code==fr and p.to_code==to)
        path = pkg.download()
        argostranslate.package.install_from_path(path)
        print("Installed:", fr, "->", to)
    except:
        print("Missing:", fr, "->", to)
EOF

# --------------------------
# 5) Copy backend source code
# --------------------------
WORKDIR /app
COPY . .

# --------------------------
# 6) Install node dependencies
# --------------------------
RUN npm install

# --------------------------
# 7) Expose backend
# --------------------------
EXPOSE 5000
CMD ["node", "server.js"]
