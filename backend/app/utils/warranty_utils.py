"""Warranty status and dashboard metrics (mirrors frontend warrantyUtils.ts)."""

from typing import List

from app.utils.date_utils import calculate_remaining_days


def get_warranty_status(expiry_date_str: str) -> str:
    """Return 'expired' | 'expiring_soon' | 'active' (mirrors frontend)."""
    days = calculate_remaining_days(expiry_date_str)
    if days < 0:
        return "expired"
    if days <= 30:
        return "expiring_soon"
    return "active"


def compute_dashboard_metrics(warranties: List[dict]) -> dict:
    """Compute dashboard counters from a list of warranties (dicts or objects)."""
    active = expiring_soon = expired = 0
    for w in warranties:
        if isinstance(w, dict):
            expiry = w.get("warrantyExpiryDate", "")
        else:
            expiry = getattr(w, "warrantyExpiryDate", "")
        status = get_warranty_status(expiry)
        if status == "active":
            active += 1
        elif status == "expiring_soon":
            expiring_soon += 1
        else:
            expired += 1
    return {
        "totalProducts": len(warranties),
        "activeWarranties": active,
        "expiringSoonWarranties": expiring_soon,
        "expiredWarranties": expired,
    }
