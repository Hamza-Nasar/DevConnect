// OpenAI client initialization
let openai: any = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    try {
      // Dynamic import to handle optional dependency
      const OpenAI = require("openai").default || require("openai");
      openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      console.warn("OpenAI package not available:", error);
      return null;
    }
  }
  return openai;
}

export async function summarizePost(content: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    if (!client) return "Summary unavailable - OpenAI not configured";
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that creates concise, engaging summaries of developer posts. Keep summaries under 150 characters.",
        },
        {
          role: "user",
          content: `Summarize this developer post: ${content}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "No summary available";
  } catch (error) {
    console.error("Error summarizing post:", error);
    return "Summary unavailable";
  }
}

export async function explainCode(code: string, language?: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    if (!client) return "Explanation unavailable - OpenAI not configured";
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful coding assistant that explains code clearly and concisely.",
        },
        {
          role: "user",
          content: `Explain this ${language || "code"} snippet:\n\`\`\`${language || ""}\n${code}\n\`\`\``,
        },
      ],
      max_tokens: 300,
      temperature: 0.5,
    });

    return response.choices[0]?.message?.content || "Explanation unavailable";
  } catch (error) {
    console.error("Error explaining code:", error);
    return "Explanation unavailable";
  }
}

export async function enhanceBio(bio: string): Promise<string> {
  try {
    const client = getOpenAIClient();
    if (!client) return bio;
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional bio writer. Enhance developer bios to be more engaging while keeping the original meaning. Keep it under 200 characters.",
        },
        {
          role: "user",
          content: `Enhance this developer bio: ${bio}`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || bio;
  } catch (error) {
    console.error("Error enhancing bio:", error);
    return bio;
  }
}

export async function suggestTags(content: string): Promise<string[]> {
  try {
    const client = getOpenAIClient();
    if (!client) return [];
    
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that suggests relevant technology tags for developer content. Return only a JSON array of tag strings, no other text.",
        },
        {
          role: "user",
          content: `Suggest 3-5 relevant technology tags for this content: ${content}`,
        },
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content || "[]";
    try {
      return JSON.parse(text);
    } catch {
      // Fallback: extract tags from text
      return text
        .replace(/[\[\]"]/g, "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch (error) {
    console.error("Error suggesting tags:", error);
    return [];
  }
}

