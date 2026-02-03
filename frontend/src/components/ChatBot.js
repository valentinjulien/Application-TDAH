import React, { useState } from 'react';
import { useTasks } from '../hooks/useTasks';
import { callOpenRouter } from '../hooks/useAI';
import { addAiInteraction } from '../services/aiInteractions';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Bonjour ! Comment puis-je vous aider avec votre organisation ?' }
  ]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addTask } = useTasks();

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', text: input };
    setMessages([...messages, userMessage]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const prompt = `En tant qu'assistant TDAH, aide l'utilisateur avec : ${currentInput}. Si c'est une tâche, suggère de l'ajouter. Réponds utilement.`;
      const response = await callOpenRouter(prompt);
      const botMessage = { role: 'bot', text: response };
      setMessages(prev => [...prev, botMessage]);

      // Log the interaction
      await addAiInteraction(currentInput, response, 'chat');

      // Si la réponse contient "ajouter tâche", extraire et ajouter
      if (response.toLowerCase().includes('ajouter') && response.toLowerCase().includes('tâche')) {
        const taskText = currentInput; // Simplifié
        await addTask({ text: taskText, priority: 'pending', quadrant: null });
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Petit souci de connexion, on réessaie dans un instant...' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-accent text-dark p-4 rounded-full shadow-lg hover:bg-primary transition"
        >
          💬
        </button>
      ) : (
        <div className="bg-white border border-accent rounded-lg shadow-lg w-80 h-96 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-primary rounded-t-lg">
            <h3 className="font-bold text-dark">TDAH Bot</h3>
            <button onClick={() => setIsOpen(false)} className="text-dark">✕</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className={`p-2 rounded-lg ${msg.role === 'user' ? 'bg-secondary ml-8' : 'bg-accent mr-8'}`}>
                {msg.text}
              </div>
            ))}
            {loading && <div className="text-center">...</div>}
          </div>
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Tapez votre message..."
                className="flex-1 p-2 border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={sendMessage} className="bg-accent text-dark px-4 py-2 rounded-lg hover:bg-primary">Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;