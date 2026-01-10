/**
 * Manager Daily Recap Email Template
 * React Email component with "Glow" aesthetic
 */

import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Row,
  Column,
  Img,
} from '@react-email/components';

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

export default function ManagerRecapEmail({
  date,
  teamAverageGoatScore,
  teamAverageChange,
  scriptAdherenceLeader,
  scriptHole,
  topRebuttal,
  repPerformance,
  executiveSummary,
  actionableAdvice,
}: ManagerRecapEmailProps) {
  const changeColor = teamAverageChange >= 0 ? '#22C55E' : '#EF4444';
  const changeSymbol = teamAverageChange >= 0 ? '↑' : '↓';

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🐐 Daily Manager Recap</Heading>
            <Text style={dateText}>{new Date(date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</Text>
          </Section>

          {/* Executive Summary */}
          <Section style={summarySection}>
            <Heading style={h2}>Executive Summary</Heading>
            <Text style={summaryText}>{executiveSummary}</Text>
          </Section>

          {/* Team Average Score */}
          <Section style={scoreCard}>
            <Row>
              <Column>
                <Text style={scoreLabel}>Team Average Goat Score</Text>
                <Heading style={scoreValue}>{teamAverageGoatScore}/100</Heading>
                <Text style={{ ...changeText, color: changeColor }}>
                  {changeSymbol} {Math.abs(teamAverageChange)}% from yesterday
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Script Adherence Leader */}
          {scriptAdherenceLeader && (
            <Section style={leaderCard}>
              <Heading style={h3}>⭐ Script Adherence Leader</Heading>
              <Text style={leaderText}>
                <strong>{scriptAdherenceLeader.name}</strong> with {scriptAdherenceLeader.averageScriptAdherence}% average adherence
              </Text>
            </Section>
          )}

          {/* The Script Hole */}
          {scriptHole && (
            <Section style={warningCard}>
              <Heading style={h3}>⚠️ The Script Hole</Heading>
              <Text style={warningText}>
                <strong>Gate {scriptHole.gate}: {scriptHole.gateName}</strong>
              </Text>
              <Text style={warningText}>
                Team average: {scriptHole.averageAdherence}% adherence
              </Text>
            </Section>
          )}

          {/* Rep Scoreboard */}
          <Section style={scoreboardSection}>
            <Heading style={h2}>Rep Scoreboard</Heading>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Rep</th>
                  <th style={th}>Calls</th>
                  <th style={th}>Avg Score</th>
                  <th style={th}>Goat Mode</th>
                </tr>
              </thead>
              <tbody>
                {repPerformance.map((rep, index) => (
                  <tr key={index}>
                    <td style={td}>{rep.name}</td>
                    <td style={td}>{rep.totalCalls}</td>
                    <td style={td}>{rep.averageGoatScore}/100</td>
                    <td style={{ ...td, color: rep.goatModePercentage >= 50 ? '#22C55E' : '#EAB308' }}>
                      {rep.goatModePercentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Top Rebuttal */}
          {topRebuttal && (
            <Section style={rebuttalCard}>
              <Heading style={h3}>🔥 Top Rebuttal of the Day</Heading>
              <Text style={rebuttalText}>
                <strong>{topRebuttal.repName}</strong> (Score: {topRebuttal.goatScore}/100)
              </Text>
              <Text style={rebuttalQuote}>"{topRebuttal.text}"</Text>
            </Section>
          )}

          {/* Actionable Advice */}
          <Section style={adviceCard}>
            <Heading style={h2}>Actionable Advice</Heading>
            <Text style={adviceText}>{actionableAdvice}</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Sales Goat Training App • Automated Daily Recap
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles matching the "Glow" aesthetic
const main = {
  backgroundColor: '#0B0E14',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#0B0E14',
  padding: '40px 20px',
  maxWidth: '600px',
  margin: '0 auto',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '40px',
  paddingBottom: '20px',
  borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
};

const h1 = {
  color: '#FFFFFF',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
  textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
};

const dateText = {
  color: '#9CA3AF',
  fontSize: '14px',
  margin: '0',
};

const summarySection = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const h2 = {
  color: '#FFFFFF',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const summaryText = {
  color: '#E5E7EB',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
};

const scoreCard = {
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid rgba(34, 197, 94, 0.3)',
  textAlign: 'center' as const,
};

const scoreLabel = {
  color: '#9CA3AF',
  fontSize: '14px',
  margin: '0 0 8px 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const scoreValue = {
  color: '#22C55E',
  fontSize: '48px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
};

const changeText = {
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const leaderCard = {
  backgroundColor: 'rgba(234, 179, 8, 0.1)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid rgba(234, 179, 8, 0.3)',
};

const h3 = {
  color: '#FFFFFF',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const leaderText = {
  color: '#E5E7EB',
  fontSize: '16px',
  margin: '0',
};

const warningCard = {
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid rgba(239, 68, 68, 0.3)',
};

const warningText = {
  color: '#FCA5A5',
  fontSize: '16px',
  margin: '8px 0',
};

const scoreboardSection = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  marginTop: '16px',
};

const th = {
  color: '#9CA3AF',
  fontSize: '12px',
  fontWeight: '600',
  textAlign: 'left' as const,
  padding: '12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
};

const td = {
  color: '#E5E7EB',
  fontSize: '14px',
  padding: '12px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
};

const rebuttalCard = {
  backgroundColor: 'rgba(34, 197, 94, 0.1)',
  borderRadius: '16px',
  padding: '20px',
  marginBottom: '24px',
  border: '1px solid rgba(34, 197, 94, 0.3)',
};

const rebuttalText = {
  color: '#E5E7EB',
  fontSize: '14px',
  margin: '0 0 12px 0',
};

const rebuttalQuote = {
  color: '#22C55E',
  fontSize: '16px',
  fontStyle: 'italic' as const,
  margin: '0',
  padding: '16px',
  backgroundColor: 'rgba(0, 0, 0, 0.2)',
  borderRadius: '8px',
  borderLeft: '4px solid #22C55E',
};

const adviceCard = {
  backgroundColor: 'rgba(59, 130, 246, 0.1)',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '24px',
  border: '1px solid rgba(59, 130, 246, 0.3)',
};

const adviceText = {
  color: '#E5E7EB',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0',
  fontWeight: '500',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '32px 0',
};

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
};

const footerText = {
  color: '#6B7280',
  fontSize: '12px',
  margin: '0',
};
