/**
 * List Available ElevenLabs Voices
 * Helps identify which voice IDs are available in your ElevenLabs account
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

async function listElevenLabsVoices() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    console.log(`${colors.red}❌ ELEVEN_LABS_API_KEY not configured${colors.reset}`);
    console.log(`${colors.yellow}   Set ELEVEN_LABS_API_KEY in .env.development or .env.local${colors.reset}`);
    return;
  }

  try {
    console.log(`${colors.blue}${colors.bold}Fetching voices from ElevenLabs...${colors.reset}\n`);
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.log(`${colors.red}❌ Invalid API key${colors.reset}`);
        console.log(`${colors.yellow}   Check ELEVEN_LABS_API_KEY in .env${colors.reset}`);
        return;
      }
      const errorText = await response.text();
      console.log(`${colors.red}❌ Failed to fetch voices: ${response.status}${colors.reset}`);
      console.log(`Error: ${errorText}`);
      return;
    }

    const data = await response.json();
    const voices = data.voices || [];

    console.log(`${colors.green}✅ Found ${voices.length} voices in your ElevenLabs account${colors.reset}\n`);

    // Check for expected voices
    const expectedVoices = {
      'ByWUwXA3MMLREYmxtB32': 'Brian (Expected for Learning Mode)',
      '2vbhUP8zyKg4dEZaTWGn': 'Stella (Expected for Practice Mode)',
      'nPczCjzI2devNBz1zWls': 'Brian (Old ID)',
      'pNInz6obpgDQGcFmaJgB': 'Stella (Old ID)',
    };

    console.log(`${colors.cyan}${colors.bold}Checking for expected voices:${colors.reset}\n`);
    
    const foundVoices: string[] = [];
    const missingVoices: string[] = [];

    Object.entries(expectedVoices).forEach(([voiceId, description]) => {
      const found = voices.find((v: any) => v.voice_id === voiceId);
      if (found) {
        console.log(`${colors.green}✅ Found: ${description}${colors.reset}`);
        console.log(`   Voice ID: ${colors.cyan}${voiceId}${colors.reset}`);
        console.log(`   Name: ${found.name || 'Unknown'}`);
        console.log(`   Category: ${found.category || 'Unknown'}`);
        console.log('');
        foundVoices.push(voiceId);
      } else {
        console.log(`${colors.red}❌ Missing: ${description}${colors.reset}`);
        console.log(`   Voice ID: ${colors.yellow}${voiceId}${colors.reset}`);
        console.log('');
        missingVoices.push(voiceId);
      }
    });

    // Show all available voices
    console.log(`${colors.cyan}${colors.bold}All Available Voices:${colors.reset}\n`);
    
    voices.forEach((voice: any) => {
      const isExpected = Object.keys(expectedVoices).includes(voice.voice_id);
      const marker = isExpected ? `${colors.green}★${colors.reset}` : ' ';
      console.log(`${marker} ${voice.name || 'Unnamed'}`);
      console.log(`   ID: ${colors.cyan}${voice.voice_id}${colors.reset}`);
      console.log(`   Category: ${voice.category || 'Unknown'}`);
      if (voice.description) {
        console.log(`   Description: ${voice.description.substring(0, 60)}...`);
      }
      console.log('');
    });

    // Recommendations
    if (missingVoices.length > 0) {
      console.log(`${colors.yellow}${colors.bold}Recommendations:${colors.reset}\n`);
      
      if (missingVoices.includes('ByWUwXA3MMLREYmxtB32')) {
        console.log(`1. ${colors.yellow}Brian voice ID not found${colors.reset}`);
        console.log(`   - The code expects: ${colors.cyan}ByWUwXA3MMLREYmxtB32${colors.reset}`);
        console.log(`   - Find a similar voice above and update ${colors.cyan}ELEVEN_LABS_BRIAN_VOICE_ID${colors.reset} in .env`);
        console.log('');
      }
      
      if (missingVoices.includes('2vbhUP8zyKg4dEZaTWGn')) {
        console.log(`2. ${colors.yellow}Stella voice ID not found${colors.reset}`);
        console.log(`   - The code expects: ${colors.cyan}2vbhUP8zyKg4dEZaTWGn${colors.reset}`);
        console.log(`   - Find a similar voice above and update ${colors.cyan}ELEVEN_LABS_SELLER_VOICE_ID${colors.reset} in .env`);
        console.log('');
      }

      console.log(`${colors.cyan}To fix:${colors.reset}`);
      console.log(`1. Choose voices from the list above`);
      console.log(`2. Update .env.development with:`);
      console.log(`   ELEVEN_LABS_BRIAN_VOICE_ID=<voice_id_from_above>`);
      console.log(`   ELEVEN_LABS_SELLER_VOICE_ID=<voice_id_from_above>`);
      console.log(`3. Restart your dev server`);
      console.log('');
    } else {
      console.log(`${colors.green}✅ All expected voices found!${colors.reset}`);
      console.log(`   Your voice IDs are correctly configured.`);
      console.log(`   If you're still getting errors, check Vapi Dashboard → Settings → Integrations → ElevenLabs`);
      console.log('');
    }

  } catch (error: any) {
    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
  }
}

listElevenLabsVoices().catch(console.error);
