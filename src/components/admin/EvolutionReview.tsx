'use client';

/**
 * Evolution Review Component
 * Side-by-side diff view for reviewing and approving prompt evolutions
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Edit, 
  History, 
  ArrowLeft, 
  Sparkles,
  TrendingUp,
  Clock,
  User,
  FileText
} from 'lucide-react';

interface PendingEvolution {
  id: string;
  assistant_id: string;
  version_number: number;
  prompt_text: string;
  changes_summary: string | null;
  stories_added: string[] | null;
  status: 'pending_review' | 'active' | 'rejected' | 'draft';
  current_prompt?: string;
  story_details?: Array<{
    id: string;
    story_text: string;
    story_summary: string;
    engagement_rating: number;
    industry_niche: string;
  }>;
  impact_metrics?: {
    call_count: number;
    avg_goat_score: number;
    avg_humanity_score: number;
  };
  created_at: string;
}

interface VersionHistory {
  id: string;
  version_number: number;
  changes_summary: string | null;
  status: string;
  applied_at: string;
  applied_by: string | null;
  is_active: boolean;
}

// Simple diff viewer component (no external library needed)
function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="grid grid-cols-2 gap-4 font-mono text-sm">
      {/* Old Version */}
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <div className="mb-2 text-xs font-semibold text-red-400">Current Prompt</div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {oldLines.map((line, i) => (
            <div key={i} className="text-gray-400 whitespace-pre-wrap break-words">
              {line || ' '}
            </div>
          ))}
        </div>
      </div>

      {/* New Version */}
      <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/5 p-4">
        <div className="mb-2 text-xs font-semibold text-[#22C55E]">Suggested Prompt</div>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {newLines.map((line, i) => {
            const isNew = i >= oldLines.length || line !== oldLines[i];
            return (
              <div
                key={i}
                className={`whitespace-pre-wrap break-words ${
                  isNew ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'text-gray-300'
                }`}
              >
                {line || ' '}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EvolutionReview() {
  const [evolutions, setEvolutions] = useState<PendingEvolution[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvolution, setSelectedEvolution] = useState<PendingEvolution | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchEvolutions();
  }, []);

  const fetchEvolutions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/pending-evolutions');
      if (response.ok) {
        const data = await response.json();
        setEvolutions(data.evolutions || []);
        if (data.evolutions && data.evolutions.length > 0) {
          setSelectedEvolution(data.evolutions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching evolutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVersionHistory = async (assistantId: string) => {
    try {
      const response = await fetch(`/api/admin/pending-evolutions?assistantId=${assistantId}&type=history`);
      if (response.ok) {
        const data = await response.json();
        setVersionHistory(data.evolutions || []);
      }
    } catch (error) {
      console.error('Error fetching version history:', error);
    }
  };

  const handleApprove = async (evolution: PendingEvolution) => {
    try {
      setProcessing(evolution.id);
      const response = await fetch('/api/admin/approve-evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evolutionId: evolution.id,
          editedPrompt: editing && editedPrompt ? editedPrompt : undefined,
        }),
      });

      if (response.ok) {
        await fetchEvolutions();
        setSelectedEvolution(null);
        setEditing(false);
        alert('Evolution approved and applied successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to approve: ${error.error}`);
      }
    } catch (error) {
      console.error('Error approving evolution:', error);
      alert('Failed to approve evolution');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (evolution: PendingEvolution, reason: string) => {
    try {
      setProcessing(evolution.id);
      const response = await fetch('/api/admin/reject-evolution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evolutionId: evolution.id,
          reason,
        }),
      });

      if (response.ok) {
        await fetchEvolutions();
        setSelectedEvolution(null);
        alert('Evolution rejected');
      } else {
        const error = await response.json();
        alert(`Failed to reject: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting evolution:', error);
      alert('Failed to reject evolution');
    } finally {
      setProcessing(null);
    }
  };

  const handleRollback = async (version: VersionHistory) => {
    if (!confirm(`Roll back to version ${version.version_number}? This will deactivate the current version.`)) {
      return;
    }

    try {
      setProcessing(version.id);
      // Get the full version data
      const response = await fetch(`/api/admin/pending-evolutions?assistantId=${selectedEvolution?.assistant_id}&type=history`);
      if (response.ok) {
        const data = await response.json();
        const targetVersion = data.evolutions.find((v: any) => v.id === version.id);
        
        if (targetVersion) {
          // Approve this version (which will deactivate current)
          await handleApprove(targetVersion as PendingEvolution);
        }
      }
    } catch (error) {
      console.error('Error rolling back:', error);
      alert('Failed to rollback');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (evolutions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No pending evolutions</p>
        <p className="text-sm mt-2">New prompt evolutions will appear here after running evolve:prompts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Evolution Approval Dashboard</h2>
            <p className="text-sm text-gray-400">Review and approve AI prompt updates</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-semibold flex items-center gap-2 hover:bg-white/10 transition-all"
        >
          <History className="w-4 h-4" />
          {showHistory ? 'Hide' : 'Show'} History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">Pending Reviews</h3>
          {evolutions.map((evolution) => (
            <motion.div
              key={evolution.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                setSelectedEvolution(evolution);
                setEditing(false);
                fetchVersionHistory(evolution.assistant_id);
              }}
              className={`rounded-xl p-4 border cursor-pointer transition-all ${
                selectedEvolution?.id === evolution.id
                  ? 'border-[#22C55E]/50 bg-[#22C55E]/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">
                  Version {evolution.version_number}
                </span>
                <Clock className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">
                {evolution.changes_summary || 'No summary'}
              </p>
              {evolution.impact_metrics && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>{evolution.impact_metrics.call_count} calls • Avg: {evolution.impact_metrics.avg_goat_score}%</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Review Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEvolution ? (
            <>
              {/* Impact Metrics */}
              {selectedEvolution.impact_metrics && (
                <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                  <h4 className="text-sm font-semibold text-white mb-3">Impact Metrics</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-[#22C55E]">
                        {selectedEvolution.impact_metrics.call_count}
                      </div>
                      <div className="text-xs text-gray-400">Calls Analyzed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-400">
                        {selectedEvolution.impact_metrics.avg_goat_score}%
                      </div>
                      <div className="text-xs text-gray-400">Avg Goat Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-400">
                        {selectedEvolution.impact_metrics.avg_humanity_score}%
                      </div>
                      <div className="text-xs text-gray-400">Avg Humanity Score</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Story Highlights */}
              {selectedEvolution.story_details && selectedEvolution.story_details.length > 0 && (
                <div className="rounded-xl p-4 border border-purple-500/30 bg-purple-500/5">
                  <h4 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    New Third-Party Stories ({selectedEvolution.story_details.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedEvolution.story_details.map((story) => (
                      <div
                        key={story.id}
                        className="rounded-lg p-3 border border-purple-500/20 bg-purple-500/5"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-purple-300">
                            {story.industry_niche.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-purple-400">
                            Engagement: {story.engagement_rating}/10
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {story.story_summary || story.story_text.substring(0, 150) + '...'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diff View */}
              <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                <h4 className="text-sm font-semibold text-white mb-4">Prompt Comparison</h4>
                {editing ? (
                  <div className="space-y-4">
                    <textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      className="w-full h-96 p-4 rounded-lg bg-[#0B0E14] border border-white/10 text-white font-mono text-sm"
                      placeholder="Edit the prompt..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(false);
                          setEditedPrompt('');
                        }}
                        className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleApprove({ ...selectedEvolution, prompt_text: editedPrompt })}
                        className="px-4 py-2 rounded-lg bg-[#22C55E] text-white text-sm font-semibold"
                      >
                        Approve Edited Version
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <DiffView
                      oldText={selectedEvolution.current_prompt || ''}
                      newText={selectedEvolution.prompt_text}
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedEvolution)}
                        disabled={processing === selectedEvolution.id}
                        className="flex-1 px-4 py-3 rounded-lg bg-[#22C55E] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#16a34a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing === selectedEvolution.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Approve & Apply
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(true);
                          setEditedPrompt(selectedEvolution.prompt_text);
                        }}
                        className="px-4 py-3 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/50 font-semibold flex items-center gap-2 hover:bg-blue-500/30 transition-all"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Rejection reason (optional):');
                          if (reason !== null) {
                            handleReject(selectedEvolution, reason || 'Rejected by admin');
                          }
                        }}
                        className="px-4 py-3 rounded-lg bg-red-500/20 text-red-400 border border-red-500/50 font-semibold flex items-center gap-2 hover:bg-red-500/30 transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Version History Timeline */}
              {showHistory && versionHistory.length > 0 && (
                <div className="rounded-xl p-4 border border-white/10 bg-white/5">
                  <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Version History
                  </h4>
                  <div className="space-y-3">
                    {versionHistory.map((version, index) => (
                      <div
                        key={version.id}
                        className="flex items-start gap-4 p-3 rounded-lg border border-white/10 bg-white/5"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              version.is_active
                                ? 'bg-[#22C55E]'
                                : version.status === 'rejected'
                                ? 'bg-red-500'
                                : 'bg-gray-500'
                            }`}
                          />
                          {index < versionHistory.length - 1 && (
                            <div className="w-0.5 h-8 bg-white/10 mt-1" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-white">
                              Version {version.version_number}
                            </span>
                            {version.is_active && (
                              <span className="text-xs px-2 py-1 rounded bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/50">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-2">
                            {version.changes_summary || 'No summary'}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(version.applied_at).toLocaleDateString()}
                            </span>
                            {version.applied_by && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                Applied by admin
                              </span>
                            )}
                          </div>
                          {!version.is_active && version.status === 'active' && (
                            <button
                              onClick={() => handleRollback(version)}
                              disabled={processing === version.id}
                              className="mt-2 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/50 text-xs font-semibold hover:bg-amber-500/30 transition-all disabled:opacity-50"
                            >
                              {processing === version.id ? 'Rolling back...' : 'Rollback to this version'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an evolution to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
