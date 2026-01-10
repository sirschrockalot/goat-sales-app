/**
 * Manager Daily Recap Email Template (HTML Version)
 * Simple HTML template with "Glow" aesthetic for email clients
 */

interface ManagerRecapEmailProps {
  date: string;
  teamAverageGoatScore: number;
  teamAverageChange: number;
  scriptAdherenceLeader: {
    name: string;
    averageScriptAdherence: number;
  } | null;
  scriptHole: {
    gate: number;
    gateName: string;
    averageAdherence: number;
  } | null;
  topRebuttal: {
    text: string;
    repName: string;
    goatScore: number;
  } | null;
  repPerformance: Array<{
    name: string;
    totalCalls: number;
    averageGoatScore: number;
    goatModePercentage: number;
  }>;
  executiveSummary: string;
  actionableAdvice: string;
}

export function generateManagerRecapHTML({
  date,
  teamAverageGoatScore,
  teamAverageChange,
  scriptAdherenceLeader,
  scriptHole,
  topRebuttal,
  repPerformance,
  executiveSummary,
  actionableAdvice,
}: ManagerRecapEmailProps): string {
  const changeColor = teamAverageChange >= 0 ? '#22C55E' : '#EF4444';
  const changeSymbol = teamAverageChange >= 0 ? '↑' : '↓';
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Manager Recap</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0E14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0E14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #0B0E14;">
          <!-- Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid rgba(255, 255, 255, 0.1);">
              <h1 style="color: #FFFFFF; font-size: 32px; font-weight: bold; margin: 0 0 10px 0; text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);">🐐 Daily Manager Recap</h1>
              <p style="color: #9CA3AF; font-size: 14px; margin: 0;">${formattedDate}</p>
            </td>
          </tr>

          <!-- Executive Summary -->
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">Executive Summary</h2>
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0;">${executiveSummary}</p>
            </td>
          </tr>

          <!-- Team Average Score -->
          <tr>
            <td style="background-color: rgba(34, 197, 94, 0.1); border-radius: 16px; padding: 24px; margin: 24px 0; border: 1px solid rgba(34, 197, 94, 0.3); text-align: center;">
              <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Team Average Goat Score</p>
              <h2 style="color: #22C55E; font-size: 48px; font-weight: bold; margin: 0 0 8px 0; text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);">${teamAverageGoatScore}/100</h2>
              <p style="color: ${changeColor}; font-size: 14px; font-weight: 600; margin: 0;">${changeSymbol} ${Math.abs(teamAverageChange)}% from yesterday</p>
            </td>
          </tr>

          ${scriptAdherenceLeader ? `
          <!-- Script Adherence Leader -->
          <tr>
            <td style="background-color: rgba(234, 179, 8, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid rgba(234, 179, 8, 0.3);">
              <h3 style="color: #FFFFFF; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">⭐ Script Adherence Leader</h3>
              <p style="color: #E5E7EB; font-size: 16px; margin: 0;"><strong>${scriptAdherenceLeader.name}</strong> with ${scriptAdherenceLeader.averageScriptAdherence}% average adherence</p>
            </td>
          </tr>
          ` : ''}

          ${scriptHole ? `
          <!-- The Script Hole -->
          <tr>
            <td style="background-color: rgba(239, 68, 68, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid rgba(239, 68, 68, 0.3);">
              <h3 style="color: #FFFFFF; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">⚠️ The Script Hole</h3>
              <p style="color: #FCA5A5; font-size: 16px; margin: 8px 0;"><strong>Gate ${scriptHole.gate}: ${scriptHole.gateName}</strong></p>
              <p style="color: #FCA5A5; font-size: 16px; margin: 8px 0;">Team average: ${scriptHole.averageAdherence}% adherence</p>
            </td>
          </tr>
          ` : ''}

          <!-- Rep Scoreboard -->
          <tr>
            <td style="background-color: rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px; margin: 24px 0; border: 1px solid rgba(255, 255, 255, 0.1);">
              <h2 style="color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">Rep Scoreboard</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-top: 16px;">
                <thead>
                  <tr>
                    <th style="color: #9CA3AF; font-size: 12px; font-weight: 600; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-transform: uppercase; letter-spacing: 1px;">Rep</th>
                    <th style="color: #9CA3AF; font-size: 12px; font-weight: 600; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-transform: uppercase; letter-spacing: 1px;">Calls</th>
                    <th style="color: #9CA3AF; font-size: 12px; font-weight: 600; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-transform: uppercase; letter-spacing: 1px;">Avg Score</th>
                    <th style="color: #9CA3AF; font-size: 12px; font-weight: 600; text-align: left; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-transform: uppercase; letter-spacing: 1px;">Goat Mode</th>
                  </tr>
                </thead>
                <tbody>
                  ${repPerformance.map((rep) => `
                  <tr>
                    <td style="color: #E5E7EB; font-size: 14px; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${rep.name}</td>
                    <td style="color: #E5E7EB; font-size: 14px; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${rep.totalCalls}</td>
                    <td style="color: #E5E7EB; font-size: 14px; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${rep.averageGoatScore}/100</td>
                    <td style="color: ${rep.goatModePercentage >= 50 ? '#22C55E' : '#EAB308'}; font-size: 14px; padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${rep.goatModePercentage}%</td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          ${topRebuttal ? `
          <!-- Top Rebuttal -->
          <tr>
            <td style="background-color: rgba(34, 197, 94, 0.1); border-radius: 16px; padding: 20px; margin: 24px 0; border: 1px solid rgba(34, 197, 94, 0.3);">
              <h3 style="color: #FFFFFF; font-size: 18px; font-weight: bold; margin: 0 0 12px 0;">🔥 Top Rebuttal of the Day</h3>
              <p style="color: #E5E7EB; font-size: 14px; margin: 0 0 12px 0;"><strong>${topRebuttal.repName}</strong> (Score: ${topRebuttal.goatScore}/100)</p>
              <p style="color: #22C55E; font-size: 16px; font-style: italic; margin: 0; padding: 16px; background-color: rgba(0, 0, 0, 0.2); border-radius: 8px; border-left: 4px solid #22C55E;">"${topRebuttal.text}"</p>
            </td>
          </tr>
          ` : ''}

          <!-- Actionable Advice -->
          <tr>
            <td style="background-color: rgba(59, 130, 246, 0.1); border-radius: 16px; padding: 24px; margin: 24px 0; border: 1px solid rgba(59, 130, 246, 0.3);">
              <h2 style="color: #FFFFFF; font-size: 20px; font-weight: bold; margin: 0 0 16px 0;">Actionable Advice</h2>
              <p style="color: #E5E7EB; font-size: 16px; line-height: 1.6; margin: 0; font-weight: 500;">${actionableAdvice}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="text-align: center; margin-top: 32px; padding-top: 32px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
              <p style="color: #6B7280; font-size: 12px; margin: 0;">Sales Goat Training App • Automated Daily Recap</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
