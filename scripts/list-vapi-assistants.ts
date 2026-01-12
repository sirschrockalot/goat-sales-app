/**
 * List and Analyze Vapi Assistants
 * Identifies assistants that can't be published and shows their status
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

async function listAndAnalyzeAssistants() {
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

    // Group by name to find duplicates
    const byName = new Map<string, Assistant[]>();
    assistantList.forEach(a => {
      const name = a.name || 'Unnamed';
      if (!byName.has(name)) {
        byName.set(name, []);
      }
      byName.get(name)!.push(a);
    });

    // Find duplicates
    const duplicates = Array.from(byName.entries()).filter(([_, list]) => list.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`${colors.yellow}⚠️  Found ${duplicates.length} duplicate name(s):${colors.reset}\n`);
      duplicates.forEach(([name, list]) => {
        console.log(`${colors.yellow}  "${name}" (${list.length} copies)${colors.reset}`);
        list.forEach(a => {
          const published = a.published ? `${colors.green}Published${colors.reset}` : `${colors.red}Not Published${colors.reset}`;
          const status = a.status || 'unknown';
          const voiceInfo = a.voice?.voiceId ? `${a.voice.provider}/${a.voice.voiceId}` : 'No voice';
          console.log(`    - ${a.id.substring(0, 8)}... | ${published} | ${status} | ${voiceInfo}`);
          if (a.error) {
            console.log(`      ${colors.red}Error: ${a.error}${colors.reset}`);
          }
        });
        console.log('');
      });
    }

    // Find assistants that can't be published
    const unpublishable = assistantList.filter(a => !a.published);
    
    if (unpublishable.length > 0) {
      console.log(`${colors.red}❌ Found ${unpublishable.length} assistant(s) that can't be published:${colors.reset}\n`);
      
      // Group by reason
      const withErrors = unpublishable.filter(a => a.error);
      const with11labs = unpublishable.filter(a => a.voice?.provider === '11labs' || a.voice?.provider === 'elevenlabs');
      const withSameName = unpublishable.filter(a => {
        const name = a.name || 'Unnamed';
        return byName.get(name)?.length! > 1;
      });

      if (withErrors.length > 0) {
        console.log(`${colors.red}  ${withErrors.length} with errors:${colors.reset}`);
        withErrors.forEach(a => {
          console.log(`    - ${a.name || a.id}`);
          console.log(`      ID: ${a.id}`);
          console.log(`      ${colors.red}Error: ${a.error}${colors.reset}`);
          if (a.voice) {
            console.log(`      Voice: ${a.voice.provider}/${a.voice.voiceId}`);
          }
          console.log('');
        });
      }

      if (with11labs.length > 0 && with11labs.length !== withErrors.length) {
        console.log(`${colors.yellow}  ${with11labs.length} using 11labs voice:${colors.reset}`);
        with11labs.forEach(a => {
          if (!a.error) { // Only show if no explicit error
            console.log(`    - ${a.name || a.id}`);
            console.log(`      ID: ${a.id}`);
            console.log(`      Voice: ${a.voice?.provider}/${a.voice?.voiceId}`);
            console.log(`      Status: ${a.status || 'unknown'}`);
            console.log('');
          }
        });
      }

      // Show all unpublishable assistants
      console.log(`${colors.cyan}All Unpublishable Assistants:${colors.reset}`);
      unpublishable.forEach(a => {
        const voiceInfo = a.voice?.voiceId 
          ? `${a.voice.provider}/${a.voice.voiceId}` 
          : 'No voice configured';
        const errorInfo = a.error ? ` | ${colors.red}Error: ${a.error}${colors.reset}` : '';
        console.log(`  - ${a.name || 'Unnamed'} (${a.id.substring(0, 8)}...) | ${voiceInfo}${errorInfo}`);
      });
      console.log('');
    } else {
      console.log(`${colors.green}✅ All assistants are publishable${colors.reset}\n`);
    }

    // Summary statistics
    console.log(`${colors.cyan}${colors.bold}Summary:${colors.reset}`);
    console.log(`  Total assistants: ${assistantList.length}`);
    console.log(`  Published: ${assistantList.filter(a => a.published).length}`);
    console.log(`  Unpublished: ${unpublishable.length}`);
    console.log(`  With errors: ${assistantList.filter(a => a.error).length}`);
    console.log(`  Using 11labs: ${assistantList.filter(a => a.voice?.provider === '11labs' || a.voice?.provider === 'elevenlabs').length}`);
    console.log(`  Duplicate names: ${duplicates.length}`);
    console.log('');

    // Recommendations
    if (unpublishable.length > 0 || duplicates.length > 0) {
      console.log(`${colors.yellow}${colors.bold}Recommendations:${colors.reset}`);
      
      if (duplicates.length > 0) {
        console.log(`  1. ${colors.yellow}Delete duplicate assistants${colors.reset}`);
        console.log(`     - Multiple assistants with the same name suggest failed creation attempts`);
        console.log(`     - Keep only the most recent published one, delete the rest`);
      }
      
      if (unpublishable.some(a => a.voice?.provider === '11labs' && !a.published)) {
        console.log(`  2. ${colors.yellow}Check ElevenLabs integration${colors.reset}`);
        console.log(`     - Unpublishable assistants using 11labs may indicate voice ID issues`);
        console.log(`     - Verify voice IDs exist in your ElevenLabs account`);
        console.log(`     - Check Vapi Dashboard → Settings → Integrations → ElevenLabs`);
      }
      
      if (unpublishable.some(a => a.error)) {
        console.log(`  3. ${colors.yellow}Fix or delete assistants with errors${colors.reset}`);
        console.log(`     - These assistants cannot be used and should be cleaned up`);
      }
      
      console.log(`\n${colors.cyan}To delete assistants, run:${colors.reset}`);
      console.log(`  npm run vapi:cleanup --delete`);
      console.log(`  Or use the Vapi Dashboard to delete them manually`);
      console.log('');
    }

  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

listAndAnalyzeAssistants().catch(console.error);
