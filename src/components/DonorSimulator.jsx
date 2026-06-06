import { useState } from 'react';

export default function DonorSimulator({ selectedDonor, donors, setDonors, setMessages, setIsSimulatorOpen }) {
  const [simulatorInput, setSimulatorInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!selectedDonor) return null;

  const handleSimulatorSubmit = async (e) => {
    e.preventDefault();
    if (!simulatorInput.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/donor-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: simulatorInput, donorName: selectedDonor.name })
      });

      if (!response.ok) throw new Error("Backend error");

      const data = await response.json();
      const newStatus = data.status;

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
    } catch (error) {
      console.error(error);
      alert("Error connecting to backend. Is it running?");
    } finally {
      setIsLoading(false);
      setIsSimulatorOpen(false);
    }
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
            disabled={isLoading}
          />
          <div className="modal-actions">
            <button type="submit" className="primary-btn" disabled={isLoading}>
              {isLoading ? 'Analyzing Intent...' : 'Simulate Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
