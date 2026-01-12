/**
 * Cleanup Vapi Assistants Script
 * Lists all assistants and helps identify/fix assistants with voice errors
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
};

async function listAllAssistants() {
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
    const assistantList = Array.isArray(assistants) ? assistants : [];

    console.log(`${colors.cyan}Found ${assistantList.length} assistants${colors.reset}\n`);

    // Find assistants with the problematic voice ID
    const problematicVoiceId = 'ByWUwXA3MMLREYmxtB32';
    const problematicAssistants = assistantList.filter((a: any) => 
      a.voice?.voiceId === problematicVoiceId
    );

    if (problematicAssistants.length > 0) {
      console.log(`${colors.yellow}⚠️  Found ${problematicAssistants.length} assistant(s) using voice ID: ${problematicVoiceId}${colors.reset}\n`);
      
      problematicAssistants.forEach((assistant: any) => {
        console.log(`${colors.yellow}  - ${assistant.name || assistant.id}${colors.reset}`);
        console.log(`    ID: ${assistant.id}`);
        console.log(`    Voice: ${assistant.voice?.provider} / ${assistant.voice?.voiceId}`);
        console.log(`    Status: ${assistant.status || 'unknown'}`);
        console.log(`    Published: ${assistant.published ? 'Yes' : 'No'}`);
        if (assistant.error) {
          console.log(`${colors.red}    Error: ${assistant.error}${colors.reset}`);
        }
        console.log('');
      });

      console.log(`${colors.cyan}To fix these assistants:${colors.reset}`);
      console.log(`1. Go to Vapi Dashboard → Assistants`);
      console.log(`2. Find assistants with voice ID: ${problematicVoiceId}`);
      console.log(`3. Either:`);
      console.log(`   - Delete them if they're not needed`);
      console.log(`   - Update them to use a different voice ID`);
      console.log(`   - Re-publish them if the voice is now available\n`);
      
      // Offer to delete them
      console.log(`${colors.yellow}Note: These assistants can be deleted via Vapi Dashboard or we can create a script to delete them.${colors.reset}`);
      console.log(`Assistant IDs to delete:`);
      problematicAssistants.forEach((assistant: any) => {
        console.log(`  - ${assistant.id} (${assistant.name || 'Unnamed'})`);
      });
      console.log('');
    } else {
      console.log(`${colors.green}✅ No assistants found with the problematic voice ID${colors.reset}\n`);
    }

    // Show all assistants summary
    console.log(`${colors.cyan}All Assistants Summary:${colors.reset}`);
    const byStatus = assistantList.reduce((acc: any, a: any) => {
      const status = a.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

/**
 * Delete assistants that can't be published (unpublishable with 11labs voices)
 * These are typically created during failed attempts when voice IDs were invalid
 */
async function deleteProblematicAssistants() {
  const secretKey = process.env.VAPI_SECRET_KEY;
  
  if (!secretKey) {
    console.log(`${colors.red}❌ VAPI_SECRET_KEY not configured${colors.reset}`);
    return;
  }

  try {
    console.log(`${colors.blue}${colors.bold}Fetching assistants to delete...${colors.reset}\n`);
    
    const response = await fetch('https://api.vapi.ai/assistant', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`${colors.red}❌ Failed to fetch assistants${colors.reset}`);
      return;
    }

    const assistants = await response.json();
    const assistantList = Array.isArray(assistants) ? assistants : [];
    
    // Find all unpublishable assistants using 11labs voices
    // These are likely from failed creation attempts with invalid voice IDs
    const problematicAssistants = assistantList.filter((a: any) => 
      !a.published && 
      (a.voice?.provider === '11labs' || a.voice?.provider === 'elevenlabs')
    );

    if (problematicAssistants.length === 0) {
      console.log(`${colors.green}✅ No problematic assistants found${colors.reset}`);
      return;
    }

    console.log(`${colors.yellow}Found ${problematicAssistants.length} unpublishable assistant(s) using 11labs voices${colors.reset}`);
    console.log(`${colors.cyan}These were likely created during failed attempts when voice IDs were invalid${colors.reset}\n`);

    // Group by name to show duplicates
    const byName = new Map<string, any[]>();
    problematicAssistants.forEach(a => {
      const name = a.name || 'Unnamed';
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name)!.push(a);
    });

    const duplicates = Array.from(byName.entries()).filter(([_, list]) => list.length > 1);
    if (duplicates.length > 0) {
      console.log(`${colors.yellow}Duplicate names found:${colors.reset}`);
      duplicates.forEach(([name, list]) => {
        console.log(`  "${name}": ${list.length} copies`);
      });
      console.log('');
    }

    let deletedCount = 0;
    let failedCount = 0;
    
    for (const assistant of problematicAssistants) {
      try {
        const voiceInfo = assistant.voice?.voiceId 
          ? `${assistant.voice.provider}/${assistant.voice.voiceId}` 
          : 'No voice ID';
        console.log(`Deleting: ${assistant.name || assistant.id} (${assistant.id.substring(0, 8)}...) | ${voiceInfo}...`);
        
        const deleteResponse = await fetch(`https://api.vapi.ai/assistant/${assistant.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (deleteResponse.ok) {
          console.log(`${colors.green}  ✅ Deleted${colors.reset}`);
          deletedCount++;
        } else {
          const errorText = await deleteResponse.text();
          console.log(`${colors.red}  ❌ Failed: ${deleteResponse.status} - ${errorText}${colors.reset}`);
          failedCount++;
        }
      } catch (error: any) {
        console.log(`${colors.red}  ❌ Error: ${error.message}${colors.reset}`);
        failedCount++;
      }
    }

    console.log(`\n${colors.cyan}Summary:${colors.reset}`);
    console.log(`  Deleted: ${colors.green}${deletedCount}${colors.reset}`);
    if (failedCount > 0) {
      console.log(`  Failed: ${colors.red}${failedCount}${colors.reset}`);
    }
    console.log(`  Total processed: ${problematicAssistants.length}`);
    
    if (deletedCount > 0) {
      console.log(`\n${colors.green}✅ Cleanup complete! The UI should now be able to create new assistants with valid voice IDs.${colors.reset}`);
    }
  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete') || args.includes('-d');

if (shouldDelete) {
  deleteProblematicAssistants().catch(console.error);
} else {
  listAllAssistants().catch(console.error);
}
