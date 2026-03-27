async function checkState(step) {
  const res = await fetch('http://localhost:3001/auto-trade/status');
  const data = await res.json();
  const state = data.state;
  console.log(`\n[${step}] => Position: ${state.position} | Entry: ${state.entryPrice} | Trailing: ${state.trailingActive} | Peak: ${state.peakPrice} | Lowest: ${state.lowestPrice}`);
}

async function sendPrice(price) {
  console.log(`\n--- Injecting Market Price: ${price} ---`);
  await fetch('http://localhost:3001/auto-trade/price-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price })
  });
}

async function run() {
  console.log("=== STARTING AUTOTRADE VERIFICATION ===\n");
  
  // 1. Reset
  console.log("1. Ensuring system is ON");
  await fetch('http://localhost:3001/auto-trade/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isEnabled: true })
  });
  
  // Test BUY Sequence
  await sendPrice(4000);
  await checkState("Triggered Entry (Expected: BUY @ 4000)");

  await sendPrice(4005);
  await checkState("Hit +5 (Expected: BUY, TrailingActive=true)");

  await sendPrice(4010);
  await checkState("Hit Peak (Expected: BUY, Peak=4010, TrailingActive=true)");

  await sendPrice(4008);
  await checkState("Hit -2 from Peak (Expected: NONE, Position Exited)");

  // Test Reversal Sequence
  await sendPrice(4000);
  await checkState("Triggered Entry 2 (Expected: BUY @ 4000)");

  await sendPrice(3995);
  await checkState("Hit -5 Reversal (Expected: SELL @ 3995)");

  console.log("\n=== VERIFICATION COMPLETE ===");
}

run().catch(console.error);
