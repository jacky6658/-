
import React, { useState } from 'react';
import { Lead, LeadStatus, Role, AuditAction } from '../types';
import { STATUS_OPTIONS, STATUS_COLORS } from '../constants';
import Badge from './Badge';
import { updateLead } from '../services/leadService';

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  userRole: Role;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onSelectLead, userRole }) => {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDrop = async (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== status) {
      await updateLead(draggedLead.id, { status }, AuditAction.MOVE_STATUS);
    }
    setDraggedLead(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full scrollbar-hide">
      {STATUS_OPTIONS.map((status) => {
        const columnLeads = leads.filter(l => l.status === status);
        return (
          <div 
            key={status}
            className="flex-shrink-0 w-80 flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={`p-3 rounded-t-lg border-b-2 flex items-center justify-between bg-white shadow-sm border-indigo-100`}>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status].split(' ')[0].replace('bg-', 'bg-opacity-100 bg-')}`}></span>
                {status}
              </h3>
              <Badge className="bg-gray-100 text-gray-500">{columnLeads.length}</Badge>
            </div>
            
            <div className="flex-1 bg-gray-50 rounded-b-lg p-2 space-y-3 overflow-y-auto kanban-column scrollbar-hide">
              {columnLeads.map((lead) => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={() => handleDragStart(lead)}
                  onClick={() => onSelectLead(lead)}
                  className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="bg-indigo-50 text-indigo-600">{lead.platform}</Badge>
                    <span className="text-[10px] text-gray-400">{new Date(lead.posted_at || lead.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">{lead.need}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500">{lead.budget_text}</span>
                    <div className="flex gap-1">
                      {lead.decision !== 'pending' && (
                        <div className={`w-2 h-2 rounded-full ${lead.decision === 'accept' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      )}
                      <div className={`text-[10px] font-bold ${lead.priority > 3 ? 'text-red-500' : 'text-gray-400'}`}>P{lead.priority}</div>
                    </div>
                  </div>
                </div>
              ))}
              {columnLeads.length === 0 && (
                <div className="h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-400">尚無案件</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
