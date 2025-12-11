#!/usr/bin/env python3
# translate.py
import sys
import json
import traceback

def safe_print_json(obj):
    out = json.dumps(obj, ensure_ascii=False)
    try:
        sys.stdout.buffer.write(out.encode("utf-8"))
    except Exception:
        sys.stdout.buffer.write(out.encode("utf-8", "replace"))
    sys.stdout.buffer.flush()

try:
    raw = sys.stdin.read()
    if not raw:
        safe_print_json({"success": False, "error": "No input received"})
        sys.exit(0)
    data = json.loads(raw)
    text = data.get("text", "")
    source = data.get("sourceLanguage", "auto")
    targets = data.get("targets", [])
    if not text or not targets:
        safe_print_json({"success": False, "error": "text and targets required"})
        sys.exit(0)
    try:
        import argostranslate.translate
    except Exception as e:
        safe_print_json({"success": False, "error": "argostranslate import error", "details": str(e)})
        sys.exit(0)

    installed = argostranslate.translate.get_installed_languages()

    def has_pair(from_code, to_code):
        for l in installed:
            if l.code == from_code:
                for t in getattr(l, "translations_from", []):
                    if getattr(t.to_lang, "code", None) == to_code:
                        return True
        return False

    # choose source if "auto"
    used_source = source
    if source == "auto":
        # prefer en if it can translate to at least one requested target
        if any(l.code == "en" for l in installed):
            # pick en if en -> any target exists
            for tgt in targets:
                if has_pair("en", tgt):
                    used_source = "en"
                    break
        # otherwise pick first installed that can translate to first target
        if used_source == "auto":
            chosen = None
            for l in installed:
                for tgt in targets:
                    if has_pair(l.code, tgt):
                        chosen = l.code
                        break
                if chosen:
                    break
            if chosen:
                used_source = chosen
    # prepare result map
    result = {"success": True, "usedSource": used_source, "translations": {}, "errors": {}}

    for tgt in targets:
        try:
            if not has_pair(used_source, tgt):
                # try transitive: source -> en -> tgt
                if used_source != "en" and has_pair(used_source, "en") and has_pair("en", tgt):
                    # do two-step composite translation via en
                    first = argostranslate.translate.translate(text, used_source, "en")
                    trans = argostranslate.translate.translate(first, "en", tgt)
                else:
                    raise Exception(f"No model for {used_source} -> {tgt}")
            else:
                trans = argostranslate.translate.translate(text, used_source, tgt)
            result["translations"][tgt] = trans
        except Exception as e:
            result["errors"][tgt] = str(e)
    safe_print_json(result)
except Exception as main_e:
    tb = traceback.format_exc()
    safe_print_json({"success": False, "error": "Unhandled error", "details": str(main_e), "trace": tb})
