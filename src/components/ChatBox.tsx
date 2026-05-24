import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot } from 'lucide-react';

interface ChatBoxProps {
  onSendMessage: (msg: string) => Promise<string>;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Jöppli AI assistant online. How can I help with the fleet?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await onSendMessage(userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 w-14 h-14 bg-joppli-dark text-white rounded-[1rem] shadow-xl shadow-joppli-dark/20 flex items-center justify-center hover:bg-joppli-dark/90 transition-transform hover:scale-105 z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 right-6 w-80 bg-white border border-joppli-grey rounded-2xl shadow-xl shadow-joppli-dark/10 flex flex-col z-50 overflow-hidden h-[450px]">
      <div className="bg-joppli-dark text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-wide text-sm">Fleet AI</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-joppli-light">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm font-medium shadow-sm ${
              msg.role === 'user' 
                ? 'bg-joppli-blue text-white rounded-br-sm' 
                : 'bg-white border border-joppli-grey text-joppli-dark rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-joppli-grey rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1.5">
              <span className="w-1.5 h-1.5 bg-joppli-dark/30 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-joppli-dark/30 rounded-full animate-bounce delay-75" />
              <span className="w-1.5 h-1.5 bg-joppli-dark/30 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-joppli-grey bg-white flex gap-2 shrink-0">
        <input 
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 px-3 py-2 bg-joppli-light border border-joppli-grey rounded-xl text-sm font-medium text-joppli-dark placeholder:text-joppli-dark/40 focus:outline-none focus:ring-1 focus:ring-joppli-blue"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 bg-joppli-dark text-white rounded-xl flex items-center justify-center disabled:opacity-50 transition-all hover:bg-joppli-dark/90 shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
