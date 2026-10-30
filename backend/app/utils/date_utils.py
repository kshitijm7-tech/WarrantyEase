"""Date utilities mirroring the frontend's dateUtils.ts (UTC reference date)."""

from datetime import date, datetime, timedelta, timezone

MS_PER_DAY = 24 * 60 * 60 * 1000


def get_reference_date() -> date:
    """Current date at midnight UTC (matches frontend getReferenceDate)."""
    now = datetime.now(timezone.utc)
    return date(now.year, now.month, now.day)


def get_today_iso() -> str:
    """Today's date as YYYY-MM-DD (UTC)."""
    return get_reference_date().isoformat()


def calculate_remaining_days(expiry_date_str: str) -> int:
    """Days from today (UTC) to expiry. Negative if already expired.

    Mirrors frontend calculateRemainingDays: ceil((expiry - today)/day).
    """
    if not expiry_date_str:
        return 0
    try:
        expiry = datetime.strptime(str(expiry_date_str)[:10], "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        ).date()
    except ValueError:
        return 0
    today = get_reference_date()
    return (expiry - today).days


def format_remaining_time(days: int) -> str:
    """Human-readable remaining time text (mirrors frontend formatRemainingTime)."""
    if days < 0:
        abs_days = abs(days)
        return "Expired 1 day ago" if abs_days == 1 else f"Expired {abs_days} days ago"
    if days == 0:
        return "Expires today"
    if days == 1:
        return "1 day remaining"
    if days <= 30:
        return f"{days} days remaining"
    if days <= 60:
        return "About 1 month remaining"
    months = int(days / 30.4)
    if months < 12:
        return f"{months} months remaining"
    return f"{days / 365:.1f} yrs remaining"


def add_months(date_str: str, months: int) -> str:
    """Add months to a YYYY-MM-DD date string (mirrors frontend addMonthsToDate)."""
    if not date_str:
        return date_str
    try:
        d = datetime.strptime(str(date_str)[:10], "%Y-%m-%d")
    except ValueError:
        return date_str
    total_months = (d.month - 1) + months
    year = d.year + total_months // 12
    month = total_months % 12 + 1
    # Clamp day to month length
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    last_day = (next_month - timedelta(days=1)).day
    day = min(d.day, last_day)
    return date(year, month, day).isoformat()
