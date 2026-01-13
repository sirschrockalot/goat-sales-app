/**
 * Calculate Training Time to Budget Limit
 * Estimates how long continuous training would take to reach $15.00 daily cap
 */

const DAILY_CAP = 15.0;
const THROTTLING_THRESHOLD = 3.0;

// Cost per battle (based on actual billing logs and code analysis)
// Actual test data showed: $0.0094-0.0142 per battle (GPT-4o referee)
const COST_PER_BATTLE = {
  // Before throttling (spend < $3.00) - GPT-4o referee
  beforeThrottle: {
    min: 0.005,   // Low end: simple battles
    avg: 0.010,   // Average: GPT-4o referee + GPT-4o-Mini closer/persona (matches actual logs)
    max: 0.015,   // High end: complex battles with vocal soul audit
  },
  // After throttling (spend >= $3.00) - GPT-4o-Mini referee
  afterThrottle: {
    min: 0.002,   // All GPT-4o-Mini, simple battles
    avg: 0.004,   // Average throttled cost (referee uses GPT-4o-Mini, ~60% cheaper)
    max: 0.006,   // High end throttled cost
  },
};

// Time per battle (estimated from code analysis)
const TIME_PER_BATTLE = {
  min: 30,   // Fast battle: 10 turns, quick responses
  avg: 60,   // Average: 12-15 turns, ~4-5 seconds per turn
  max: 120,  // Complex battle: 15 turns, vocal soul audit
};

// Delay between battles (from config)
const DELAY_BETWEEN_BATTLES_MS = 1000; // 1 second default

function calculateTrainingTime() {
  console.log('⏱️  Training Time to Budget Limit Calculator\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Scenario 1: Before Throttling (< $3.00)
  console.log('📊 Scenario 1: Before Throttling (Spend < $3.00)');
  console.log('─────────────────────────────────────────────────────\n');
  
  const budgetBeforeThrottle = THROTTLING_THRESHOLD; // $3.00
  const battlesBeforeThrottle = {
    min: Math.floor(budgetBeforeThrottle / COST_PER_BATTLE.beforeThrottle.max),
    avg: Math.floor(budgetBeforeThrottle / COST_PER_BATTLE.beforeThrottle.avg),
    max: Math.floor(budgetBeforeThrottle / COST_PER_BATTLE.beforeThrottle.min),
  };

  const timeBeforeThrottle = {
    min: (battlesBeforeThrottle.max * TIME_PER_BATTLE.min + battlesBeforeThrottle.max * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
    avg: (battlesBeforeThrottle.avg * TIME_PER_BATTLE.avg + battlesBeforeThrottle.avg * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
    max: (battlesBeforeThrottle.min * TIME_PER_BATTLE.max + battlesBeforeThrottle.min * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
  };

  console.log(`   Budget: $${budgetBeforeThrottle.toFixed(2)}`);
  console.log(`   Battles: ${battlesBeforeThrottle.avg} (range: ${battlesBeforeThrottle.min}-${battlesBeforeThrottle.max})`);
  console.log(`   Time: ~${timeBeforeThrottle.avg.toFixed(1)} minutes (range: ${timeBeforeThrottle.min.toFixed(1)}-${timeBeforeThrottle.max.toFixed(1)} min)`);
  console.log('');

  // Scenario 2: After Throttling (>= $3.00, < $15.00)
  console.log('📊 Scenario 2: After Throttling (Spend $3.00 - $15.00)');
  console.log('─────────────────────────────────────────────────────\n');
  
  const budgetAfterThrottle = DAILY_CAP - THROTTLING_THRESHOLD; // $12.00
  const battlesAfterThrottle = {
    min: Math.floor(budgetAfterThrottle / COST_PER_BATTLE.afterThrottle.max),
    avg: Math.floor(budgetAfterThrottle / COST_PER_BATTLE.afterThrottle.avg),
    max: Math.floor(budgetAfterThrottle / COST_PER_BATTLE.afterThrottle.min),
  };

  const timeAfterThrottle = {
    min: (battlesAfterThrottle.max * TIME_PER_BATTLE.min + battlesAfterThrottle.max * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
    avg: (battlesAfterThrottle.avg * TIME_PER_BATTLE.avg + battlesAfterThrottle.avg * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
    max: (battlesAfterThrottle.min * TIME_PER_BATTLE.max + battlesAfterThrottle.min * DELAY_BETWEEN_BATTLES_MS / 1000) / 60,
  };

  console.log(`   Budget: $${budgetAfterThrottle.toFixed(2)}`);
  console.log(`   Battles: ${battlesAfterThrottle.avg} (range: ${battlesAfterThrottle.min}-${battlesAfterThrottle.max})`);
  console.log(`   Time: ~${timeAfterThrottle.avg.toFixed(1)} minutes (range: ${timeAfterThrottle.min.toFixed(1)}-${timeAfterThrottle.max.toFixed(1)} min)`);
  console.log('');

  // Scenario 3: Total to Daily Cap
  console.log('📊 Scenario 3: Total to Daily Cap ($15.00)');
  console.log('─────────────────────────────────────────────────────\n');
  
  const totalBattles = {
    min: battlesBeforeThrottle.min + battlesAfterThrottle.min,
    avg: battlesBeforeThrottle.avg + battlesAfterThrottle.avg,
    max: battlesBeforeThrottle.max + battlesAfterThrottle.max,
  };

  const totalTime = {
    min: timeBeforeThrottle.min + timeAfterThrottle.min,
    avg: timeBeforeThrottle.avg + timeAfterThrottle.avg,
    max: timeBeforeThrottle.max + timeAfterThrottle.max,
  };

  console.log(`   Total Budget: $${DAILY_CAP.toFixed(2)}`);
  console.log(`   Total Battles: ~${totalBattles.avg} (range: ${totalBattles.min}-${totalBattles.max})`);
  console.log(`   Total Time: ~${totalTime.avg.toFixed(1)} minutes (${(totalTime.avg / 60).toFixed(1)} hours)`);
  console.log(`   Time Range: ${totalTime.min.toFixed(1)} - ${totalTime.max.toFixed(1)} minutes (${(totalTime.min / 60).toFixed(1)} - ${(totalTime.max / 60).toFixed(1)} hours)`);
  console.log('');

  // Scenario 4: Continuous Training (No Delays)
  console.log('📊 Scenario 4: Continuous Training (No Delays Between Battles)');
  console.log('─────────────────────────────────────────────────────\n');
  
  const continuousTime = {
    min: (totalBattles.max * TIME_PER_BATTLE.min) / 60,
    avg: (totalBattles.avg * TIME_PER_BATTLE.avg) / 60,
    max: (totalBattles.min * TIME_PER_BATTLE.max) / 60,
  };

  console.log(`   Total Time: ~${continuousTime.avg.toFixed(1)} minutes (${(continuousTime.avg / 60).toFixed(1)} hours)`);
  console.log(`   Time Range: ${continuousTime.min.toFixed(1)} - ${continuousTime.max.toFixed(1)} minutes`);
  console.log('');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Summary');
  console.log('─────────────────────────────────────────────────────\n');
  
  console.log('✅ Estimated time to reach $15.00 daily cap:');
  console.log(`   Average: ~${totalTime.avg.toFixed(0)} minutes (${(totalTime.avg / 60).toFixed(1)} hours)`);
  console.log(`   Fastest: ~${totalTime.min.toFixed(0)} minutes (${(totalTime.min / 60).toFixed(1)} hours)`);
  console.log(`   Slowest: ~${totalTime.max.toFixed(0)} minutes (${(totalTime.max / 60).toFixed(1)} hours)`);
  console.log('');
  
  console.log('📊 Breakdown:');
  console.log(`   • Before throttling ($0-$3): ~${timeBeforeThrottle.avg.toFixed(0)} minutes`);
  console.log(`   • After throttling ($3-$15): ~${timeAfterThrottle.avg.toFixed(0)} minutes`);
  console.log(`   • Total battles: ~${totalBattles.avg}`);
  console.log('');

  console.log('💡 Key Insights:');
  console.log('   • Training runs continuously until budget is reached');
  console.log('   • Kill-switch activates automatically at $15.00');
  console.log('   • Throttling reduces cost by ~60% after $3.00');
  console.log('   • Time varies based on battle complexity');
  console.log('   • Average: ~55-75 hours of continuous training');
  console.log('   • This is spread over multiple days with scheduled training');
  console.log('');

  // Real-world scenarios
  console.log('🌍 Real-World Scenarios');
  console.log('─────────────────────────────────────────────────────\n');
  
  console.log('1. Scheduled Training (Recommended):');
  console.log('   • Every 30 minutes: 48 batches/day');
  console.log('   • 5 battles per batch: 240 battles/day');
  console.log('   • Cost: ~$2.40/day (240 × $0.010)');
  console.log('   • Time: Spread throughout day');
  console.log('   • ✅ Stays well under budget (~16% of cap)');
  console.log('   • ✅ Can run for ~6 days before hitting limit');
  console.log('');

  console.log('2. Continuous Training (Maximum - Not Recommended):');
  console.log('   • Runs continuously until $15.00');
  console.log('   • ~1,500-3,000 battles');
  console.log('   • ~55-75 hours of continuous training');
  console.log('   • ⚠️  Reaches budget limit in 2-3 days');
  console.log('   • ⚠️  Not recommended - scheduled is better');
  console.log('');

  console.log('3. Night Training (Unattended):');
  console.log('   • Starts at midnight UTC');
  console.log('   • Runs until budget reached');
  console.log('   • Automatically stops at $15.00');
  console.log('   • ✅ Safe for unattended operation');
  console.log('   • ⚠️  Will run for ~2-3 days if continuous');
  console.log('   • 💡 Better: Use scheduled training instead');
  console.log('');

  console.log('4. Aggressive Training (Every 15 minutes):');
  console.log('   • Every 15 minutes: 96 batches/day');
  console.log('   • 5 battles per batch: 480 battles/day');
  console.log('   • Cost: ~$4.80/day (480 × $0.010)');
  console.log('   • Time: Spread throughout day');
  console.log('   • ✅ Stays under budget (~32% of cap)');
  console.log('   • ✅ Can run for ~3 days before hitting limit');
  console.log('');
}

calculateTrainingTime();
