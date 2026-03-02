import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    const { messages, editorState } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
    }

    const genAI = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    // Construct system prompt with tools/actions definition
    const systemPrompt = `
      You are an AI video editor assistant. You help users edit videos by generating actions to be executed by the video editor.
      
      The current editor state is:
      ${JSON.stringify({
        tracks: editorState.tracks.map((t: any) => ({
             id: t.id,
             type: t.type,
             clips: t.clips.map((c: any) => ({ id: c.id, name: c.name, start: c.startTime, duration: c.duration })) 
        })),
        assets: editorState.assets.map((a: any) => ({ id: a.id, name: a.name, type: a.type })),
        currentTime: editorState.currentTime
      }, null, 2)}

      Response format:
      You must respond with a JSON object containing a "message" (text response) and an "actions" array.
      
      Available Actions:
      - { "type": "split", "trackId": "track-id", "clipId": "clip-id", "time": number }
      - { "type": "add_clip", "assetId": "asset-id", "trackId": "track-id", "time": number } 
      - { "type": "brainrot" } (Applies split screen brainrot layout)
      - { "type": "add_text", "text": "Hello World", "time": number }

      Example Request: "Split the video at the current time"
      Example Response:
      {
         "message": "Splitting the clip at current cursor.",
         "actions": [ { "type": "split", "trackId": "track-1", "clipId": "clip-123", "time": 5.5 } ]
      }
    `;

    // Basic chat history construction
    const chatHistory = messages.map((m: any) => 
        m.role === 'user' ? `User: ${m.content}` : `AI: ${m.content}`
    ).join('\n');

    const fullPrompt = `${systemPrompt}\n\nChat History:\n${chatHistory}\n\nDo not include markdown formatting like \`\`\`json. Just raw JSON.`;

    const result = await genAI.models.generateContent({
      model: model,
      contents: fullPrompt,
    });
    const text = result.text || '';
    
    // Clean up if model adds markdown blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return NextResponse.json(JSON.parse(cleanText));

  } catch (error) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
