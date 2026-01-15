
import React, { useState } from 'react';
import { Lead, Decision, RejectReason, AuditAction } from '../types';
import { REJECT_REASON_OPTIONS } from '../constants';
import { updateLead } from '../services/leadService';

interface DecisionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DecisionModal: React.FC<DecisionModalProps> = ({ lead, isOpen, onClose, onSuccess }) => {
  const [decision, setDecision] = useState<Decision>(lead.decision || Decision.PENDING);
  const [rejectReason, setRejectReason] = useState<RejectReason>(lead.reject_reason || RejectReason.LOW_BUDGET);
  const [reviewNote, setReviewNote] = useState(lead.review_note || '');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateLead(lead.id, {
        decision,
        reject_reason: decision === Decision.REJECT ? rejectReason : undefined,
        review_note: reviewNote,
        // Automatically move status to "Rejected" if decision is reject
        status: decision === Decision.REJECT ? (lead.status === '拒絕' ? lead.status : '拒絕' as any) : lead.status
      }, AuditAction.DECISION);
      onSuccess();
      onClose();
    } catch (err) {
      alert('儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">審核案件: {lead.platform_id}</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">決定</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setDecision(Decision.ACCEPT)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium ${decision === Decision.ACCEPT ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                ✅ 接受
              </button>
              <button 
                onClick={() => setDecision(Decision.REJECT)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium ${decision === Decision.REJECT ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                ❌ 拒絕
              </button>
              <button 
                onClick={() => setDecision(Decision.PENDING)}
                className={`flex-1 py-2 rounded-md border text-sm font-medium ${decision === Decision.PENDING ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-gray-200 text-gray-600'}`}
              >
                🟡 待問
              </button>
            </div>
          </div>

          {decision === Decision.REJECT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">拒絕原因</label>
              <select 
                className="w-full border rounded-md p-2 text-sm"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value as RejectReason)}
              >
                {REJECT_REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">審核備註</label>
            <textarea 
              rows={3}
              className="w-full border rounded-md p-2 text-sm"
              placeholder="輸入判斷理由或筆記..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '儲存中...' : '提交審核'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;
