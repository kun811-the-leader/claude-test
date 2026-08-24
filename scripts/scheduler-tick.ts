import { tickScheduler } from "../src/lib/scheduler";

tickScheduler()
  .then((result) => {
    console.log(`Triggered ${result.triggered.length} run(s):`, result.triggered);
    if (result.failed.length) {
      console.error(`Failed ${result.failed.length} run(s):`, result.failed);
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
