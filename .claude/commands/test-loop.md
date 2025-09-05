# test-loop

Run tests and automatically fix failures until all tests pass.

## Process

1. **Initial Test Run**
   ```bash
   pnpm test
   ```
   Capture all test results and failures

2. **Analyze Failures**
   - Identify root cause of each failure
   - Prioritize fixes (unit tests first, then integration)
   - Check if failure is due to new code or existing issue

3. **Fix Issues**
   - Apply minimal fixes
   - Don't change test expectations unless absolutely necessary
   - Preserve test intent

4. **Verify Fix**
   ```bash
   pnpm test:watch
   ```
   Run tests in watch mode to see immediate results

5. **Loop Until Green**
   - Continue fixing and testing
   - Maximum 5 iterations
   - If still failing after 5 iterations, escalate

## Exit Conditions
- ✅ All tests passing
- ❌ 5 iterations reached (needs human review)
- ❌ Fundamental architecture issue detected

## Important
Never modify tests just to make them pass. Fix the actual code issue.