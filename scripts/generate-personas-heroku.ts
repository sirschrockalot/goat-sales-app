/**
 * Generate Personas for Heroku/Sandbox Environment
 * Uses Heroku config vars to connect to sandbox database
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

// Import persona generator
const { generatePersonas } = await import('./personaGenerator.js');

async function main() {
  console.log('🚀 Generating personas for Sandbox environment...\n');
  
  // Set environment to sandbox
  process.env.EXPLICIT_ENV = 'sandbox';
  
  // Use sandbox environment variables (from Heroku or .env.local)
  // The personaGenerator will use these via getEnvironmentConfig()
  
  try {
    const result = await generatePersonas();
    
    console.log('\n✅ Persona generation complete!');
    console.log(`   Success: ${result.success}`);
    console.log(`   Errors: ${result.errors}`);
    
    if (result.errors > 0) {
      console.log('\n⚠️  Some personas failed to insert. Check logs above.');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error generating personas:', error.message);
    console.error('\n💡 Make sure you have:');
    console.error('   1. SUPABASE_SANDBOX_URL or SUPABASE_SANDBOX_URL set');
    console.error('   2. SANDBOX_SUPABASE_SERVICE_ROLE_KEY set');
    console.error('   3. OPENAI_API_KEY or SANDBOX_OPENAI_API_KEY set');
    process.exit(1);
  }
}

main();
