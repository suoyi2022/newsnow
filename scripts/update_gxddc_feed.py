from __future__ import annotations

import email.utils
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path


KEYWORDS = [
    "共享单车",
    "共享电单车",
    "共享电动自行车",
    "共享电动车",
    "公共自行车",
    "公共电单车",
    "互联网租赁自行车",
    "两轮车换电",
    "电动自行车换电",
    "换电柜",
    "单车运维",
    "共享单车回收",
    "电动自行车合规",
    "城市准入",
    "电子围栏",
    "共享单车招标",
    "共享单车采购",
    "共享单车投诉",
]

MOBILITY_PATTERN = re.compile(
    r"共享(?:单车|电单车|电动自行车|电动车|自行车|助力车|两轮车)"
    r"|公共(?:自行车|电单车|助力车)"
    r"|互联网租赁(?:自行车|电动自行车)|电动自行车|两轮车"
)
INDUSTRY_PATTERN = re.compile(r"换电|运维|回收|合规|准入|电子围栏|招标|采购|投诉")
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "data" / "gxddc.json"


def is_relevant(title: str) -> bool:
    normalized = re.sub(r"\s+", "", title)
    return bool(
        MOBILITY_PATTERN.search(normalized)
        or "换电柜" in normalized
        or ("单车" in normalized and INDUSTRY_PATTERN.search(normalized))
    )


def fetch_group(keywords: list[str]) -> list[dict[str, str]]:
    query = " OR ".join(f'"{keyword}"' for keyword in keywords)
    params = urllib.parse.urlencode(
        {"q": query, "hl": "zh-CN", "gl": "CN", "ceid": "CN:zh-Hans"}
    )
    request = urllib.request.Request(
        f"https://news.google.com/rss/search?{params}",
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        root = ET.fromstring(response.read())

    items: list[dict[str, str]] = []
    for entry in root.findall("./channel/item"):
        title = html.unescape(entry.findtext("title", "")).strip()
        link = entry.findtext("link", "").strip()
        pub_date = entry.findtext("pubDate", "").strip()
        if title and link and pub_date and is_relevant(title):
            items.append({"title": title, "url": link, "pubDate": pub_date})
    return items


def timestamp(item: dict[str, str]) -> float:
    try:
        return email.utils.parsedate_to_datetime(item["pubDate"]).timestamp()
    except (TypeError, ValueError):
        return 0


def stable_identity(item: dict[str, str]) -> tuple[str, str]:
    headline = item["title"].rsplit(" - ", 1)[0]
    return (re.sub(r"\s+", "", headline).casefold(), item["pubDate"])


def main() -> int:
    items: list[dict[str, str]] = []
    errors: list[str] = []
    for index in range(0, len(KEYWORDS), 6):
        try:
            items.extend(fetch_group(KEYWORDS[index : index + 6]))
        except Exception as error:  # Keep the last good snapshot if every group fails.
            errors.append(f"group {index // 6 + 1}: {error}")

    unique: dict[str, dict[str, str]] = {}
    for item in items:
        fingerprint = re.sub(r"\s+", "", item["title"]).casefold()
        unique.setdefault(fingerprint, item)

    latest = sorted(unique.values(), key=timestamp, reverse=True)[:30]
    if not latest:
        print("No valid mobility news; previous snapshot preserved.", file=sys.stderr)
        for error in errors:
            print(error, file=sys.stderr)
        return 1

    previous_items: list[dict[str, str]] = []
    if OUTPUT.exists():
        try:
            previous_items = json.loads(OUTPUT.read_text(encoding="utf-8")).get("items", [])
        except (OSError, json.JSONDecodeError):
            pass

    previous_by_identity = {stable_identity(item): item for item in previous_items}
    latest = [previous_by_identity.get(stable_identity(item), item) for item in latest]

    if latest == previous_items:
        print(f"Snapshot unchanged ({len(latest)} items).")
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "keywords": KEYWORDS,
        "items": latest,
    }
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Updated snapshot with {len(latest)} items.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
