/**
 * Vapi Control API
 * Helper functions for interacting with Vapi Assistant API
 */

const VAPI_API_URL = 'https://api.vapi.ai';

/**
 * Get Vapi secret key from environment
 */
function getVapiSecretKey(): string {
  const key = process.env.VAPI_SECRET_KEY;
  if (!key) {
    throw new Error('VAPI_SECRET_KEY not configured');
  }
  return key;
}

/**
 * Fetch an assistant from Vapi
 */
export async function getVapiAssistant(assistantId: string) {
  const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch assistant: ${errorText}`);
  }

  return await response.json();
}

/**
 * Update an assistant's system prompt in Vapi
 */
export async function updateVapiAssistantPrompt(
  assistantId: string,
  newPrompt: string
): Promise<void> {
  // First, get the current assistant to preserve other settings
  const currentAssistant = await getVapiAssistant(assistantId);

  // Update the system prompt
  const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: {
        ...currentAssistant.model,
        messages: [
          {
            role: 'system',
            content: newPrompt,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update assistant prompt: ${errorText}`);
  }
}

/**
 * Get all assistants for a workspace (optional - for listing)
 */
export async function listVapiAssistants() {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getVapiSecretKey()}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to list assistants: ${errorText}`);
  }

  return await response.json();
}
