import { useState, useRef, useEffect } from 'react';

export default function RequesterChat({ messages, setMessages, setParsedData, setWave, setDonors }) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = { id: Date.now(), text: inputText, sender: "user" };
    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    setMessages((prev) => [...prev, { 
      id: Date.now() + 1, 
      text: "Analyzing request and finding the best donors in the database...", 
      sender: "bot" 
    }]);

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMsg.text })
      });

      if (!response.ok) throw new Error("Backend error");

      const data = await response.json();
      
      setParsedData(data.parsedData);
      setWave(data.wave);
      setDonors(data.donors);

      setMessages((prev) => [...prev, { 
        id: Date.now() + 2, 
        text: `Got it. Extracted details and contacting Wave ${data.wave} (${data.donors.length} high-ranked donors) near ${data.parsedData.hospital}...`, 
        sender: "bot" 
      }]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { 
        id: Date.now() + 2, 
        text: "Error connecting to the Al-Khidmat backend. Is the Node.js server running?", 
        sender: "bot" 
      }]);
    }
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
