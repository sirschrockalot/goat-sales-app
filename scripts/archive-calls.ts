/**
 * Archive Calls Script
 * CLI script to run the smart archiving process
 * 
 * Usage:
 *   npm run archive:calls
 *   tsx scripts/archive-calls.ts
 */

import { runArchivingProcess, getArchiveStats } from '../src/lib/archiver';

async function main() {
  console.log('🚀 Starting Call Archiving Process...\n');

  try {
    // Get current stats
    const beforeStats = await getArchiveStats();
    console.log('📊 Before Archiving:');
    console.log(`   Total Calls: ${beforeStats.totalCalls}`);
    console.log(`   Protected Calls: ${beforeStats.protectedCalls}`);
    console.log(`   Already Archived: ${beforeStats.archivedCalls}`);
    console.log(`   Oldest Unprotected: ${beforeStats.oldestUnprotectedCall || 'N/A'}\n`);

    // Run archiving process
    const archiveStats = await runArchivingProcess();

    // Get stats after archiving
    const afterStats = await getArchiveStats();
    console.log('\n📊 After Archiving:');
    console.log(`   Total Calls: ${afterStats.totalCalls}`);
    console.log(`   Protected Calls: ${afterStats.protectedCalls}`);
    console.log(`   Total Archived: ${afterStats.archivedCalls}`);

    console.log('\n✅ Archiving process complete!');
  } catch (error) {
    console.error('❌ Error in archiving process:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}
