/**
 * Cleanup Orphaned Draft Calls
 * Removes call records that are in "draft" or "connecting" status and older than 30 days
 * 
 * Usage: npx tsx scripts/cleanup-orphaned-calls.ts
 * 
 * Prerequisites:
 * - SUPABASE_SERVICE_ROLE_KEY set in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Find and delete orphaned draft calls
 */
async function cleanupOrphanedCalls() {
  console.log('🧹 Starting cleanup of orphaned draft calls...\n');

  try {
    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`📅 Cutoff date: ${cutoffDate.toLocaleDateString()}`);
    console.log(`   (Calls older than this will be deleted)\n`);

    // Find orphaned calls (draft/connecting status, older than 30 days, no goat_score)
    const { data: orphanedCalls, error: findError } = await supabase
      .from('calls')
      .select('id, user_id, call_status, created_at, goat_score')
      .or('call_status.eq.connecting,call_status.eq.draft,call_status.is.null')
      .lt('created_at', cutoffISO)
      .is('goat_score', null)
      .order('created_at', { ascending: true });

    if (findError) {
      console.error('❌ Error finding orphaned calls:', findError);
      process.exit(1);
    }

    if (!orphanedCalls || orphanedCalls.length === 0) {
      console.log('✅ No orphaned calls found. Database is clean!');
      return;
    }

    console.log(`📊 Found ${orphanedCalls.length} orphaned call(s) to delete:\n`);

    // Show summary
    const statusCounts: Record<string, number> = {};
    orphanedCalls.forEach(call => {
      const status = call.call_status || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} call(s)`);
    });

    console.log('\n🗑️  Deleting orphaned calls...');

    // Delete in batches to avoid overwhelming the database
    const batchSize = 100;
    let deletedCount = 0;

    for (let i = 0; i < orphanedCalls.length; i += batchSize) {
      const batch = orphanedCalls.slice(i, i + batchSize);
      const batchIds = batch.map(c => c.id);

      const { error: deleteError } = await supabase
        .from('calls')
        .delete()
        .in('id', batchIds);

      if (deleteError) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, deleteError);
      } else {
        deletedCount += batch.length;
        console.log(`   ✓ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} calls)`);
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} orphaned call(s).`);
    console.log(`\n📊 Database Stats:`);
    console.log(`   - Orphaned calls removed: ${deletedCount}`);
    console.log(`   - Remaining calls: ${(orphanedCalls.length - deletedCount)}`);

  } catch (error) {
    console.error('\n❌ Cleanup failed with error:', error);
    process.exit(1);
  }
}

// Run cleanup
cleanupOrphanedCalls().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
