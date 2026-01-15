
import React, { useState } from 'react';
import { Lead, UserProfile } from '../types';
import KanbanBoard from '../components/KanbanBoard';
import LeadModal from '../components/LeadModal';
import { updateLead } from '../services/leadService';

interface KanbanPageProps {
  leads: Lead[];
  userProfile: UserProfile;
}

const KanbanPage: React.FC<KanbanPageProps> = ({ leads, userProfile }) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleLeadUpdate = async (data: Partial<Lead>) => {
    if (selectedLead) {
      await updateLead(selectedLead.id, data);
      setSelectedLead(null);
    }
  };

  return (
    <div className="h-full">
      <KanbanBoard 
        leads={leads} 
        onSelectLead={setSelectedLead} 
        userRole={userProfile.role}
      />
      {selectedLead && (
        <LeadModal 
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onSubmit={handleLeadUpdate}
          initialData={selectedLead}
          userRole={userProfile.role}
        />
      )}
    </div>
  );
};

export default KanbanPage;
