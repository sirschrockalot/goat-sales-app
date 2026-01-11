/**
 * Prompt Evolution & Story Aggregator
 * Scans successful calls to extract effective rapport-building stories
 * and automatically updates assistant prompts with top-performing stories
 */

import { supabaseAdmin } from '../src/lib/supabase';
import { updateVapiAssistantPrompt, getVapiAssistant } from '../src/lib/vapiControl';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TopCall {
  id: string;
  transcript: string;
  goat_score: number;
  sentiment_score?: number;
  humanity_score?: number;
}

interface ExtractedStory {
  storyText: string;
  storySummary: string;
  industryNiche: string;
  propertyLocation?: string;
  engagementRating: number;
}

interface StoryLibraryEntry {
  id: string;
  story_text: string;
}

const STORY_EXTRACTION_PROMPT = `You are a Story Mining Analyst. Extract the specific "Third-Party Story" or "Rapport Pivot" that the AI used in this successful sales call.

Look for:
1. Stories where the AI mentions a client/customer in a specific location (e.g., "I had a client in [CITY/STATE] who...")
2. Relatable anecdotes that build rapport (e.g., probate situations, tired landlords, tax issues, family moves)
3. Emotional pivots where the AI deviates from the script to share a story

For each story found, extract:
- The full story text (exact words the AI used)
- A brief summary (1-2 sentences)
- Industry niche (probate, tired_landlord, tax_issues, family_move, etc.)
- Property location (city/state if mentioned)
- Engagement rating (0-10, based on how the user responded)

Output Format (JSON):
{
  "stories": [
    {
      "storyText": "[Full exact text of the story]",
      "storySummary": "[Brief summary]",
      "industryNiche": "[probate|tired_landlord|tax_issues|family_move|other]",
      "propertyLocation": "[City, State or null]",
      "engagementRating": [0-10]
    }
  ]
}

If no story is found, return: {"stories": []}`;

const PROMPT_GENERATION_PROMPT = `You are a Prompt Engineer. Generate an updated System Prompt for an Acquisitions Assistant that includes a "Top-Performing Stories" section.

Current prompt structure should be maintained, but add a new section:

"TOP-PERFORMING STORIES - Rapport Building Library:
- Use these proven, high-engagement stories when appropriate:
[STORY_LIST]

- When to use: If you detect high emotional energy (pain, stress, nostalgia, frustration), you may enter "Rapport Mode" and use one of these stories
- Ground stories in the caller's property location when possible
- After sharing a story, smoothly pivot back to the Logic Gate that was interrupted"

Generate the complete updated prompt, preserving all existing instructions and adding the new stories section.`;

async function getTopCalls(): Promise<TopCall[]> {
  // Query for top 5 calls from last 7 days with goat_score > 90
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabaseAdmin
    .from('calls')
    .select('id, transcript, goat_score, metadata')
    .gte('goat_score', 90)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('goat_score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching top calls:', error);
    throw error;
  }

  // Extract sentiment_score and humanity_score from metadata if available
  return (data || []).map(call => ({
    id: call.id,
    transcript: call.transcript || '',
    goat_score: call.goat_score || 0,
    sentiment_score: (call.metadata as any)?.sentiment_score,
    humanity_score: (call.metadata as any)?.humanity_score,
  }));
}

async function extractStoriesFromCall(transcript: string): Promise<ExtractedStory[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: STORY_EXTRACTION_PROMPT,
        },
        {
          role: 'user',
          content: `Extract stories from this call transcript:\n\n${transcript}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      return [];
    }

    const parsed = JSON.parse(response);
    return parsed.stories || [];
  } catch (error) {
    console.error('Error extracting stories:', error);
    return [];
  }
}

async function checkStoryExists(storyText: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('story_library')
    .select('id')
    .eq('story_text', storyText)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking story existence:', error);
    return false;
  }

  return !!data;
}

async function insertStory(
  story: ExtractedStory,
  callId: string,
  engagementRating: number
): Promise<string | null> {
  try {
    // Check if story already exists
    const exists = await checkStoryExists(story.storyText);
    if (exists) {
      console.log('Story already exists, skipping:', story.storySummary);
      return null;
    }

    // Insert new story
    const { data, error } = await supabaseAdmin
      .from('story_library')
      .insert({
        story_text: story.storyText,
        story_summary: story.storySummary,
        origin_call_id: callId,
        engagement_rating: engagementRating,
        industry_niche: story.industryNiche,
        property_location: story.propertyLocation || null,
        effectiveness_score: engagementRating, // Initial score = engagement from first use
        usage_count: 1,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting story:', error);
      return null;
    }

    console.log('✅ Inserted new story:', story.storySummary);
    return data.id;
  } catch (error) {
    console.error('Error in insertStory:', error);
    return null;
  }
}

async function getTopStories(limit: number = 10): Promise<StoryLibraryEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('story_library')
    .select('id, story_text')
    .order('effectiveness_score', { ascending: false })
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top stories:', error);
    return [];
  }

  return data || [];
}

async function generateUpdatedPrompt(
  currentPrompt: string,
  topStories: StoryLibraryEntry[]
): Promise<string> {
  // Format stories for prompt
  const storyList = topStories
    .map((story, index) => `${index + 1}. ${story.story_text.substring(0, 200)}...`)
    .join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: PROMPT_GENERATION_PROMPT,
        },
        {
          role: 'user',
          content: `Current prompt:\n${currentPrompt}\n\nTop stories to include:\n${storyList}\n\nGenerate the updated prompt with the new stories section.`,
        },
      ],
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    return response;
  } catch (error) {
    console.error('Error generating updated prompt:', error);
    throw error;
  }
}

async function savePromptVersion(
  assistantId: string,
  newPrompt: string,
  changesSummary: string,
  storyIds: string[]
): Promise<void> {
  // Get current version number
  const { data: existingVersions } = await supabaseAdmin
    .from('prompt_versions')
    .select('version_number')
    .eq('assistant_id', assistantId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = existingVersions ? existingVersions.version_number + 1 : 1;

  // Deactivate all previous versions
  await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: false })
    .eq('assistant_id', assistantId)
    .eq('is_active', true);

  // Insert new version with pending_review status (requires admin approval)
  const { error } = await supabaseAdmin
    .from('prompt_versions')
    .insert({
      assistant_id: assistantId,
      version_number: nextVersion,
      prompt_text: newPrompt,
      changes_summary: changesSummary,
      stories_added: storyIds,
      is_active: false, // Not active until approved
      status: 'pending_review', // Requires admin approval
      applied_by: null, // Will be set when approved
    });

  if (error) {
    console.error('Error saving prompt version:', error);
    throw error;
  }

  console.log(`✅ Saved prompt version ${nextVersion} for assistant ${assistantId}`);
}

async function rollbackPrompt(assistantId: string, versionNumber: number, reason: string): Promise<void> {
  // Get the version to rollback to
  const { data: targetVersion, error: fetchError } = await supabaseAdmin
    .from('prompt_versions')
    .select('prompt_text')
    .eq('assistant_id', assistantId)
    .eq('version_number', versionNumber)
    .single();

  if (fetchError || !targetVersion) {
    throw new Error(`Version ${versionNumber} not found for assistant ${assistantId}`);
  }

  // Deactivate current version
  await supabaseAdmin
    .from('prompt_versions')
    .update({ 
      is_active: false,
      rollback_reason: reason,
      rolled_back_at: new Date().toISOString(),
    })
    .eq('assistant_id', assistantId)
    .eq('is_active', true);

  // Reactivate target version
  await supabaseAdmin
    .from('prompt_versions')
    .update({ is_active: true })
    .eq('assistant_id', assistantId)
    .eq('version_number', versionNumber);

  // Update assistant in Vapi
  await updateVapiAssistantPrompt(assistantId, targetVersion.prompt_text);

  console.log(`✅ Rolled back assistant ${assistantId} to version ${versionNumber}`);
}

async function main() {
  console.log('🚀 Starting Prompt Evolution & Story Aggregator...\n');

  try {
    // Step 1: Get top 5 calls from last 7 days
    console.log('📊 Fetching top calls from last 7 days...');
    const topCalls = await getTopCalls();
    console.log(`Found ${topCalls.length} top-performing calls\n`);

    if (topCalls.length === 0) {
      console.log('No top calls found. Exiting.');
      return;
    }

    // Step 2: Extract stories from each call
    console.log('🔍 Extracting stories from calls...');
    const allStories: Array<ExtractedStory & { callId: string }> = [];

    for (const call of topCalls) {
      if (!call.transcript || call.transcript.length < 100) {
        continue;
      }

      const stories = await extractStoriesFromCall(call.transcript);
      for (const story of stories) {
        allStories.push({
          ...story,
          callId: call.id,
        });
      }
    }

    console.log(`Extracted ${allStories.length} stories\n`);

    // Step 3: De-duplicate and insert unique stories
    console.log('💾 Saving unique stories to library...');
    const insertedStoryIds: string[] = [];

    for (const story of allStories) {
      const storyId = await insertStory(
        story,
        story.callId,
        story.engagementRating
      );
      if (storyId) {
        insertedStoryIds.push(storyId);
      }
    }

    console.log(`Inserted ${insertedStoryIds.length} new stories\n`);

    // Step 4: Get top stories from library
    console.log('📚 Fetching top stories from library...');
    const topStories = await getTopStories(10);
    console.log(`Found ${topStories.length} top stories\n`);

    if (topStories.length === 0) {
      console.log('No stories in library yet. Exiting.');
      return;
    }

    // Step 5: Get assistant ID (use ACQUISITIONS_ASSISTANT_ID or first assistant)
    const assistantId = process.env.ACQUISITIONS_ASSISTANT_ID;
    if (!assistantId) {
      console.log('⚠️  ACQUISITIONS_ASSISTANT_ID not set. Skipping prompt update.');
      return;
    }

    // Step 6: Get current prompt
    console.log(`🔧 Fetching current prompt for assistant ${assistantId}...`);
    const currentAssistant = await getVapiAssistant(assistantId);
    const currentPrompt = currentAssistant.model?.messages?.[0]?.content || '';

    // Step 7: Generate updated prompt
    console.log('✨ Generating updated prompt with top stories...');
    const updatedPrompt = await generateUpdatedPrompt(currentPrompt, topStories);

    // Step 8: Save prompt version before updating
    const changesSummary = `Added ${insertedStoryIds.length} new stories from top-performing calls. Total top stories: ${topStories.length}`;
    await savePromptVersion(
      assistantId,
      updatedPrompt,
      changesSummary,
      insertedStoryIds
    );

    // Step 9: Update assistant in Vapi
    console.log('🚀 Updating assistant prompt in Vapi...');
    await updateVapiAssistantPrompt(assistantId, updatedPrompt);

    console.log('\n✅ Prompt evolution complete!');
    console.log(`   - Extracted ${allStories.length} stories`);
    console.log(`   - Inserted ${insertedStoryIds.length} new stories`);
    console.log(`   - Updated assistant ${assistantId} with top ${topStories.length} stories`);
  } catch (error) {
    console.error('❌ Error in prompt evolution:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
export {
  getTopCalls,
  extractStoriesFromCall,
  insertStory,
  getTopStories,
  generateUpdatedPrompt,
  savePromptVersion,
  rollbackPrompt,
};
