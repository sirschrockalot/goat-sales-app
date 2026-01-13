'use client';

/**
 * Closing Table Widget
 * Real-time display of active deal closing status
 * Shows AI negotiator, deal profit, DocuSign progress, and call duration
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  DollarSign,
  User,
  CheckCircle,
  Circle,
  Loader,
  TrendingUp,
  Phone,
} from 'lucide-react';

export interface ClosingDeal {
  callId: string;
  negotiatorName: string;
  negotiatorId: string;
  propertyAddress?: string;
  dealProfit: number; // Expected spread ($8k - $15k+)
  documentStatus: 'sent' | 'delivered' | 'viewed' | 'completed';
  callStartTime: Date;
  envelopeId?: string;
  recipientEmail?: string;
}

interface ClosingTableProps {
  deal: ClosingDeal;
  onStatusUpdate?: (status: ClosingDeal['documentStatus']) => void;
}

export default function ClosingTable({ deal, onStatusUpdate }: ClosingTableProps) {
  const [callDuration, setCallDuration] = useState(0);
  const [currentStatus, setCurrentStatus] = useState(deal.documentStatus);

  // Calculate call duration in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - deal.callStartTime.getTime()) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [deal.callStartTime]);

  // Poll for status updates
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/calls/${deal.callId}/signature-status`);
        if (response.ok) {
          const data = await response.json();
          if (data.status && data.status !== currentStatus) {
            setCurrentStatus(data.status);
            if (onStatusUpdate) {
              onStatusUpdate(data.status);
            }
          }
        }
      } catch (error) {
        console.error('Error polling signature status:', error);
      }
    };

    // Poll every 5 seconds if not completed
    if (currentStatus !== 'completed') {
      const interval = setInterval(pollStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [deal.callId, currentStatus, onStatusUpdate]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProfitColor = (profit: number): string => {
    if (profit >= 15000) return 'text-green-400'; // Green Zone
    if (profit >= 8000) return 'text-yellow-400'; // Yellow Zone
    return 'text-red-400'; // Red Zone
  };

  const getProfitLabel = (profit: number): string => {
    if (profit >= 15000) return 'Apex Deal';
    if (profit >= 12000) return 'Strong Deal';
    if (profit >= 8000) return 'Volume Deal';
    return 'Low Margin';
  };

  const statusSteps = [
    { key: 'sent', label: 'Sent', icon: Circle },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    { key: 'viewed', label: 'Viewed', icon: CheckCircle },
    { key: 'completed', label: 'Signed', icon: CheckCircle },
  ];

  const currentStepIndex = statusSteps.findIndex((step) => step.key === currentStatus);

  return (
    <div className="glass-card rounded-2xl p-6 border-2 border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-amber-600/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center">
            <FileText className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Closing Table</h3>
            <p className="text-sm text-gray-400">Live Signature Monitor</p>
          </div>
        </div>
        {currentStatus !== 'completed' && (
          <div className="flex items-center gap-2 text-amber-400">
            <Loader className="w-4 h-4 animate-spin" />
            <span className="text-sm font-semibold">Active</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Current Negotiator */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase">Negotiator</span>
          </div>
          <p className="text-lg font-semibold text-white">{deal.negotiatorName}</p>
          <p className="text-xs text-gray-500">{deal.negotiatorId.substring(0, 8)}...</p>
        </div>

        {/* Deal Profit */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 uppercase">Deal Profit</span>
          </div>
          <p className={`text-lg font-bold ${getProfitColor(deal.dealProfit)}`}>
            ${deal.dealProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">{getProfitLabel(deal.dealProfit)}</p>
        </div>
      </div>

      {/* DocuSign Status Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">DocuSign Status</span>
          {currentStatus === 'completed' && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 text-green-400"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">COMPLETED</span>
            </motion.div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-2">
          {statusSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isCurrent
                      ? 'bg-amber-400 border-amber-400 text-black animate-pulse'
                      : 'bg-gray-800 border-gray-600 text-gray-500'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                <span
                  className={`text-xs mt-1 ${
                    isCompleted ? 'text-green-400' : isCurrent ? 'text-amber-400' : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 to-green-400"
            initial={{ width: 0 }}
            animate={{
              width: `${((currentStepIndex + 1) / statusSteps.length) * 100}%`,
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Call Duration */}
      <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-400 uppercase">Hand-Holding Duration</p>
            <p className="text-lg font-bold text-white">{formatDuration(callDuration)}</p>
          </div>
        </div>
        {currentStatus !== 'completed' && (
          <div className="flex items-center gap-2 text-amber-400">
            <Clock className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Live</span>
          </div>
        )}
      </div>

      {/* Property Address (if available) */}
      {deal.propertyAddress && (
        <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
          <p className="text-xs text-gray-400 uppercase mb-1">Property</p>
          <p className="text-sm text-white">{deal.propertyAddress}</p>
        </div>
      )}
    </div>
  );
}
