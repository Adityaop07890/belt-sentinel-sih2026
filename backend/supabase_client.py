"""Thin async Supabase PostgREST client (REST-only, uses anon key).

We deliberately avoid the supabase-py SDK to keep the dependency footprint small
and because all our operations are simple table reads/writes via PostgREST.
"""
from __future__ import annotations
import os
import httpx
from typing import Any, Dict, List, Optional


def _url() -> str:
    return os.environ.get("SUPABASE_URL", "").rstrip("/")


def _key() -> str:
    return os.environ.get("SUPABASE_ANON_KEY", "")


# Backwards-compat module attributes (used by seed script)
SUPABASE_URL = _url()
SUPABASE_KEY = _key()


def _headers(prefer: Optional[str] = None) -> Dict[str, str]:
    key = _key()
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


class SupabaseError(RuntimeError):
    def __init__(self, status: int, body: str):
        super().__init__(f"Supabase {status}: {body[:400]}")
        self.status = status
        self.body = body


def is_configured() -> bool:
    return bool(_url() and _key())


async def select(
    table: str,
    *,
    filters: Optional[Dict[str, str]] = None,
    order: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    select_cols: str = "*",
    count: Optional[str] = None,      # "exact" | "planned" | "estimated"
    paginate: bool = False,           # fetch all rows in 1000-row pages
) -> Dict[str, Any]:
    """Return {"rows": [...], "count": int|None}.

    Note: Supabase PostgREST enforces a hard `db-max-rows=1000` cap on every
    response. Pass `paginate=True` to transparently walk the result set with the
    HTTP Range header until all rows are fetched. When `paginate=True`, `limit`
    is treated as an upper bound; pagination stops once that many rows have been
    collected or the source is exhausted.
    """
    if paginate:
        collected: List[Dict[str, Any]] = []
        page = 1000
        page_offset = 0
        while True:
            take = page if limit is None else min(page, limit - len(collected))
            if take <= 0:
                break
            r = await _select_page(
                table, filters=filters, order=order,
                limit=take, offset=page_offset,
                select_cols=select_cols, count=count,
            )
            collected.extend(r["rows"])
            got = len(r["rows"])
            if got < take or (limit is not None and len(collected) >= limit):
                return {"rows": collected, "count": r["count"]}
            page_offset += got
    return await _select_page(
        table, filters=filters, order=order,
        limit=limit, offset=offset,
        select_cols=select_cols, count=count,
    )


async def _select_page(
    table: str,
    *,
    filters: Optional[Dict[str, str]] = None,
    order: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
    select_cols: str = "*",
    count: Optional[str] = None,
) -> Dict[str, Any]:
    params: Dict[str, str] = {"select": select_cols}
    if filters:
        params.update(filters)
    if order:
        params["order"] = order
    if limit is not None:
        params["limit"] = str(limit)
    if offset is not None:
        params["offset"] = str(offset)

    headers = _headers()
    if count:
        headers["Prefer"] = f"count={count}"

    url = f"{_url()}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params, headers=headers)
    if r.status_code >= 400:
        raise SupabaseError(r.status_code, r.text)

    total = None
    cr = r.headers.get("content-range")
    if cr and "/" in cr:
        try:
            total = int(cr.split("/", 1)[1])
        except ValueError:
            pass
    return {"rows": r.json(), "count": total}


async def insert(table: str, rows: List[Dict[str, Any]]) -> int:
    """Bulk-insert rows in a single request. Returns number of rows inserted."""
    if not rows:
        return 0
    url = f"{_url()}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(url, headers=_headers("return=minimal"), json=rows)
    if r.status_code >= 400:
        raise SupabaseError(r.status_code, r.text)
    return len(rows)


async def count(table: str, filters: Optional[Dict[str, str]] = None) -> int:
    """Return the row count for the table (optionally filtered)."""
    params: Dict[str, str] = {"select": "id"}
    if filters:
        params.update(filters)
    params["limit"] = "1"
    headers = _headers("count=exact")
    url = f"{_url()}/rest/v1/{table}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(url, params=params, headers=headers)
    if r.status_code >= 400:
        raise SupabaseError(r.status_code, r.text)
    cr = r.headers.get("content-range", "0-0/0")
    return int(cr.split("/", 1)[1]) if "/" in cr else 0
