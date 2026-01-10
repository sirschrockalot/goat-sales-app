'use client';

/**
 * User Management Component
 * Displays pending invites and active team roster with access management
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Mail,
  Clock,
  UserX,
  RefreshCw,
  Shield,
  Trophy,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface PendingInvite {
  id: string;
  email: string;
  invitedAt: string;
  confirmedAt: null;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  gauntletLevel: number;
  lastActive: string | null;
  createdAt: string;
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');

      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data.pendingInvites || []);
        setActiveUsers(data.activeUsers || []);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to fetch users' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch users. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleResendInvite = async (email: string) => {
    setResending(email);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Invitation resent to ${email}` });
        // Refresh the list
        setTimeout(() => fetchUsers(), 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to resend invitation' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to resend invitation. Please try again.' });
    } finally {
      setResending(null);
    }
  };

  const handleRevokeAccess = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${userName}? This action cannot be undone.`)) {
      return;
    }

    setRevoking(userId);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `Access revoked for ${userName}` });
        // Refresh the list
        setTimeout(() => fetchUsers(), 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to revoke access' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke access. Please try again.' });
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="rounded-2xl p-6 border border-white/10" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-[#22C55E]/10 border border-[#22C55E]/50 text-[#22C55E]'
              : 'bg-red-500/10 border border-red-500/50 text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-sm">{message.text}</span>
        </motion.div>
      )}

      {/* Pending Invites */}
      <div
        className="rounded-2xl p-6 border border-amber-400/30"
        style={{
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6" style={{ color: '#EAB308' }} />
          <h2 className="text-2xl font-bold">Pending Invites</h2>
          <span className="px-3 py-1 rounded-full text-xs bg-amber-400/20 text-amber-400 border border-amber-400/30">
            {pendingInvites.length}
          </span>
        </div>

        {pendingInvites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Invited At</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite, index) => (
                  <motion.tr
                    key={invite.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{invite.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(invite.invitedAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleResendInvite(invite.email)}
                        disabled={resending === invite.email}
                        className="px-4 py-2 rounded-lg text-sm bg-amber-400/20 text-amber-400 border border-amber-400/30 hover:bg-amber-400/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`w-4 h-4 ${resending === invite.email ? 'animate-spin' : ''}`} />
                        {resending === invite.email ? 'Sending...' : 'Resend Invite'}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending invitations</p>
          </div>
        )}
      </div>

      {/* Active Team Roster */}
      <div
        className="rounded-2xl p-6 border border-[#22C55E]/30"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" style={{ color: '#22C55E' }} />
          <h2 className="text-2xl font-bold">Active Team Roster</h2>
          <span className="px-3 py-1 rounded-full text-xs bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
            {activeUsers.length}
          </span>
        </div>

        {activeUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Gauntlet Level</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Last Active</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((user, index) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const isActive = user.lastActive
                    ? new Date(user.lastActive).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Active if last active within 7 days
                    : false;

                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{user.name}</span>
                          {user.isAdmin && (
                            <Shield
                              className="w-4 h-4 text-amber-400"
                              style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))' }}
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-400">{user.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                            isActive
                              ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                          }`}
                        >
                          {isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">Level {user.gauntletLevel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {formatDate(user.lastActive)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isCurrentUser ? (
                          <span className="text-xs text-gray-500 italic">Current User</span>
                        ) : (
                          <button
                            onClick={() => handleRevokeAccess(user.id, user.name)}
                            disabled={revoking === user.id}
                            className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <UserX className="w-4 h-4" />
                            {revoking === user.id ? 'Revoking...' : 'Revoke Access'}
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active users</p>
          </div>
        )}
      </div>
    </div>
  );
}
