#!/bin/bash
# Run All Budget Enforcement Tests
# Comprehensive test suite for budget monitoring and kill-switch mechanisms

echo "🧪 Running All Budget Enforcement Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "1️⃣  Budget Enforcement Test"
echo "─────────────────────────────────────────────────────"
npx tsx scripts/test-budget-enforcement.ts

echo ""
echo ""
echo "2️⃣  Kill-Switch Test"
echo "─────────────────────────────────────────────────────"
npx tsx scripts/test-kill-switch.ts

echo ""
echo ""
echo "3️⃣  Budget Throttling Test"
echo "─────────────────────────────────────────────────────"
npx tsx scripts/test-budget-throttling.ts

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All tests complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Review test results above"
echo "   2. Fix any issues found"
echo "   3. Re-run tests after fixes"
echo "   4. Once all tests pass, proceed with training schedule setup"
echo ""
