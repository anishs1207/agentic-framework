'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEditorStore } from '@/store/useEditorStore';

export default function ChatSidebar() {
    const [isOpen, setIsOpen] = useState(true);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: "Hi! I can help you edit videos. Try: 'Split this clip', 'Brainrot mode', or 'Add text overlay'." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const {
        splitClip,
        addClip,
        applyBrainrotLayout,
        tracks,
        assets,
        currentTime,
        selectedClipId,
        addTrack,
        setCurrentTime
    } = useEditorStore();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const executeActions = (actions: any[]) => {
        actions.forEach(action => {
            console.log("Executing Action:", action);
            switch (action.type) {
                case 'brainrot':
                    applyBrainrotLayout();
                    break;
                case 'split':
                    let targetClipId = action.clipId || selectedClipId;
                    let targetTrackId = action.trackId;
                    const time = action.time || currentTime;

                    if (!targetClipId) {
                        const activeClip = tracks
                            .flatMap(t => t.clips.map(c => ({ ...c, trackId: t.id })))
                            .find(c => time >= c.startTime && time < c.startTime + c.duration);
                        if (activeClip) {
                            targetClipId = activeClip.id;
                            targetTrackId = activeClip.trackId;
                        }
                    }

                    if (targetClipId && targetTrackId) {
                        splitClip(targetTrackId, targetClipId, time);
                    }
                    break;
                case 'add_text':
                    let textTrack = tracks.find(t => t.type === 'text');
                    if (!textTrack) {
                        addTrack('text');
                    }
                    console.log("Adding text:", action.text);
                    break;
            }
        });
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, { role: 'user', content: userMsg }],
                    editorState: { tracks, assets, currentTime }
                })
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'ai', content: data.message }]);

            if (data.actions) {
                executeActions(data.actions);
            }

        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', content: "Sorry, I had trouble processing that. Try again?" }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white fixed bottom-4 right-4 shadow-lg z-50"
            >
                <Sparkles size={18} />
            </Button>
        );
    }

    return (
        <div className="w-72 min-w-[280px] max-w-[320px] border-l border-border bg-card flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-border flex items-center justify-between shrink-0">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    AI Assistant
                </h2>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                    <X size={14} />
                </Button>
            </div>

            {/* Messages - Proper scroll container */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-3 space-y-3">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs shadow-sm ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-lg px-3 py-2">
                                    <Loader2 className="animate-spin w-3 h-3" />
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input - Fixed at bottom */}
            <div className="p-3 border-t border-border bg-card shrink-0">
                <div className="flex gap-2">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Ask AI..."
                        className="flex-1 h-8 text-xs"
                        disabled={isLoading}
                    />
                    <Button size="icon" className="h-8 w-8" onClick={sendMessage} disabled={isLoading}>
                        <Send size={12} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
