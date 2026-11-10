/**
 * Script runner for backend verification
 */
import { runBackendVerification } from './backend.test.js';

runBackendVerification().then((res) => {
  if (res.success) {
    console.log('ALL BACKEND VERIFICATION TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('BACKEND VERIFICATION TESTS FAILED!');
    process.exit(1);
  }
});
