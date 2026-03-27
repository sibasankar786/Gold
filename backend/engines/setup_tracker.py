"""SetupTracker — aggregates per-setup performance stats from the trades collection."""
from __future__ import annotations
from db.mongodb import trades_col, setup_stats_col
from engines.expectancy import calculate_expectancy, calculate_profit_factor
from db.schemas import SetupStats


async def compute_and_save_stats(setup_type: str) -> SetupStats:
    """
    Recomputes stats for a given setup from all trades in MongoDB.
    Saves result to setup_stats collection.
    """
    col = trades_col()
    cursor = col.find({"setup_type": setup_type, "outcome": {"$in": ["Win", "Loss"]}})
    trades = await cursor.to_list(length=None)

    if not trades:
        return SetupStats(setup=setup_type)

    wins   = [t for t in trades if t["outcome"] == "Win"]
    losses = [t for t in trades if t["outcome"] == "Loss"]
    total  = len(trades)
    win_rate  = len(wins) / total if total else 0
    loss_rate = len(losses) / total if total else 0

    win_rrs  = [t.get("rr", 1.5) for t in wins  if t.get("rr")]
    loss_rrs = [t.get("rr", 1.0) for t in losses if t.get("rr")]

    avg_win  = sum(win_rrs)  / len(win_rrs)  if win_rrs  else 1.5
    avg_loss = sum(loss_rrs) / len(loss_rrs) if loss_rrs else 1.0

    gross_profit = sum(win_rrs)
    gross_loss   = sum(loss_rrs)

    expectancy   = calculate_expectancy(win_rate, avg_win, loss_rate, avg_loss)
    pf           = calculate_profit_factor(gross_profit, gross_loss)

    # Simple drawdown: longest consecutive loss streak as % approximation
    max_dd = round((max(len(losses), 1) / max(total, 1)) * 100, 2)

    stats = SetupStats(
        setup=setup_type,
        total_trades=total,
        win_rate=round(win_rate, 4),
        avg_rr=round(avg_win, 2),
        profit_factor=round(pf, 4),
        max_drawdown=max_dd,
        expectancy=round(expectancy, 4),
    )

    # Upsert into setup_stats collection
    await setup_stats_col().replace_one(
        {"setup": setup_type},
        stats.model_dump(),
        upsert=True,
    )
    return stats


async def get_all_stats() -> list[dict]:
    cursor = setup_stats_col().find({}, {"_id": 0})
    return await cursor.to_list(length=None)
