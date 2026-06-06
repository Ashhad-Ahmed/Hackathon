import { useState, useRef, useEffect } from 'react';

export default function RequesterChat({ messages, setMessages, setParsedData, setWave, setDonors }) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = { id: Date.now(), text: inputText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    
    // Simulate AI parsing
    setTimeout(() => {
      setParsedData({
        bloodGroup: "O+",
        count: "5",
        location: "Gulshan",
        hospital: "Indus Hospital",
        urgency: "High"
      });
      setWave(1);
      setDonors([
        { id: 101, name: "Ali Raza", status: "Pending", distance: "2 km", lastDonation: "4 months ago" },
        { id: 102, name: "Sara Ahmed", status: "Pending", distance: "3 km", lastDonation: "6 months ago" },
        { id: 103, name: "Omar Khan", status: "Pending", distance: "4 km", lastDonation: "5 months ago" },
        { id: 104, name: "Fatima Noor", status: "Pending", distance: "5 km", lastDonation: "3 months ago" },
        { id: 105, name: "Bilal Haider", status: "Pending", distance: "5.5 km", lastDonation: "7 months ago" },
      ]);
      setMessages((prev) => [...prev, { 
        id: Date.now() + 1, 
        text: "Got it. Extracting details and contacting the first wave of high-ranked donors near Indus Hospital...", 
        sender: "bot" 
      }]);
    }, 1000);

    setInputText("");
  };

  return (
    <div className="requester-pane">
      <div className="chat-header">
        <div className="avatar">AK</div>
        <div className="header-info">
          <h2>Al-Khidmat Blood Bot</h2>
          <p>Online</p>
        </div>
      </div>
      
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input 
          type="text" 
          placeholder="Type your request (e.g. need 5 O+ near Gulshan)..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="send-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </form>
    </div>
  );
}
