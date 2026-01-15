#!/usr/bin/env tsx
/**
 * AI Training Interactive Terminal
 * A unified CLI for managing all AI training operations
 */

import * as readline from 'readline';
import chalk from 'chalk';
import { spawn } from 'child_process';

// Training configuration
interface TrainingConfig {
  batchSize: number;
  temperature: number;
  maxConcurrent: number;
  adversarialCount: number;
}

const defaultConfig: TrainingConfig = {
  batchSize: 5,
  temperature: 0.7,
  maxConcurrent: 3,
  adversarialCount: 10,
};

let currentConfig: TrainingConfig = { ...defaultConfig };

// ANSI escape codes for terminal control
const CLEAR_SCREEN = '\x1b[2J\x1b[H';

/**
 * Display the main banner
 */
function displayBanner(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.yellow.bold('            APEX AI TRAINING COMMAND CENTER                      ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.gray('        Autonomous Battle & Learning System v1.0                  ') + chalk.cyan('║'));
  console.log(chalk.cyan('╠══════════════════════════════════════════════════════════════════╣'));
  console.log(chalk.cyan('║') + '                                                                  ' + chalk.cyan('║'));
  console.log(chalk.cyan('║') + chalk.white('  "Train the AI. Perfect the pitch. Close the deal."             ') + chalk.cyan('║'));
  console.log(chalk.cyan('║') + '                                                                  ' + chalk.cyan('║'));
  console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════╝'));
  console.log('');
}

/**
 * Display the main menu
 */
function displayMainMenu(): void {
  console.log(chalk.cyan.bold('\n  MAIN MENU'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Training Modes'));
  console.log(chalk.green('  [2]') + chalk.white(' Persona Management'));
  console.log(chalk.green('  [3]') + chalk.white(' Tactical Operations'));
  console.log(chalk.green('  [4]') + chalk.white(' Audit & Quality'));
  console.log(chalk.green('  [5]') + chalk.white(' Configuration'));
  console.log(chalk.green('  [6]') + chalk.white(' Status & Reports'));
  console.log('');
  console.log(chalk.red('  [0]') + chalk.white(' Exit'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Display training modes submenu
 */
function displayTrainingMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  TRAINING MODES'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Autonomous Battle') + chalk.gray(' - Self-play training against personas'));
  console.log(chalk.green('  [2]') + chalk.white(' Adversarial Training') + chalk.gray(' - Predatory seller scenarios'));
  console.log(chalk.green('  [3]') + chalk.white(' Quick Battle') + chalk.gray(' - Single battle test run'));
  console.log(chalk.green('  [4]') + chalk.white(' Batch Training') + chalk.gray(' - Run multiple battles in sequence'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log(chalk.gray(`  Current Config: Batch=${currentConfig.batchSize}, Temp=${currentConfig.temperature}`));
}

/**
 * Display persona management submenu
 */
function displayPersonaMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  PERSONA MANAGEMENT'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Generate New Personas') + chalk.gray(' - Create diverse seller profiles'));
  console.log(chalk.green('  [2]') + chalk.white(' List Active Personas') + chalk.gray(' - View available personas'));
  console.log(chalk.green('  [3]') + chalk.white(' Golden Samples') + chalk.gray(' - Generate ideal conversation samples'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Display tactical operations submenu
 */
function displayTacticalMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  TACTICAL OPERATIONS'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Start Tactical Scout') + chalk.gray(' - Monitor for breakthroughs'));
  console.log(chalk.green('  [2]') + chalk.white(' Scan Breakthroughs') + chalk.gray(' - Find winning tactics'));
  console.log(chalk.green('  [3]') + chalk.white(' Promote Tactics') + chalk.gray(' - Move elite tactics to production'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Display audit submenu
 */
function displayAuditMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  AUDIT & QUALITY'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Vocal Soul Auditor') + chalk.gray(' - Grade humanity in responses'));
  console.log(chalk.green('  [2]') + chalk.white(' Daily Audit') + chalk.gray(' - Comprehensive system audit'));
  console.log(chalk.green('  [3]') + chalk.white(' Knowledge Audit') + chalk.gray(' - Check knowledge base integrity'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Display configuration submenu
 */
function displayConfigMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  CONFIGURATION'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.white('  Current Settings:'));
  console.log(chalk.gray(`    Batch Size:        `) + chalk.yellow(currentConfig.batchSize.toString()));
  console.log(chalk.gray(`    Temperature:       `) + chalk.yellow(currentConfig.temperature.toString()));
  console.log(chalk.gray(`    Max Concurrent:    `) + chalk.yellow(currentConfig.maxConcurrent.toString()));
  console.log(chalk.gray(`    Adversarial Count: `) + chalk.yellow(currentConfig.adversarialCount.toString()));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' Set Batch Size') + chalk.gray(' (1-10)'));
  console.log(chalk.green('  [2]') + chalk.white(' Set Temperature') + chalk.gray(' (0.1-1.0)'));
  console.log(chalk.green('  [3]') + chalk.white(' Set Max Concurrent') + chalk.gray(' (1-5)'));
  console.log(chalk.green('  [4]') + chalk.white(' Set Adversarial Count') + chalk.gray(' (1-50)'));
  console.log(chalk.green('  [5]') + chalk.white(' Reset to Defaults'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Display status submenu
 */
function displayStatusMenu(): void {
  console.log(CLEAR_SCREEN);
  console.log(chalk.cyan.bold('\n  STATUS & REPORTS'));
  console.log(chalk.gray('  ─────────────────────────────────────────'));
  console.log('');
  console.log(chalk.green('  [1]') + chalk.white(' View Battle Stats') + chalk.gray(' - Recent battle performance'));
  console.log(chalk.green('  [2]') + chalk.white(' Apex Insights') + chalk.gray(' - AI performance analytics'));
  console.log(chalk.green('  [3]') + chalk.white(' Check VAPI Assistants') + chalk.gray(' - List active assistants'));
  console.log(chalk.green('  [4]') + chalk.white(' Check ElevenLabs Voices') + chalk.gray(' - List available voices'));
  console.log('');
  console.log(chalk.yellow('  [b]') + chalk.white(' Back to Main Menu'));
  console.log('');
  console.log(chalk.gray('  ─────────────────────────────────────────'));
}

/**
 * Run a script with visual feedback
 */
async function runScript(scriptName: string, args: string[] = [], description: string): Promise<void> {
  console.log('');
  console.log(chalk.cyan('━'.repeat(60)));
  console.log(chalk.yellow(`  Starting: ${description}`));
  console.log(chalk.gray(`  Script: ${scriptName}`));
  if (args.length > 0) {
    console.log(chalk.gray(`  Args: ${args.join(' ')}`));
  }
  console.log(chalk.cyan('━'.repeat(60)));
  console.log('');

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', `scripts/${scriptName}`].concat(args), {
      stdio: 'inherit',
      cwd: process.cwd(),
      shell: true,
    });

    child.on('close', (code) => {
      console.log('');
      console.log(chalk.cyan('━'.repeat(60)));
      if (code === 0) {
        console.log(chalk.green(`  ✓ ${description} completed successfully`));
      } else {
        console.log(chalk.red(`  ✗ ${description} exited with code ${code}`));
      }
      console.log(chalk.cyan('━'.repeat(60)));
      resolve();
    });

    child.on('error', (err) => {
      console.log(chalk.red(`  ✗ Error: ${err.message}`));
      reject(err);
    });
  });
}

/**
 * Prompt for numeric input
 */
async function promptNumber(
  rl: readline.Interface,
  prompt: string,
  min: number,
  max: number,
  current: number
): Promise<number> {
  return new Promise((resolve) => {
    rl.question(chalk.cyan(`  ${prompt} [${min}-${max}] (current: ${current}): `), (answer) => {
      const num = parseFloat(answer);
      if (isNaN(num) || num < min || num > max) {
        console.log(chalk.red(`  Invalid input. Using current value: ${current}`));
        resolve(current);
      } else {
        resolve(num);
      }
    });
  });
}

/**
 * Wait for user to press Enter
 */
async function waitForEnter(rl: readline.Interface): Promise<void> {
  return new Promise((resolve) => {
    rl.question(chalk.gray('\n  Press Enter to continue...'), () => {
      resolve();
    });
  });
}

/**
 * Handle training menu selection
 */
async function handleTrainingMenu(rl: readline.Interface): Promise<boolean> {
  displayTrainingMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          await runScript('autonomousBattle.ts', [], 'Autonomous Battle Training');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '2':
          await runScript('adversarialTrainer.ts', [currentConfig.adversarialCount.toString()], 'Adversarial Training');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '3':
          console.log(chalk.yellow('\n  Running single quick battle...'));
          await runScript('autonomousBattle.ts', [], 'Quick Battle');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '4':
          console.log(chalk.yellow(`\n  Running batch of ${currentConfig.batchSize} battles...`));
          await runScript('autonomousBattle.ts', [], `Batch Training (${currentConfig.batchSize} battles)`);
          await waitForEnter(rl);
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Handle persona menu selection
 */
async function handlePersonaMenu(rl: readline.Interface): Promise<boolean> {
  displayPersonaMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          await runScript('personaGenerator.ts', [], 'Persona Generation');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '2':
          console.log(chalk.yellow('\n  Fetching active personas from database...'));
          // This would query the database - for now show a message
          console.log(chalk.gray('  Run: npm run sandbox:generate-personas to create new personas'));
          await waitForEnter(rl);
          resolve(true);
          break;
        case '3':
          await runScript('goldenSamples.ts', [], 'Golden Sample Generation');
          await waitForEnter(rl);
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Handle tactical menu selection
 */
async function handleTacticalMenu(rl: readline.Interface): Promise<boolean> {
  displayTacticalMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          await runScript('startTacticalScout.ts', [], 'Tactical Scout');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '2':
          await runScript('scanBreakthroughs.ts', [], 'Breakthrough Scanner');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '3':
          await runScript('promoteTactics.ts', [], 'Tactic Promotion');
          await waitForEnter(rl);
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Handle audit menu selection
 */
async function handleAuditMenu(rl: readline.Interface): Promise<boolean> {
  displayAuditMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          await runScript('vocalSoulAuditor.ts', [], 'Vocal Soul Auditor');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '2':
          await runScript('dailyAuditor.ts', [], 'Daily Audit');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '3':
          await runScript('knowledgeAudit.ts', [], 'Knowledge Audit');
          await waitForEnter(rl);
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Handle config menu selection
 */
async function handleConfigMenu(rl: readline.Interface): Promise<boolean> {
  displayConfigMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          currentConfig.batchSize = await promptNumber(rl, 'Batch Size', 1, 10, currentConfig.batchSize);
          console.log(chalk.green(`  ✓ Batch size set to ${currentConfig.batchSize}`));
          resolve(true);
          break;
        case '2':
          currentConfig.temperature = await promptNumber(rl, 'Temperature', 0.1, 1.0, currentConfig.temperature);
          console.log(chalk.green(`  ✓ Temperature set to ${currentConfig.temperature}`));
          resolve(true);
          break;
        case '3':
          currentConfig.maxConcurrent = await promptNumber(rl, 'Max Concurrent', 1, 5, currentConfig.maxConcurrent);
          console.log(chalk.green(`  ✓ Max concurrent set to ${currentConfig.maxConcurrent}`));
          resolve(true);
          break;
        case '4':
          currentConfig.adversarialCount = await promptNumber(rl, 'Adversarial Count', 1, 50, currentConfig.adversarialCount);
          console.log(chalk.green(`  ✓ Adversarial count set to ${currentConfig.adversarialCount}`));
          resolve(true);
          break;
        case '5':
          currentConfig = { ...defaultConfig };
          console.log(chalk.green('  ✓ Configuration reset to defaults'));
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Handle status menu selection
 */
async function handleStatusMenu(rl: readline.Interface): Promise<boolean> {
  displayStatusMenu();

  return new Promise((resolve) => {
    rl.question(chalk.cyan('\n  Select option: '), async (answer) => {
      switch (answer.toLowerCase()) {
        case '1':
          console.log(chalk.yellow('\n  Fetching recent battle statistics...'));
          console.log(chalk.gray('  View the Training Monitor dashboard for detailed stats'));
          await waitForEnter(rl);
          resolve(true);
          break;
        case '2':
          await runScript('apexInsights.ts', [], 'Apex Insights');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '3':
          await runScript('list-vapi-assistants.ts', [], 'VAPI Assistant List');
          await waitForEnter(rl);
          resolve(true);
          break;
        case '4':
          await runScript('list-elevenlabs-voices.ts', [], 'ElevenLabs Voice List');
          await waitForEnter(rl);
          resolve(true);
          break;
        case 'b':
          resolve(false);
          break;
        default:
          console.log(chalk.red('  Invalid option'));
          resolve(true);
      }
    });
  });
}

/**
 * Main application loop
 */
async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let running = true;

  // Handle Ctrl+C gracefully
  rl.on('close', () => {
    console.log(chalk.yellow('\n\n  Goodbye! Training session ended.\n'));
    process.exit(0);
  });

  while (running) {
    displayBanner();
    displayMainMenu();

    const answer = await new Promise<string>((resolve) => {
      rl.question(chalk.cyan('  Select option: '), resolve);
    });

    switch (answer) {
      case '1':
        let trainingContinue = true;
        while (trainingContinue) {
          trainingContinue = await handleTrainingMenu(rl);
        }
        break;
      case '2':
        let personaContinue = true;
        while (personaContinue) {
          personaContinue = await handlePersonaMenu(rl);
        }
        break;
      case '3':
        let tacticalContinue = true;
        while (tacticalContinue) {
          tacticalContinue = await handleTacticalMenu(rl);
        }
        break;
      case '4':
        let auditContinue = true;
        while (auditContinue) {
          auditContinue = await handleAuditMenu(rl);
        }
        break;
      case '5':
        let configContinue = true;
        while (configContinue) {
          configContinue = await handleConfigMenu(rl);
        }
        break;
      case '6':
        let statusContinue = true;
        while (statusContinue) {
          statusContinue = await handleStatusMenu(rl);
        }
        break;
      case '0':
        running = false;
        console.log(chalk.yellow('\n  Goodbye! Training session ended.\n'));
        break;
      default:
        console.log(chalk.red('  Invalid option. Please try again.'));
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  rl.close();
}

// Run the application
main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
