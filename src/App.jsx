import { useState } from 'react';
import './App.css';
import RequesterChat from './components/RequesterChat';
import CoordinatorDashboard from './components/CoordinatorDashboard';
import DonorSimulator from './components/DonorSimulator';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to Al-Khidmat Blood Donor Matching. How can I help you today?", sender: "bot" }
  ]);
  
  const [parsedData, setParsedData] = useState({
    bloodGroup: "-",
    count: "-",
    location: "-",
    hospital: "-",
    urgency: "-"
  });

  const [wave, setWave] = useState(0);
  const [donors, setDonors] = useState([]);
  
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);

  const openSimulator = (donor) => {
    if (donor.status !== 'Pending') return;
    setSelectedDonor(donor);
    setIsSimulatorOpen(true);
  };

  return (
    <div className="layout-container">
      <RequesterChat 
        messages={messages} 
        setMessages={setMessages}
        setParsedData={setParsedData}
        setWave={setWave}
        setDonors={setDonors}
      />

      <CoordinatorDashboard 
        parsedData={parsedData}
        wave={wave}
        donors={donors}
        openSimulator={openSimulator}
      />

      {isSimulatorOpen && (
        <DonorSimulator 
          selectedDonor={selectedDonor}
          donors={donors}
          setDonors={setDonors}
          setMessages={setMessages}
          setIsSimulatorOpen={setIsSimulatorOpen}
        />
      )}
    </div>
  );
}

export default App;
