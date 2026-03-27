"""ExpectancyEngine — calculates and evaluates trading edge."""
from __future__ import annotations


def calculate_expectancy(
    win_rate: float,
    avg_win: float,
    loss_rate: float,
    avg_loss: float,
) -> float:
    """
    Expectancy = (Win Rate × Avg Win) − (Loss Rate × Avg Loss)
    Positive = profitable edge. Negative = losing system.
    """
    return round((win_rate * avg_win) - (loss_rate * avg_loss), 4)


def calculate_profit_factor(gross_profit: float, gross_loss: float) -> float:
    """Profit Factor = Gross Profit / Gross Loss. > 1.0 is profitable."""
    if gross_loss == 0:
        return float("inf")
    return round(gross_profit / abs(gross_loss), 4)


def evaluate_edge(stats: dict) -> dict:
    """
    Given a SetupStats dict, return an edge evaluation with live-trading gate.

    Returns:
        {
            "live_allowed": bool,
            "status": "green" | "yellow" | "red",
            "reasons": [str],
        }
    """
    reasons = []
    red_flags = 0

    expectancy = stats.get("expectancy", 0)
    win_rate   = stats.get("win_rate", 0)
    pf         = stats.get("profit_factor", 0)
    drawdown   = stats.get("max_drawdown", 100)
    trades     = stats.get("total_trades", 0)

    if expectancy <= 0:
        reasons.append(f"❌ Expectancy {expectancy:.2f} is negative — no edge.")
        red_flags += 2
    else:
        reasons.append(f"✅ Expectancy +{expectancy:.2f}")

    if win_rate < 0.40:
        reasons.append(f"⚠️ Win rate {win_rate:.0%} is low — review setup criteria.")
        red_flags += 1
    else:
        reasons.append(f"✅ Win rate {win_rate:.0%}")

    if pf < 1.3:
        reasons.append(f"⚠️ Profit factor {pf:.2f} below 1.3 threshold.")
        red_flags += 1
    else:
        reasons.append(f"✅ Profit factor {pf:.2f}")

    if drawdown > 15:
        reasons.append(f"❌ Max drawdown {drawdown:.1f}% exceeds 15% limit.")
        red_flags += 2
    else:
        reasons.append(f"✅ Max drawdown {drawdown:.1f}%")

    if trades < 30:
        reasons.append(f"⚠️ Only {trades} trades — need 100+ for statistical significance.")
        red_flags += 1

    live_allowed = red_flags == 0 and trades >= 100
    status = "green" if live_allowed else ("yellow" if red_flags <= 1 else "red")

    return {
        "live_allowed": live_allowed,
        "status":       status,
        "reasons":      reasons,
    }
