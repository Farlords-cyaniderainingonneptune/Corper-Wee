/**
 * Script runner for backend, security, and Prompt 25 gameplay verification
 */
import { runBackendVerification } from './backend.test.js';
import { runSecurityAuditTests } from './security.test.js';
import { runGameplayJourneyTests } from './gameplay.test.js';

async function runAll() {
  const functional = await runBackendVerification();
  const security = await runSecurityAuditTests();
  const gameplay = await runGameplayJourneyTests();

  if (functional.success && security.success && gameplay.success) {
    const functionalPassed = functional.results.filter((r) => r.passed).length;
    console.log(
      `ALL TESTS PASSED (${functionalPassed + security.passedCount + gameplay.passedCount} total checks across functional, security & gameplay suites)!`
    );
    process.exit(0);
  } else {
    console.error('VERIFICATION SUITE FAILED!');
    process.exit(1);
  }
}

runAll();
