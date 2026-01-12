/**
 * Daily Manager Recap Cron Job
 * Runs every morning at 8:00 AM to send daily performance recap
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDailyRecap } from '@/lib/getDailyRecap';

import { generateManagerRecapHTML } from '@/components/emails/ManagerRecapHTML';
import logger from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      logger.error('CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'Cron secret not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get daily recap data
    const recapData = await getDailyRecap();

    // Get supabaseAdmin
    const { supabaseAdmin } = await import('@/lib/supabase');
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Get admin email from profiles
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('email, name')
      .eq('is_admin', true)
      .limit(10);

    if (adminError || !admins || admins.length === 0) {
      logger.error('Error fetching admin emails', { error: adminError });
      return NextResponse.json(
        { error: 'No admin emails found', recapData },
        { status: 500 }
      );
    }

    // Generate email HTML
    const emailHtml = generateManagerRecapHTML({
      date: recapData.date,
      teamAverageGoatScore: recapData.teamAverageGoatScore,
      teamAverageChange: recapData.teamAverageChange,
      scriptAdherenceLeader: recapData.scriptAdherenceLeader
        ? {
            name: recapData.scriptAdherenceLeader.name,
            averageScriptAdherence: recapData.scriptAdherenceLeader.averageScriptAdherence,
          }
        : null,
      scriptHole: recapData.scriptHole,
      topRebuttal: recapData.topRebuttal
        ? {
            text: recapData.topRebuttal.text,
            repName: recapData.topRebuttal.repName,
            goatScore: recapData.topRebuttal.goatScore,
          }
        : null,
      repPerformance: recapData.repPerformance.map((rep) => ({
        name: rep.name,
        totalCalls: rep.totalCalls,
        averageGoatScore: rep.averageGoatScore,
        goatModePercentage: rep.goatModePercentage,
      })),
      executiveSummary: recapData.executiveSummary,
      actionableAdvice: recapData.actionableAdvice,
    });

    // Send email using Resend (if configured) or log for manual sending
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'noreply@salesgoat.app';

    if (resendApiKey) {
      try {
        const resendModule = await (Function('return import("resend")')()) as any;
        const Resend = resendModule.Resend || resendModule.default?.Resend || resendModule.default;
        const resendClient = new Resend(resendApiKey);

        // Send to all admins
        const emailPromises = (admins as any[]).map((admin: any) =>
          resendClient.emails.send({
            from: fromEmail,
            to: admin.email,
            subject: `🐐 Daily Manager Recap - ${new Date(recapData.date).toLocaleDateString()}`,
            html: emailHtml,
          })
        );

        await Promise.all(emailPromises);

        return NextResponse.json({
          success: true,
          message: `Daily recap sent to ${admins.length} admin(s)`,
          recapData: {
            date: recapData.date,
            teamAverageGoatScore: recapData.teamAverageGoatScore,
            repCount: recapData.repPerformance.length,
          },
        });
      } catch (emailError) {
        logger.error('Error sending email via Resend', { error: emailError });
        // Fall through to return recap data even if email fails
      }
    } else {
      // If Resend is not configured, log the email HTML for manual sending
      logger.warn('RESEND_API_KEY not configured - email HTML generated but not sent');
    }

    // Return recap data even if email sending fails
    return NextResponse.json({
      success: true,
      message: 'Recap generated (email not sent - check logs)',
      recapData: {
        date: recapData.date,
        teamAverageGoatScore: recapData.teamAverageGoatScore,
        repCount: recapData.repPerformance.length,
        emailHtml: resendApiKey ? undefined : emailHtml, // Include HTML if Resend not configured
      },
    });
  } catch (error) {
    logger.error('Error in daily recap cron', { error });
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
