/**
 * Shadow Overlay Component
 * React component for the floating sidebar injected into Aircall
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  X, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface LeadContext {
  factFinding?: string;
  previousCalls?: number;
  lastScore?: number;
}

interface Rebuttal {
  text: string;
  context?: string;
  similarity?: number;
}

interface ShadowOverlayProps {
  onClose?: () => void;
}

export class ShadowOverlay {
  private container: HTMLDivElement | null = null;
  private root: any = null;
  private isVisible = false;
  private state: 'idle' | 'connecting' | 'active' | 'ended' = 'idle';
  private certainty = 50;
  private sentiment: 'Neutral' | 'Engaged' | 'Frustrated' = 'Neutral';
  private transcript = '';
  private rebuttal: Rebuttal | null = null;
  private leadContext: LeadContext | null = null;
  private isCollapsed = false;

  inject() {
    // Check if already injected
    if (document.getElementById('sales-goat-shadow-overlay')) {
      return;
    }

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'sales-goat-shadow-overlay';
    document.body.appendChild(this.container);

    // Render React component
    this.root = createRoot(this.container);
    this.render();
  }

  remove() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  show() {
    this.isVisible = true;
    this.render();
  }

  hide() {
    this.isVisible = false;
    this.render();
  }

  updateState(state: 'idle' | 'connecting' | 'active' | 'ended') {
    this.state = state;
    this.render();
  }

  updateCertainty(value: number) {
    this.certainty = Math.max(0, Math.min(100, value));
    this.render();
  }

  updateSentiment(sentiment: 'Neutral' | 'Engaged' | 'Frustrated') {
    this.sentiment = sentiment;
    this.render();
  }

  updateTranscript(text: string) {
    this.transcript = text;
    this.render();
  }

  displayRebuttal(rebuttal: Rebuttal) {
    this.rebuttal = rebuttal;
    this.render();
  }

  displayLeadContext(context: LeadContext) {
    this.leadContext = context;
    this.render();
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    this.render();
  }

  private render() {
    if (!this.root || !this.container) return;

    this.root.render(
      <ShadowOverlayComponent
        visible={this.isVisible}
        state={this.state}
        certainty={this.certainty}
        sentiment={this.sentiment}
        transcript={this.transcript}
        rebuttal={this.rebuttal}
        leadContext={this.leadContext}
        isCollapsed={this.isCollapsed}
        onToggleCollapse={() => this.toggleCollapse()}
        onClose={() => this.hide()}
      />
    );
  }
}

function ShadowOverlayComponent({
  visible,
  state,
  certainty,
  sentiment,
  transcript,
  rebuttal,
  leadContext,
  isCollapsed,
  onToggleCollapse,
  onClose,
}: {
  visible: boolean;
  state: 'idle' | 'connecting' | 'active' | 'ended';
  certainty: number;
  sentiment: 'Neutral' | 'Engaged' | 'Frustrated';
  transcript: string;
  rebuttal: Rebuttal | null;
  leadContext: LeadContext | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}) {
  const getCertaintyColor = (value: number) => {
    if (value >= 75) return '#22C55E';
    if (value >= 50) return '#EAB308';
    return '#EF4444';
  };

  const getSentimentColor = () => {
    if (sentiment === 'Frustrated') return '#EF4444';
    if (sentiment === 'Engaged') return '#22C55E';
    return '#999';
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: isCollapsed ? 340 : 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="sales-goat-overlay"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isCollapsed ? '60px' : '380px',
          height: '100vh',
          zIndex: 999999,
          pointerEvents: 'all',
        }}
      >
        <div
          className="sales-goat-sidebar"
          style={{
            width: '100%',
            height: '100%',
            background: 'rgba(11, 14, 20, 0.95)',
            backdropFilter: 'blur(10px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px',
              borderBottom: `1px solid ${
                state === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'
              }`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
            }}
          >
            {!isCollapsed && (
              <>
                <div style={{ fontSize: '20px' }}>🐐</div>
                <div style={{ flex: 1, fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                  Sales Goat Shadow
                </div>
                <button
                  onClick={onClose}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#999';
                  }}
                >
                  ×
                </button>
              </>
            )}
            <button
              onClick={onToggleCollapse}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              {isCollapsed ? (
                <ChevronLeft size={20} />
              ) : (
                <ChevronRight size={20} />
              )}
            </button>
          </div>

          {!isCollapsed && (
            <div
              style={{
                flex: 1,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto',
              }}
            >
              {/* Lead Context */}
              {leadContext && (
                <Section title="Lead Context" icon={<Shield size={16} />}>
                  {leadContext.factFinding && (
                    <ContextItem label="The Why" value={leadContext.factFinding} />
                  )}
                  {leadContext.previousCalls !== undefined && (
                    <ContextItem label="Previous Calls" value={`${leadContext.previousCalls} calls`} />
                  )}
                  {leadContext.lastScore !== undefined && (
                    <ContextItem label="Last Score" value={`${leadContext.lastScore}/100`} />
                  )}
                </Section>
              )}

              {/* Live Transcript */}
              <Section title="Live Transcript" icon={<MessageSquare size={16} />}>
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: '#ccc',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    padding: '8px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                  }}
                >
                  {transcript || 'Waiting for transcript...'}
                </div>
              </Section>

              {/* Rebuttal */}
              {rebuttal && (
                <Section title="Goat Rebuttal" icon={<AlertCircle size={16} />}>
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: '#fff',
                      fontStyle: 'italic',
                      padding: '12px',
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '8px',
                      boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
                    }}
                  >
                    "{rebuttal.text}"
                  </div>
                  {rebuttal.context && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#999',
                        marginTop: '8px',
                      }}
                    >
                      Context: {rebuttal.context}
                    </div>
                  )}
                </Section>
              )}

              {/* Certainty Meter */}
              <Section title="Certainty Meter" icon={<TrendingUp size={16} />}>
                <div style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      marginBottom: '4px',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${certainty}%` }}
                      transition={{ duration: 0.3 }}
                      style={{
                        height: '100%',
                        background: getCertaintyColor(certainty),
                        boxShadow: `0 0 10px ${getCertaintyColor(certainty)}`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: getCertaintyColor(certainty),
                      textAlign: 'right',
                    }}
                  >
                    {Math.round(certainty)}%
                  </div>
                </div>
              </Section>

              {/* Sentiment */}
              <Section title="Lead Sentiment">
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'inline-block',
                    background:
                      sentiment === 'Frustrated'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : sentiment === 'Engaged'
                        ? 'rgba(34, 197, 94, 0.2)'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: getSentimentColor(),
                    boxShadow:
                      sentiment !== 'Neutral'
                        ? `0 0 10px ${getSentimentColor()}40`
                        : 'none',
                  }}
                >
                  {sentiment}
                </div>
                {sentiment === 'Frustrated' && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#EF4444',
                      marginTop: '8px',
                      padding: '8px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderRadius: '6px',
                    }}
                  >
                    ⚠️ Lead is getting frustrated - Pivot to Step 1: Approval
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '16px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#22C55E',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function ContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', color: '#fff' }}>{value}</div>
    </div>
  );
}
