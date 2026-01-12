/**
 * Remove Vapi Assistants Script
 * Deletes assistants that have not been published or have errors
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.development') });
dotenv.config({ path: join(__dirname, '../.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  magenta: '\x1b[35m',
};

interface Assistant {
  id: string;
  name: string;
  status?: string;
  published?: boolean;
  voice?: {
    provider?: string;
    voiceId?: string;
    model?: string;
    stability?: number;
    similarityBoost?: number;
  };
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Delete assistants that are not published or have errors
 */
async function removeUnpublishedOrErrorAssistants() {
  const secretKey = process.env.VAPI_SECRET_KEY;
  
  if (!secretKey) {
    console.log(`${colors.red}❌ VAPI_SECRET_KEY not configured${colors.reset}`);
    return;
  }

  try {
    console.log(`${colors.blue}${colors.bold}Fetching all Vapi assistants...${colors.reset}\n`);
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`${colors.red}❌ Failed to fetch assistants: ${response.status}${colors.reset}`);
      const errorText = await response.text();
      console.log(`Error: ${errorText}`);
      return;
    }

    const assistants = await response.json();
    const assistantList: Assistant[] = Array.isArray(assistants) ? assistants : [];

    console.log(`${colors.cyan}Found ${assistantList.length} total assistants${colors.reset}\n`);

    // Find assistants that are not published or have errors
    const assistantsToDelete = assistantList.filter((a: Assistant) => 
      !a.published || !!a.error
    );

    if (assistantsToDelete.length === 0) {
      console.log(`${colors.green}✅ No assistants found that need to be deleted${colors.reset}`);
      console.log(`${colors.cyan}All assistants are either published or have no errors${colors.reset}\n`);
      return;
    }

    // Separate by reason
    const unpublished = assistantsToDelete.filter(a => !a.published && !a.error);
    const withErrors = assistantsToDelete.filter(a => !!a.error);
    const both = assistantsToDelete.filter(a => !a.published && !!a.error);

    console.log(`${colors.yellow}Found ${assistantsToDelete.length} assistant(s) to delete:${colors.reset}\n`);
    
    if (unpublished.length > 0) {
      console.log(`${colors.yellow}  ${unpublished.length} unpublished (no errors):${colors.reset}`);
      unpublished.forEach(a => {
        console.log(`    - ${a.name || a.id}`);
        console.log(`      ID: ${a.id}`);
        console.log(`      Status: ${a.status || 'unknown'}`);
        if (a.voice?.voiceId) {
          console.log(`      Voice: ${a.voice.provider}/${a.voice.voiceId}`);
        }
        console.log('');
      });
    }

    if (withErrors.length > 0) {
      console.log(`${colors.red}  ${withErrors.length} with errors:${colors.reset}`);
      withErrors.forEach(a => {
        console.log(`    - ${a.name || a.id}`);
        console.log(`      ID: ${a.id}`);
        console.log(`      ${colors.red}Error: ${a.error}${colors.reset}`);
        console.log(`      Published: ${a.published ? 'Yes' : 'No'}`);
        if (a.voice?.voiceId) {
          console.log(`      Voice: ${a.voice.provider}/${a.voice.voiceId}`);
        }
        console.log('');
      });
    }

    if (both.length > 0) {
      console.log(`${colors.magenta}  ${both.length} both unpublished AND have errors:${colors.reset}`);
      both.forEach(a => {
        console.log(`    - ${a.name || a.id}`);
        console.log(`      ID: ${a.id}`);
        console.log(`      ${colors.red}Error: ${a.error}${colors.reset}`);
        console.log('');
      });
    }

    // Check command line arguments for confirmation
    const args = process.argv.slice(2);
    const shouldDelete = args.includes('--delete') || args.includes('-d');
    const skipConfirmation = args.includes('--yes') || args.includes('-y');

    if (!shouldDelete) {
      console.log(`${colors.cyan}${colors.bold}Preview mode - no assistants will be deleted${colors.reset}`);
      console.log(`${colors.cyan}To actually delete these assistants, run:${colors.reset}`);
      console.log(`  npm run vapi:remove-unpublished --delete`);
      console.log(`  or`);
      console.log(`  tsx scripts/remove-unpublished-or-error-assistants.ts --delete\n`);
      return;
    }

    if (!skipConfirmation) {
      console.log(`${colors.yellow}${colors.bold}⚠️  WARNING: This will delete ${assistantsToDelete.length} assistant(s)${colors.reset}`);
      console.log(`${colors.yellow}Press Ctrl+C to cancel, or wait 5 seconds to continue...${colors.reset}\n`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    let deletedCount = 0;
    let failedCount = 0;
    
    console.log(`${colors.blue}${colors.bold}Deleting assistants...${colors.reset}\n`);
    
    for (const assistant of assistantsToDelete) {
      try {
        const reason = assistant.error 
          ? `Error: ${assistant.error}` 
          : 'Not published';
        const voiceInfo = assistant.voice?.voiceId 
          ? `${assistant.voice.provider}/${assistant.voice.voiceId}` 
          : 'No voice ID';
        
        console.log(`Deleting: ${assistant.name || assistant.id}`);
        console.log(`  ID: ${assistant.id.substring(0, 8)}...`);
        console.log(`  Reason: ${reason}`);
        console.log(`  Voice: ${voiceInfo}`);
        
        const deleteResponse = await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (deleteResponse.ok) {
          console.log(`${colors.green}  ✅ Deleted${colors.reset}\n`);
          deletedCount++;
        } else {
          const errorText = await deleteResponse.text();
          console.log(`${colors.red}  ❌ Failed: ${deleteResponse.status} - ${errorText}${colors.reset}\n`);
          failedCount++;
        }
      } catch (error: any) {
        console.log(`${colors.red}  ❌ Error: ${error.message}${colors.reset}\n`);
        failedCount++;
      }
    }

    console.log(`${colors.cyan}${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total found: ${assistantsToDelete.length}`);
    console.log(`  ${colors.green}Deleted: ${deletedCount}${colors.reset}`);
    if (failedCount > 0) {
      console.log(`  ${colors.red}Failed: ${failedCount}${colors.reset}`);
    }
    console.log('');
    
    if (deletedCount > 0) {
      console.log(`${colors.green}✅ Cleanup complete! Removed ${deletedCount} assistant(s)${colors.reset}`);
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

removeUnpublishedOrErrorAssistants().catch(console.error);
