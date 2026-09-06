import { useState, useEffect } from 'react';

export default function ChatView(chat, controller) {
    const [aiMessage, setAiMessage] = useState("");

    useEffect(() => {
        const handleUpdate = () => {
            setAiMessage(chat.message);
        }

        handleUpdate();

        const reactListener = {
            notify: handleUpdate
        };

        chat.registerListener(reactListener);

        return() => {
            chat.unregisterListener(reactListener);
        }
    }, [chat]);

    return (
      <div className="chatContainer">
            <div className="chatMic">
                <h3 style={{ margin: 0 }}>AI Assistant</h3>
                
                <button onClick={() => controller.startListening()}>
                    🎙️ Speak Order
                </button>
            </div>
            
            <div className="chatMessage">
                {aiMessage || "Click the microphone and start speaking..."}
            </div>
        </div>  
    );
}