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
      <div style={{ 
            padding: "20px", 
            backgroundColor: "#f0f0f0", 
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <h3 style={{ margin: 0 }}>AI Assistant</h3>
                
                <button onClick={() => controller.startListening()}>
                    🎙️ Speak Order
                </button>
            </div>
            
            <div style={{ 
                minHeight: "60px", 
                padding: "15px", 
                backgroundColor: "#fff", 
                border: "1px solid #ccc",
                fontStyle: aiMessage ? "normal" : "italic",
                color: aiMessage ? "#000" : "#888"
            }}>
                {aiMessage || "Click the microphone and start speaking..."}
            </div>
        </div>  
    );
}