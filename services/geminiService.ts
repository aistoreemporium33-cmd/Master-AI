
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Message, QuizData } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

export class GeminiService {
  private modelName = 'gemini-3-pro-preview';
  private imageModelName = 'gemini-2.5-flash-image';
  private videoModelName = 'veo-3.1-fast-generate-preview';
  private ttsModelName = 'gemini-2.5-flash-preview-tts';

  /**
   * Always create a new GoogleGenAI instance right before making an API call.
   * This ensures we use the most current API key available from process.env.API_KEY.
   */
  private getAI() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key missing");
    }
    return new GoogleGenAI({ apiKey });
  }

  async generateSessionTitle(messages: Message[]): Promise<string> {
    const ai = this.getAI();
    const history = messages.slice(0, 5).map(m => m.content).join(" ");
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Basierend auf diesem Chatverlauf, erstelle einen kurzen, knackigen GTA-Missionsnamen (max 4 Wörter) auf Deutsch. Nur den Namen zurückgeben: ${history}`,
    });
    // Accessing text content via the .text property as per guidelines.
    return response.text?.trim() || "Unbekannte Mission";
  }

  async generateSpeech(text: string): Promise<void> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: this.ttsModelName,
      contents: `Sprich das mit deiner Maestro-Stimme (cool, autoritär): ${text}`,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Keine Audio-Daten empfangen.");
    }

    const audioData = this.decodeBase64(base64Audio);
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const buffer = await this.decodeAudioData(audioData, audioContext, 24000, 1);
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  }

  private decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private async decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async generateImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    // Using generateContent for nano banana series models (gemini-2.5-flash-image) as per instructions.
    const response = await ai.models.generateContent({
      model: this.imageModelName,
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      // Find the image part, do not assume it is the first part.
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Kein Bild generiert.");
  }

  async generateVideo(prompt: string, onProgress?: (msg: string) => void): Promise<string> {
    const ai = this.getAI();
    onProgress?.("Initiiere Render-Prozess... halt die Stellung, Boss.");
    
    let operation = await ai.models.generateVideos({
      model: this.videoModelName,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    const progressMessages = [
      "Die Frames werden gerendert... fast fertig.",
      "Verschlüsselung läuft... Geduld ist eine Tugend auf der Straße.",
      "Lade Video-Daten in den Safe... fast da.",
      "Finalisiere den Clip... mach dich bereit."
    ];
    let msgIndex = 0;

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      onProgress?.(progressMessages[msgIndex % progressMessages.length]);
      msgIndex++;
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video-Generierung fehlgeschlagen.");
    
    // Append API key when fetching from the download link as per guidelines.
    return `${downloadLink}&key=${process.env.API_KEY}`;
  }

  async generateQuiz(context: string, imageUrl?: string): Promise<QuizData> {
    const ai = this.getAI();
    
    let contents: any;
    
    if (imageUrl) {
      const base64Data = imageUrl.split(',')[1] || imageUrl;
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          { text: `Erstelle ein interaktives Quiz basierend auf folgendem Material: ${context}` }
        ]
      };
    } else {
      contents = `Erstelle ein interaktives Quiz basierend auf folgendem Material: ${context}`;
    }

    const response = await ai.models.generateContent({
      model: this.modelName,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + "\nGib das Quiz ausschließlich als JSON zurück.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Genau 4 Antwortmöglichkeiten."
                  },
                  correctIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    try {
      // response.text is a property, not a method.
      const jsonStr = response.text || "{}";
      return JSON.parse(jsonStr) as QuizData;
    } catch (e) {
      console.error("Failed to parse quiz JSON", e);
      throw new Error("Quiz konnte nicht erstellt werden.");
    }
  }

  async *sendMessageStream(messages: Message[], currentImageBase64?: string) {
    const ai = this.getAI();
    const chat = ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    const lastMessage = messages[messages.length - 1];
    let messageContent: any;
    
    if (currentImageBase64) {
      const base64Data = currentImageBase64.split(',')[1] || currentImageBase64;
      messageContent = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        },
        { text: lastMessage.content || "Beschreibe dieses Bild im Maestro-Stil." }
      ];
    } else {
      messageContent = lastMessage.content;
    }

    // `chat.sendMessageStream` only accepts the `message` parameter.
    const result = await chat.sendMessageStream({
      message: messageContent
    });

    for await (const chunk of result) {
      // Accessing text content via the .text property as per guidelines.
      const response = chunk as GenerateContentResponse;
      yield response.text || "";
    }
  }
}

export const geminiService = new GeminiService();
