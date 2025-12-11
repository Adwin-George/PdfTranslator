import argostranslate.package
import argostranslate.translate

print("Updating package index...")
argostranslate.package.update_package_index()

available = argostranslate.package.get_available_packages()

needed = [
    ("en", "hi"),
    ("en", "ta"),
    ("en", "ml"),
    ("en", "fr"),
    ("en", "es"),
    ("hi", "en"),
    ("ta", "en"),
    ("ml", "en"),
]

for src, tgt in needed:
    try:
        print(f"Installing {src} → {tgt} ...")
        pkg = next(p for p in available if p.from_code == src and p.to_code == tgt)
        argostranslate.package.install_from_path(pkg.download())
        print(f"{src} → {tgt} installed.")
    except StopIteration:
        print(f"Model not found for {src} → {tgt}")
    except Exception as e:
        print(f"Error installing {src}->{tgt}: {e}")

print("All installs complete.")
