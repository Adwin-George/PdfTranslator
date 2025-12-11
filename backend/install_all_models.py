#!/usr/bin/env python3
"""
Install Argos Translate models for:

en <-> hi
en <-> fr
en <-> es
en <-> ar
en <-> zh
en <-> ru
en <-> ja

Run using:
    python install_models.py
"""

import argostranslate.package
import argostranslate.translate
import os

print("\n⏳ Updating Argos package index...")
argostranslate.package.update_package_index()
available = argostranslate.package.get_available_packages()

# List of desired pairs
pairs = [
    ("en", "hi"),
    ("hi", "en"),
    ("en", "fr"),
    ("fr", "en"),
    ("en", "es"),
    ("es", "en"),
    ("en", "ar"),
    ("ar", "en"),
    ("en", "zh"),
    ("zh", "en"),
    ("en", "ru"),
    ("ru", "en"),
    ("en", "ja"),
    ("ja", "en"),
]

print("\n🔍 Checking and installing models...\n")

installed = []
skipped = []

for src, tgt in pairs:
    pkg = next((p for p in available if p.from_code == src and p.to_code == tgt), None)
    if not pkg:
        print(f"❌ Model not found: {src} → {tgt}")
        skipped.append((src, tgt))
        continue

    print(f"⬇️ Installing {src} → {tgt} ...")
    download_path = pkg.download()
    argostranslate.package.install_from_path(download_path)
    print(f"✅ Installed: {src} → {tgt}\n")
    installed.append((src, tgt))

print("\n🎉 INSTALLATION COMPLETE 🎉")
print("Installed pairs:", installed)
print("Skipped (not available):", skipped)
