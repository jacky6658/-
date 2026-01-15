
import React, { useState } from 'react';
// Added LeadStatus to imports
import { Lead, Decision, RejectReason, AuditAction, UserProfile, LeadStatus } from '../types';
import { REJECT_REASON_OPTIONS } from '../constants';
import { updateLead } from '../services/leadService';

interface DecisionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userProfile: UserProfile; // 新增傳入當前使用者資訊
}

const DecisionModal: React.FC<DecisionModalProps> = ({ lead, isOpen, onClose, onSuccess, userProfile }) => {
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
        decision_by: userProfile.displayName, // 紀錄審核人姓名
        reject_reason: decision === Decision.REJECT ? rejectReason : undefined,
        review_note: reviewNote,
        // LeadStatus is now properly imported and used here
        status: decision === Decision.REJECT ? LeadStatus.REJECTED : (decision === Decision.ACCEPT ? LeadStatus.CONTACTED : lead.status)
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 border border-white/20">
        <h2 className="text-xl font-black text-slate-900 mb-6">審核案件: {lead.platform_id}</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">審核決定</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setDecision(Decision.ACCEPT)}
                className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${decision === Decision.ACCEPT ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-100 text-slate-400'}`}
              >
                ✅ 接受
              </button>
              <button 
                onClick={() => setDecision(Decision.REJECT)}
                className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${decision === Decision.REJECT ? 'bg-red-50 border-red-500 text-red-700' : 'bg-white border-slate-100 text-slate-400'}`}
              >
                ❌ 拒絕
              </button>
              <button 
                onClick={() => setDecision(Decision.PENDING)}
                className={`py-3 rounded-xl border-2 text-xs font-black transition-all ${decision === Decision.PENDING ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}
              >
                🟡 待問
              </button>
            </div>
          </div>

          {decision === Decision.REJECT && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">拒絕原因</label>
              <select 
                className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm font-bold bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value as RejectReason)}
              >
                {REJECT_REASON_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">審核備註</label>
            <textarea 
              rows={3}
              className="w-full border-2 border-slate-100 rounded-xl p-4 text-sm font-medium bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
              placeholder="輸入判斷理由..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-900">取消</button>
          <button 
            disabled={loading}
            onClick={handleSave}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-black disabled:opacity-50 shadow-xl shadow-slate-200"
          >
            {loading ? '儲存中...' : '提交審核'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;
