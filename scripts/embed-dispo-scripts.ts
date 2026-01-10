/**
 * Script to generate embeddings for Dispo script segments
 * Run this after the dispo_script_segments table is created
 * 
 * Usage: npx tsx scripts/embed-dispo-scripts.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

async function embedDispoScripts() {
  console.log('Fetching Dispo script segments...');

  // Fetch all dispo script segments without embeddings
  const { data: segments, error: fetchError } = await supabase
    .from('dispo_script_segments')
    .select('id, gate_number, gate_name, script_text')
    .is('embedding', null)
    .order('gate_number');

  if (fetchError) {
    console.error('Error fetching segments:', fetchError);
    return;
  }

  if (!segments || segments.length === 0) {
    console.log('No segments found or all already have embeddings');
    return;
  }

  console.log(`Found ${segments.length} segments to embed...`);

  for (const segment of segments) {
    try {
      console.log(`Generating embedding for Gate ${segment.gate_number}: ${segment.gate_name}...`);

      // Generate embedding
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: segment.script_text.trim(),
      });

      const embedding = embeddingResponse.data[0].embedding;

      // Update the segment with the embedding
      const { error: updateError } = await supabase
        .from('dispo_script_segments')
        .update({ embedding })
        .eq('id', segment.id);

      if (updateError) {
        console.error(`Error updating segment ${segment.id}:`, updateError);
      } else {
        console.log(`✓ Embedded Gate ${segment.gate_number}`);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing segment ${segment.id}:`, error);
    }
  }

  console.log('Done! All Dispo script segments have been embedded.');
}

// Run the script
embedDispoScripts().catch(console.error);
