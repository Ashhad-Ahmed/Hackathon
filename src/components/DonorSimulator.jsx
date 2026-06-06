import { useState } from 'react';

export default function DonorSimulator({ selectedDonor, donors, setDonors, setMessages, setIsSimulatorOpen }) {
  const [simulatorInput, setSimulatorInput] = useState("");

  if (!selectedDonor) return null;

  const handleSimulatorSubmit = (e) => {
    e.preventDefault();
    if (!simulatorInput.trim()) return;

    // Simple keyword based simulation
    let newStatus = "Pending";
    const inputLower = simulatorInput.toLowerCase();
    
    if (inputLower.includes("aa sakta") || inputLower.includes("yes") || inputLower.includes("sure")) {
      newStatus = "Confirmed";
    } else if (inputLower.includes("no") || inputLower.includes("nahi")) {
      newStatus = "Refused";
    } else if (inputLower.includes("last month") || inputLower.includes("recently")) {
      newStatus = "Ineligible";
    }

    setDonors(prev => prev.map(d => 
      d.id === selectedDonor.id ? { ...d, status: newStatus } : d
    ));

    // Update global chat if confirmed
    if (newStatus === "Confirmed") {
      const currentConfirmed = donors.filter(d => d.id !== selectedDonor.id && d.status === "Confirmed").length + 1;
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: `Update: ${selectedDonor.name} has confirmed! (${currentConfirmed} of 5 confirmed)`,
        sender: "bot"
      }]);
    }

    setIsSimulatorOpen(false);
  };

  return (
    <div className="modal-overlay" onClick={() => setIsSimulatorOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Simulate Reply: {selectedDonor.name}</h3>
          <button className="close-btn" onClick={() => setIsSimulatorOpen(false)}>✕</button>
        </div>
        <form onSubmit={handleSimulatorSubmit}>
          <p>Type a mock WhatsApp reply from this donor:</p>
          <textarea 
            autoFocus
            placeholder="e.g., 'kal subah aa sakta hoon' or 'I gave blood last month'"
            value={simulatorInput}
            onChange={e => setSimulatorInput(e.target.value)}
          />
          <div className="modal-actions">
            <button type="submit" className="primary-btn">Simulate Reply</button>
          </div>
        </form>
      </div>
    </div>
  );
}
