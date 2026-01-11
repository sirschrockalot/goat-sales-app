/**
 * AI Services Test - Comprehensive Validation
 * 
 * Tests all AI services required for the Sales Goat AI agent:
 * - Vapi (Voice AI Platform)
 * - Deepgram (Speech-to-Text)
 * - OpenAI (GPT-4o)
 * - ElevenLabs (Voice Synthesis)
 * 
 * Validates:
 * - API keys are configured
 * - API endpoints are accessible
 * - Services can authenticate
 * - Assistant is accessible
 * - Voice models are available
 */

import OpenAI from 'openai';

// Color output for terminal
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

interface TestResult {
  service: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function addResult(service: string, status: 'pass' | 'fail' | 'warning', message: string, details?: string) {
  results.push({ service, status, message, details });
}

function printResult(result: TestResult) {
  const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
  const color = result.status === 'pass' ? colors.green : result.status === 'fail' ? colors.red : colors.yellow;
  
  console.log(`${color}${icon} ${result.service}: ${result.message}${colors.reset}`);
  if (result.details) {
    console.log(`   ${colors.cyan}→ ${result.details}${colors.reset}`);
  }
}

/**
 * Test OpenAI API
 */
async function testOpenAI(): Promise<void> {
  console.log(`\n${colors.blue}${colors.bold}Testing OpenAI API...${colors.reset}`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    addResult('OpenAI', 'fail', 'API key not configured or is placeholder', 'Set OPENAI_API_KEY in .env');
    return;
  }

  try {
    const openai = new OpenAI({ apiKey });
    
    // Test with a simple completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Say "test" if you can read this.' }],
      max_tokens: 10,
    });

    if (response.choices[0]?.message?.content) {
      addResult('OpenAI', 'pass', 'API connection successful', `Model: gpt-4o, Response received`);
    } else {
      addResult('OpenAI', 'warning', 'API connected but no response', 'Check model availability');
    }
  } catch (error: any) {
    if (error.status === 401) {
      addResult('OpenAI', 'fail', 'Invalid API key', 'Check OPENAI_API_KEY in .env');
    } else if (error.status === 429) {
      addResult('OpenAI', 'warning', 'Rate limit exceeded', 'API key is valid but quota may be exceeded');
    } else {
      addResult('OpenAI', 'fail', `API error: ${error.message}`, error.status ? `Status: ${error.status}` : undefined);
    }
  }
}

/**
 * Test ElevenLabs API
 */
async function testElevenLabs(): Promise<void> {
  console.log(`\n${colors.blue}${colors.bold}Testing ElevenLabs API...${colors.reset}`);
  
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    addResult('ElevenLabs', 'fail', 'API key not configured', 'Set ELEVEN_LABS_API_KEY in .env');
    return;
  }

  try {
    // Test subscription endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const characterCount = data.character_count || 0;
      const characterLimit = data.character_limit || 0;
      const percentage = characterLimit > 0 ? ((characterCount / characterLimit) * 100).toFixed(1) : '0';
      
      addResult(
        'ElevenLabs',
        'pass',
        'API connection successful',
        `Characters: ${characterCount.toLocaleString()}/${characterLimit.toLocaleString()} (${percentage}% used)`
      );
    } else if (response.status === 401) {
      addResult('ElevenLabs', 'fail', 'Invalid API key', 'Check ELEVEN_LABS_API_KEY in .env');
    } else {
      addResult('ElevenLabs', 'fail', `API error: ${response.status}`, await response.text().catch(() => 'Unknown error'));
    }
  } catch (error: any) {
    addResult('ElevenLabs', 'fail', `Connection error: ${error.message}`, 'Check network connectivity');
  }
}

/**
 * Test Deepgram API Configuration
 * Note: Deepgram is configured within Vapi for STT, but we can verify the key exists
 */
async function testDeepgram(): Promise<void> {
  console.log(`\n${colors.blue}${colors.bold}Testing Deepgram Configuration...${colors.reset}`);
  
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    addResult('Deepgram', 'warning', 'API key not found in environment', 'Deepgram is configured in Vapi dashboard, but DEEPGRAM_API_KEY not in .env');
    return;
  }

  // Verify the key format (Deepgram keys start with specific patterns)
  if (apiKey.length < 20) {
    addResult('Deepgram', 'warning', 'API key appears invalid', 'Deepgram keys are typically longer');
    return;
  }

  try {
    // Test projects endpoint to verify the key works
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const projectCount = data.projects?.length || 0;
      addResult(
        'Deepgram',
        'pass',
        'API key configured and valid',
        `Key verified: ${projectCount} project(s) found. Also configured in Vapi dashboard.`
      );
    } else if (response.status === 401) {
      addResult('Deepgram', 'warning', 'API key may be invalid', 'Check DEEPGRAM_API_KEY in .env.local and Vapi dashboard configuration');
    } else {
      addResult('Deepgram', 'warning', `API error: ${response.status}`, 'Key exists but may need verification');
    }
  } catch (error: any) {
    addResult('Deepgram', 'warning', `Connection error: ${error.message}`, 'Key exists in .env.local, verify Vapi dashboard configuration');
  }
}

/**
 * Test Vapi API
 */
async function testVapi(): Promise<void> {
  console.log(`\n${colors.blue}${colors.bold}Testing Vapi API...${colors.reset}`);
  
  const secretKey = process.env.VAPI_SECRET_KEY;
  const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
  const assistantId = process.env.ACQUISITIONS_ASSISTANT_ID || 'aaf338ae-b74a-43e4-ac48-73dd99817e9f';

  if (!secretKey || secretKey.includes('your_') || secretKey.includes('placeholder')) {
    addResult('Vapi', 'fail', 'Secret key not configured', 'Set VAPI_SECRET_KEY in .env');
    return;
  }

  if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    addResult('Vapi', 'warning', 'Public API key not configured', 'Set NEXT_PUBLIC_VAPI_API_KEY for client-side');
  }

  try {
    // Test 1: Fetch assistants list
    const assistantsResponse = await fetch('https://api.vapi.ai/assistant', {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!assistantsResponse.ok) {
      if (assistantsResponse.status === 401) {
        addResult('Vapi', 'fail', 'Invalid secret key', 'Check VAPI_SECRET_KEY in .env');
        return;
      } else {
        addResult('Vapi', 'fail', `API error: ${assistantsResponse.status}`, await assistantsResponse.text().catch(() => 'Unknown error'));
        return;
      }
    }

    const assistants = await assistantsResponse.json();
    const assistantCount = Array.isArray(assistants) ? assistants.length : 0;
    
    addResult(
      'Vapi',
      'pass',
      'API connection successful',
      `Assistants found: ${assistantCount}`
    );

    // Test 2: Fetch specific assistant
    try {
      const assistantResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (assistantResponse.ok) {
        const assistant = await assistantResponse.json();
        const model = assistant.model?.model || 'unknown';
        const voice = assistant.voice?.voiceId || 'unknown';
        
        addResult(
          'Vapi Assistant',
          'pass',
          `Assistant accessible: ${assistant.name || assistantId}`,
          `Model: ${model}, Voice: ${voice}`
        );
      } else if (assistantResponse.status === 404) {
        addResult('Vapi Assistant', 'warning', `Assistant not found: ${assistantId}`, 'Create assistant or update ACQUISITIONS_ASSISTANT_ID');
      } else {
        addResult('Vapi Assistant', 'fail', `Error fetching assistant: ${assistantResponse.status}`, await assistantResponse.text().catch(() => 'Unknown error'));
      }
    } catch (error: any) {
      addResult('Vapi Assistant', 'fail', `Error: ${error.message}`, 'Check assistant ID');
    }

  } catch (error: any) {
    addResult('Vapi', 'fail', `Connection error: ${error.message}`, 'Check network connectivity');
  }
}

/**
 * Test Vapi Assistant Configuration
 */
async function testVapiAssistantConfig(): Promise<void> {
  console.log(`\n${colors.blue}${colors.bold}Testing Vapi Assistant Configuration...${colors.reset}`);
  
  const secretKey = process.env.VAPI_SECRET_KEY;
  const assistantId = process.env.ACQUISITIONS_ASSISTANT_ID || 'aaf338ae-b74a-43e4-ac48-73dd99817e9f';

  if (!secretKey) {
    return;
  }

  try {
    const response = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return;
    }

    const assistant = await response.json();
    const issues: string[] = [];

    // Check model
    if (!assistant.model?.model || assistant.model.model === 'gpt-3.5-turbo') {
      issues.push('Model should be gpt-4o for best performance');
    }

    // Check voice provider (11labs is preferred, but vapi provider is also valid)
    if (assistant.voice?.provider !== '11labs' && assistant.voice?.provider !== 'vapi') {
      issues.push('Voice provider should be 11labs or vapi');
    }

    // Check voice ID
    if (!assistant.voice?.voiceId) {
      issues.push('Voice ID not configured');
    }

    // Check system prompt
    const systemPrompt = assistant.model?.messages?.find((m: any) => m.role === 'system')?.content || '';
    if (!systemPrompt || systemPrompt.length < 100) {
      issues.push('System prompt appears too short or missing');
    }

    // Check server URL (webhook) - only warn if this is an acquisitions assistant
    if (!assistant.serverUrl && assistant.metadata?.personaMode === 'acquisition') {
      issues.push('Server URL (webhook) not configured - needed for call processing');
    } else if (!assistant.serverUrl) {
      issues.push('Server URL (webhook) not configured - optional for seller personas');
    }

    if (issues.length === 0) {
      addResult('Vapi Config', 'pass', 'Assistant configuration looks good', 'All critical settings verified');
    } else {
      addResult('Vapi Config', 'warning', 'Configuration issues found', issues.join('; '));
    }
  } catch (error: any) {
    addResult('Vapi Config', 'fail', `Error: ${error.message}`, 'Could not validate configuration');
  }
}

/**
 * Main test function
 */
async function runTests(): Promise<void> {
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('='.repeat(60));
  console.log('🧪 AI Services Test - Sales Goat Validation');
  console.log('='.repeat(60));
  console.log(`${colors.reset}\n`);

  // Run all tests
  await testOpenAI();
  await testElevenLabs();
  await testDeepgram();
  await testVapi();
  await testVapiAssistantConfig();

  // Print summary
  console.log(`\n${colors.cyan}${colors.bold}`);
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.reset}\n`);

  results.forEach(printResult);

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const total = results.length;

  console.log(`\n${colors.cyan}${colors.bold}Results:${colors.reset}`);
  console.log(`  ${colors.green}✅ Passed: ${passed}/${total}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Warnings: ${warnings}/${total}${colors.reset}`);
  console.log(`  ${colors.red}❌ Failed: ${failed}/${total}${colors.reset}`);

  if (failed === 0 && warnings === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 All tests passed! AI agent is ready to use.${colors.reset}\n`);
    process.exit(0);
  } else if (failed === 0) {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some warnings detected, but core services are working.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bold}❌ Some tests failed. Please fix the issues above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}${colors.bold}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
