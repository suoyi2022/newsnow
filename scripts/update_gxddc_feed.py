from __future__ import annotations

import difflib
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
HIGH_VALUE_PATTERN = re.compile(
    r"国标|标准|政策|规范|招标|采购|中标|准入|监管|管理|运营|投放|运维|回收"
    r"|合规|电子围栏|调价|成本|亏损|企业|项目|交通局|市场监管|工信部"
)
AUTHORITY_PATTERN = re.compile(
    r"政府|交通运输|公安|人民|新华社|央视|光明网|京报网|澎湃|封面新闻|scol"
    r"|中国政府采购|财政|市监|工信"
)
LOW_VALUE_PATTERN = re.compile(
    r"偷|盗窃|奇葩|坐车篮|手扶梯|1分钟|独特优势|家用|发财|落网"
    r"|最美风景|神画面|火了|赏心悦目|复制粘贴"
)
FOREIGN_PATTERN = re.compile(r"苏必利尔|河内|Fortune Business|RTD-Denver")
AGGREGATOR_PATTERN = re.compile(r"搜狐|新浪|中华网|汽车之家")
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


def headline_core(title: str) -> str:
    return title.rsplit(" - ", 1)[0].strip()


def quality_score(item: dict[str, str]) -> int:
    title = item["title"]
    score = 0
    if HIGH_VALUE_PATTERN.search(title):
        score += 5
    if AUTHORITY_PATTERN.search(title):
        score += 3
    if LOW_VALUE_PATTERN.search(title):
        score -= 8
    if FOREIGN_PATTERN.search(title):
        score -= 6
    if AGGREGATOR_PATTERN.search(title):
        score -= 2
    return score


def event_bucket(title: str) -> str | None:
    normalized = re.sub(r"\s+", "", headline_core(title))
    if "共享单车" in normalized and re.search(r"偷|盗窃|废铁|落网", normalized):
        return "shared-bike-theft"
    if re.search(r"共享单车|互联网租赁自行车", normalized) and re.search(r"国标|国家标准|服务规范", normalized):
        return "shared-bike-standard"
    return None


def is_same_event(left: dict[str, str], right: dict[str, str]) -> bool:
    distance = abs(timestamp(left) - timestamp(right))
    left_bucket = event_bucket(left["title"])
    if left_bucket and left_bucket == event_bucket(right["title"]) and distance <= 45 * 86400:
        return True
    if distance > 14 * 86400:
        return False
    left_title = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", headline_core(left["title"]).casefold())
    right_title = re.sub(r"[^0-9a-z\u4e00-\u9fff]", "", headline_core(right["title"]).casefold())
    return difflib.SequenceMatcher(None, left_title, right_title).ratio() >= 0.62


def stable_identity(item: dict[str, str]) -> tuple[str, str]:
    headline = headline_core(item["title"])
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

    candidates = [item for item in unique.values() if quality_score(item) >= 0]
    candidates.sort(key=lambda item: timestamp(item) + quality_score(item) * 5 * 86400, reverse=True)

    latest: list[dict[str, str]] = []
    for item in candidates:
        if any(is_same_event(item, selected) for selected in latest):
            continue
        latest.append(item)
        if len(latest) == 30:
            break

    latest.sort(key=timestamp, reverse=True)
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
