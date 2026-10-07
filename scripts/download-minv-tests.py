"""Download every Slovak test and referenced image from MV SR's public example.

Run from any directory: python scripts/download-minv-tests.py
Only Python's standard library is required. Existing images are verified and reused.
"""

import concurrent.futures
import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/minv"
PAGE = "https://www.minv.sk/egovinet02/PCPZobrazFile?fileName=test2.html"
ENDPOINT = "https://www.minv.sk/egovinet02/PCPZobrazFile?fileName="


def fetch(url):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Autoskola-assets-import/1.0"})
            with urllib.request.urlopen(req, timeout=60) as response:
                return response.read(), dict(response.headers.items())
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def image_format(data):
    # Some official .jpg paths actually contain PNG bytes. Preserve source names.
    if data.startswith(b"\x89PNG\r\n\x1a\n") and data.endswith(b"IEND\xaeB`\x82"):
        return "png"
    if data.startswith(b"\xff\xd8\xff") and data.rstrip().endswith(b"\xff\xd9"):
        return "jpeg"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "gif"
    return None


def download_image(source_path):
    path = Path(source_path)
    if path.is_absolute() or ".." in path.parts or "\\" in source_path:
        raise ValueError(f"Unsafe image path: {source_path}")
    target = OUT / "images" / path
    url = ENDPOINT + urllib.parse.quote("pcpfiles/" + source_path, safe="/")
    content = target.read_bytes() if target.exists() else b""
    if not image_format(content):
        content, _ = fetch(url)
        if not image_format(content):
            raise ValueError(f"Invalid or incomplete image: {url}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
    return {
        "path": "images/" + source_path,
        "sourceUrl": url,
        "bytes": len(content),
        "format": image_format(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    page, _ = fetch(PAGE)
    html = page.decode("utf-8-sig")
    match = re.search(r'src="([^"<>]*fileName=pcpfiles/[^"<>]+\.js)"', html)
    if not match:
        raise ValueError("Cannot discover the page's data script")
    data_url = urllib.parse.urljoin(PAGE, match.group(1))
    data_bytes, headers = fetch(data_url)
    script = data_bytes.decode("utf-8-sig")
    match = re.fullmatch(r"\s*var\s+data\s*=\s*(\[.*\])\s*;?\s*", script, re.DOTALL)
    if not match:
        raise ValueError("Unexpected data format (JavaScript is never executed)")
    slovak = json.loads(match.group(1))[0]  # lang=1 maps to data[0] in the official application.
    if not slovak:
        raise ValueError("Empty Slovak dataset")
    questions = {}
    tests = []
    categories = {}
    images = set()
    occurrences = 0
    for source in slovak:
        test_questions = []
        starts = sorted((int(value[0]["zacina"]), int(key), value[0]["txt"])
                        for key, value in source["okruhy"].items())
        for position, category_id, title in starts:
            if category_id in categories and categories[category_id]["title"] != title:
                raise ValueError("Inconsistent category title")
            categories[category_id] = {"id": category_id, "title": title}
        for key in sorted(source["otazky"], key=int):
            position = int(key)
            q = source["otazky"][key][0]
            answers = [answer["odpoved"] for answer in source["odpovede"][key]]
            correct = q["platna"] - 1
            if len(answers) != 3 or not 0 <= correct < len(answers):
                raise ValueError("Invalid answers")
            category = max(item for item in starts if item[0] <= position)[1]
            question = {
                "id": q["id"], "text": q["text"], "points": q["body"],
                "categoryId": category,
                "image": "images/" + q["obrazok"] if q["obrazok"] else None,
                "answers": answers, "correctAnswerIndex": correct,
            }
            if q["obrazok"]:
                images.add(q["obrazok"])
            if q["id"] in questions:
                existing = questions[q["id"]]
                if (existing["text"] != question["text"] or existing["image"] != question["image"]
                        or existing["points"] != question["points"]
                        or existing["categoryId"] != category
                        or sorted(existing["answers"]) != sorted(answers)
                        or existing["answers"][existing["correctAnswerIndex"]] != answers[correct]):
                    raise ValueError(f"Conflicting question ID {q['id']}")
            else:
                questions[q["id"]] = question
            test_questions.append({"position": position, **question})
            occurrences += 1
        if len(test_questions) != source["pocet"] or sum(q["points"] for q in test_questions) != source["maxbody"]:
            raise ValueError("Invalid test totals")
        tests.append({
            "id": source["cislo"], "questionCount": source["pocet"],
            "timeLimitSeconds": source["cas"], "passingPoints": source["minbody"],
            "maxPoints": source["maxbody"], "questions": test_questions,
        })
    if len({t["id"] for t in tests}) != len(tests):
        raise ValueError("Duplicate test IDs")
    image_manifest = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for count, item in enumerate(pool.map(download_image, sorted(images)), 1):
            image_manifest.append(item)
            if count % 25 == 0 or count == len(images):
                print(f"Images verified: {count}/{len(images)}", flush=True)
    write_json("tests.sk.json", tests)
    compact = []
    for test in tests:
        compact.append({
            **{key: value for key, value in test.items() if key != "questions"},
            "questions": [{
                "position": q["position"], "questionId": q["id"],
                "answerOrder": [questions[q["id"]]["answers"].index(answer) for answer in q["answers"]],
                "correctAnswerIndex": q["correctAnswerIndex"],
            } for q in test["questions"]],
        })
    write_json("tests.compact.json", compact)
    write_json("questions.sk.json", sorted(questions.values(), key=lambda q: q["id"]))
    write_json("categories.sk.json", sorted(categories.values(), key=lambda c: c["id"]))
    write_json("images.json", image_manifest)
    write_json("source.sk.json", slovak)
    metadata = {
        "sourcePage": PAGE, "sourceDataUrl": data_url,
        "downloadedAt": datetime.now(timezone.utc).isoformat(), "language": "sk",
        "scope": "All Slovak tests in the public example linked by sourcePage; not a verified complete internal examination question bank.",
        "testCount": len(tests), "questionOccurrences": occurrences,
        "uniqueQuestionCount": len(questions), "imageCount": len(images),
        "dataSha256": hashlib.sha256(data_bytes).hexdigest(),
        "httpLastModified": next((v for k, v in headers.items() if k.lower() == "last-modified"), None),
        "correctAnswerIndexBase": 0,
        "imagePathBase": "src/assets/minv/",
    }
    write_json("metadata.json", metadata)
    print(json.dumps(metadata, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
