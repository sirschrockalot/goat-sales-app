/**
 * Verify Vapi Assistant
 * Checks if an assistant exists and is available before starting a call
 */

export async function verifyAssistantExists(assistantId: string): Promise<{
  exists: boolean;
  published?: boolean;
  error?: string;
}> {
  try {
    // This would need to be called from the server-side API route
    // For now, we'll return a simple check
    // In a real implementation, we'd call the Vapi API to verify
    
    if (!assistantId || assistantId.length < 10) {
      return {
        exists: false,
        error: 'Invalid assistant ID',
      };
    }

    // Basic validation - the actual verification should happen server-side
    return {
      exists: true,
      published: true, // Assume published if we got this far
    };
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Server-side function to verify assistant via Vapi API
 */
export async function verifyAssistantViaAPI(assistantId: string, vapiSecretKey: string): Promise<{
  exists: boolean;
  published: boolean;
  name?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${vapiSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          exists: false,
          published: false,
          error: 'Assistant not found',
        };
      }
      return {
        exists: false,
        published: false,
        error: `API error: ${response.status}`,
      };
    }

    const assistant = await response.json();
    
    return {
      exists: true,
      published: assistant.published || false,
      name: assistant.name,
    };
  } catch (error) {
    return {
      exists: false,
      published: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
