/**
 * Private Portal Scraper - Eric Cline's Private Training Portal
 * Secure authenticated scraper for extracting elite sales DNA
 * 
 * Portal: https://portal.theericcline.com/login
 * 
 * Features:
 * - Secure login with session persistence
 * - Recursive course module navigation
 * - Content extraction (headers, paragraphs, transcripts)
 * - Priority tagging (PRIORITY: 10)
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs-extra';
import * as path from 'path';

const PORTAL_LOGIN_URL = process.env.PORTAL_LOGIN_URL || 'https://portal.theericcline.com/login';
const PORTAL_USERNAME = process.env.PORTAL_USERNAME;
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD;

if (!PORTAL_USERNAME || !PORTAL_PASSWORD) {
  throw new Error(
    'Missing portal credentials. Please set:\n' +
    '- PORTAL_USERNAME\n' +
    '- PORTAL_PASSWORD\n' +
    'in your .env file'
  );
}

const AUTH_STATE_FILE = path.join(process.cwd(), 'playwright', '.auth', 'user.json');
const OUTPUT_FILE = path.join(process.cwd(), 'raw_dna', 'private', 'portal_text.txt');

/**
 * Save browser state (cookies, localStorage) for session persistence
 */
async function saveBrowserState(context: BrowserContext): Promise<void> {
  const authDir = path.dirname(AUTH_STATE_FILE);
  await fs.ensureDir(authDir);
  
  const state = await context.storageState();
  await fs.writeFile(AUTH_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  
  console.log(`💾 Saved browser state to ${AUTH_STATE_FILE}`);
}

/**
 * Load saved browser state if it exists
 */
async function loadBrowserState(): Promise<object | null> {
  if (await fs.pathExists(AUTH_STATE_FILE)) {
    const state = await fs.readFile(AUTH_STATE_FILE, 'utf-8');
    console.log(`📥 Loaded saved browser state`);
    return JSON.parse(state);
  }
  return null;
}

/**
 * Login to the Eric Cline portal
 */
async function loginToPortal(page: Page): Promise<boolean> {
  console.log(`🔐 Logging in to ${PORTAL_LOGIN_URL}...`);

  try {
    await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'networkidle' });

    // Wait for login form
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });

    // Fill email/username
    await page.fill('input[name="email"]', PORTAL_USERNAME);
    console.log(`✅ Filled email field`);

    // Fill password
    await page.fill('input[name="password"]', PORTAL_PASSWORD);
    console.log(`✅ Filled password field`);

    // Click submit button
    const submitButton = await page.$('button[type="submit"]') || 
                         await page.$('button:has-text("Login")') ||
                         await page.$('button:has-text("Log In")');
    
    if (submitButton) {
      await submitButton.click();
      console.log(`✅ Clicked submit button`);
    } else {
      // Fallback: press Enter
      await page.keyboard.press('Enter');
      console.log(`✅ Pressed Enter to submit`);
    }

    // Wait for navigation after login
    await page.waitForURL('**', { timeout: 15000 });

    // Check if login was successful
    const currentUrl = page.url();
    if (currentUrl.includes('login') || currentUrl === PORTAL_LOGIN_URL) {
      console.warn('⚠️  Still on login page. Login may have failed.');
      return false;
    }

    console.log(`✅ Login successful! Navigated to: ${currentUrl}`);
    return true;
  } catch (error) {
    console.error('❌ Login error:', error);
    return false;
  }
}

/**
 * Extract all text content from a lesson page
 */
async function extractLessonContent(page: Page, url: string): Promise<{
  title: string;
  content: string;
  transcript: string;
}> {
  console.log(`📄 Extracting content from: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Extract lesson title from headers
    const titleSelectors = ['h1', 'h2', 'h3', '[class*="title"]', '[class*="lesson-title"]'];
    let title = 'Untitled Lesson';
    
    for (const selector of titleSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await element.textContent();
          if (text && text.trim().length > 0 && text.trim().length < 200) {
            title = text.trim();
            break;
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // Extract all paragraph text
    const paragraphs = await page.$$('p');
    let content = '';
    
    for (const p of paragraphs) {
      const text = await p.textContent();
      if (text && text.trim().length > 0) {
        content += text.trim() + '\n\n';
      }
    }

    // Extract headers (h1-h6)
    const headers = await page.$$('h1, h2, h3, h4, h5, h6');
    let headerText = '';
    
    for (const header of headers) {
      const text = await header.textContent();
      if (text && text.trim().length > 0) {
        headerText += text.trim() + '\n';
      }
    }

    // Combine headers and paragraphs
    const fullContent = (headerText ? headerText + '\n' : '') + content;

    // Look for "Transcript" toggle or button
    let transcript = '';
    const transcriptSelectors = [
      'button:has-text("Transcript")',
      '[class*="transcript"]',
      '[data-transcript]',
      'details:has-text("Transcript")',
    ];

    for (const selector of transcriptSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          // Try to click to expand transcript
          try {
            await element.click();
            await page.waitForTimeout(1000); // Wait for content to load
          } catch (e) {
            // Element might not be clickable, continue
          }

          // Look for transcript content
          const transcriptContent = await page.$('[class*="transcript-content"], [class*="transcript-text"]');
          if (transcriptContent) {
            transcript = await transcriptContent.textContent() || '';
          } else {
            // Try to get text from the element itself
            transcript = await element.textContent() || '';
          }
          
          if (transcript.trim().length > 50) {
            break; // Found substantial transcript
          }
        }
      } catch (e) {
        // Continue
      }
    }

    // If no transcript found in specific elements, check for any text containing "transcript"
    if (!transcript || transcript.length < 50) {
      const bodyText = await page.textContent('body') || '';
      const transcriptMatch = bodyText.match(/(?:transcript|transcription)[\s\S]{100,2000}/i);
      if (transcriptMatch) {
        transcript = transcriptMatch[0];
      }
    }

    return {
      title: title.trim(),
      content: fullContent.trim(),
      transcript: transcript.trim(),
    };
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return {
      title: 'Error',
      content: `Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      transcript: '',
    };
  }
}

/**
 * Find all lesson links on the course dashboard
 */
async function findLessonLinks(page: Page): Promise<string[]> {
  console.log('🔍 Finding lesson links...');

  try {
    // Common selectors for lesson/course links
    const linkSelectors = [
      'a[href*="lesson"]',
      'a[href*="course"]',
      'a[href*="module"]',
      '[class*="lesson"] a',
      '[class*="course"] a',
      '[class*="module"] a',
      'nav a',
      '[role="navigation"] a',
    ];

    const urls = new Set<string>();
    const baseUrl = new URL(page.url()).origin;

    for (const selector of linkSelectors) {
      try {
        const links = await page.$$(selector);
        for (const link of links) {
          const href = await link.getAttribute('href');
          if (href && (href.includes('lesson') || href.includes('course') || href.includes('module'))) {
            const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
            // Filter out login/logout links
            if (!fullUrl.includes('login') && !fullUrl.includes('logout') && !fullUrl.includes('signup')) {
              urls.add(fullUrl);
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }

    const urlArray = Array.from(urls);
    console.log(`✅ Found ${urlArray.length} lesson link(s)`);
    return urlArray;
  } catch (error) {
    console.error('Error finding lesson links:', error);
    return [];
  }
}

/**
 * Main scraper function
 */
export async function scrapePrivatePortal(): Promise<void> {
  console.log('🚀 Starting Private Portal Scraper (Eric Cline Portal)...\n');

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
    });

    // Try to load saved state
    const savedState = await loadBrowserState();

    context = await browser.newContext({
      storageState: savedState || undefined,
    });

    page = await context.newPage();

    // Check if we need to login
    let needsLogin = true;
    if (savedState) {
      // Try to access a protected page to see if session is still valid
      try {
        await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'networkidle', timeout: 10000 });
        const currentUrl = page.url();
        if (!currentUrl.includes('login')) {
          needsLogin = false;
          console.log('✅ Using saved session (still logged in)');
        }
      } catch (e) {
        // Session expired, need to login
      }
    }

    // Login if needed
    if (needsLogin) {
      const loginSuccess = await loginToPortal(page);
      if (!loginSuccess) {
        throw new Error('Failed to login to portal');
      }

      // Save browser state after successful login
      await saveBrowserState(context);
    }

    // Navigate to course dashboard (or current page if already there)
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      // If still on login, try to navigate to dashboard
      await page.goto('https://portal.theericcline.com', { waitUntil: 'networkidle' });
    }

    // Find all lesson links
    const lessonUrls = await findLessonLinks(page);

    if (lessonUrls.length === 0) {
      console.warn('⚠️  No lesson links found. Scraping current page only.');
      lessonUrls.push(page.url());
    }

    // Prepare output
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.ensureDir(outputDir);

    let allContent = '';

    // Header with priority tagging
    allContent += '='.repeat(80) + '\n';
    allContent += 'SOURCE: PRIVATE_CLINE_PORTAL | PRIORITY: 10\n';
    allContent += `Scraped: ${new Date().toISOString()}\n`;
    allContent += `Portal: ${PORTAL_LOGIN_URL}\n`;
    allContent += '='.repeat(80) + '\n\n';

    // Scrape each lesson
    for (let i = 0; i < lessonUrls.length; i++) {
      const url = lessonUrls[i];
      console.log(`\n[${i + 1}/${lessonUrls.length}] Processing: ${url}`);

      const content = await extractLessonContent(page, url);

      allContent += `\n${'='.repeat(80)}\n`;
      allContent += `LESSON: ${content.title}\n`;
      allContent += `URL: ${url}\n`;
      allContent += `${'='.repeat(80)}\n\n`;

      if (content.content) {
        allContent += `CONTENT:\n${content.content}\n\n`;
      }

      if (content.transcript) {
        allContent += `TRANSCRIPT:\n${content.transcript}\n\n`;
      }

      allContent += '\n' + '-'.repeat(80) + '\n\n';

      // Small delay to avoid rate limiting
      if (i < lessonUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Save to file
    await fs.writeFile(OUTPUT_FILE, allContent, 'utf-8');

    console.log(`\n✅ Scraping complete!`);
    console.log(`💾 Saved to: ${OUTPUT_FILE}`);
    console.log(`📊 Scraped ${lessonUrls.length} lesson(s)`);
    console.log(`📝 Total content: ${allContent.length} characters`);

  } catch (error) {
    console.error('❌ Error in private portal scraper:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// CLI interface
if (require.main === module) {
  scrapePrivatePortal()
    .then(() => {
      console.log('\n✅ Success!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Error:', error);
      process.exit(1);
    });
}
