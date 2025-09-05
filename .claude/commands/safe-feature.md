# safe-feature

Implement new features safely without breaking existing functionality.

## Process

1. **Explore & Backup**
   - Run `pnpm db:backup` to save current state
   - Explore existing code structure
   - Identify integration points
   - Document current behavior

2. **Plan**
   - Create implementation plan
   - Identify risks and dependencies
   - Define rollback strategy
   - List test scenarios

3. **Code Incrementally**
   - Implement in small, testable chunks
   - Create feature flag if needed
   - Add new code without modifying existing
   - Write tests for new code

4. **Test Continuously**
   - Run existing tests: `pnpm test`
   - Test new functionality in isolation
   - Integration testing
   - Manual verification

5. **Integrate Carefully**
   - Connect new feature to existing code
   - Maintain backward compatibility
   - Update documentation
   - Final test suite run

## Safety Checks
- [ ] Database backup created
- [ ] Existing tests still pass
- [ ] New tests added
- [ ] No existing functionality broken
- [ ] Can rollback if needed

If ANY existing test fails, STOP and investigate before proceeding.