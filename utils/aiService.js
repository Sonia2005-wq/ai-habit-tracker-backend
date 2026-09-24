import { GoogleGenerativeAI } from "@google/generative-ai";

let client = null;

// =====================================================
// GET GEMINI CLIENT
// =====================================================

const getClient = () => {
    if (client) return client;

    const key = process.env.GEMINI_API_KEY;

    if (!key) {
        return null;
    }

    client = new GoogleGenerativeAI(key);

    return client;
};


// =====================================================
// MODEL
// =====================================================

const MODEL =
    process.env.GEMINI_MODEL || "gemini-2.5-flash";


// =====================================================
// CHECK AI ENABLED
// =====================================================

export const isAIEnabled = () => {
    return !!process.env.GEMINI_API_KEY;
};


// =====================================================
// CHAT COMPLETION
// =====================================================

export const chatCompletion = async ({
    system,
    user,
    temperature = 0.7,
}) => {

    const c = getClient();

    // If API key is missing
    if (!c) {
        return {
            ok: false,
            content:
                "AI features are disabled. Please set GEMINI_API_KEY in the backend .env file.",
        };
    }

    try {

        const model = c.getGenerativeModel({
            model: MODEL,
            systemInstruction: system,
        });

        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: user,
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature,
            },
        });

        const response = result.response;

        const content = response.text().trim();

        return {
            ok: true,
            content,
        };

    } catch (err) {

        console.error("Gemini Error:", err);

        return {
            ok: false,
            content: err.message || "Gemini API request failed.",
        };
    }
};


// =====================================================
// SYSTEM PROMPTS
// =====================================================

export const SYSTEM_PROMPTS = {

    // ===================================================
    // WEEKLY REPORT
    // ===================================================

    weekly: `
You are a warm, encouraging habit coach.

Analyse the user's last 7 days of habit data and write a short personalized weekly summary.

Mention the user's actual habit names.

Use the provided data to identify:
- what went well
- what could be improved
- noticeable patterns

Be supportive and practical.

Give one concrete action the user can take next week.

Do not make up information that is not present in the provided habit data.

Use plain prose with line breaks.

Do not use markdown headers.

Keep the response between 50 and 220 words.
`,


    // ===================================================
    // HABIT SUGGESTIONS
    // ===================================================

    suggestion: `
You are a helpful habit coach.

Based on the user's goals, productive time, and past struggles, suggest exactly 3 realistic and actionable habits.

The habits should be specific to the user's situation rather than generic suggestions.

Return ONLY a valid JSON array.

Use exactly this structure:

[
  {
    "name": "...",
    "description": "...",
    "category": "Health|Fitness|Learning|Mindfulness|Productivity|Social|Finance|Creative|Other",
    "icon": "emoji",
    "reason": "..."
  }
]

Each habit must have:
- a clear and realistic name
- a short practical description
- one valid category from the provided list
- a suitable emoji icon
- a short reason explaining why the habit is useful

Do not add any text before or after the JSON.

No markdown.

No prose outside JSON.
`,


    // ===================================================
    // RECOVERY PLAN
    // ===================================================

    recovery: `
You are a compassionate habit recovery coach.

The user broke a streak.

Create a simple 3-day recovery plan tailored to the user's actual habit, recent performance, and struggles.

The plan should be realistic and should help the user restart without feeling overwhelmed.

For each of the 3 days, give one small, concrete action.

Be supportive and avoid guilt or judgment.

Focus on consistency and getting back on track.

Use the user's actual habit name when available.

Use plain prose with line breaks.
`,


    // ===================================================
    // CHAT ANALYSIS
    // ===================================================

    chat: `
You are a helpful habit analysis assistant.

Answer the user's question using ONLY the provided habit data as context.

Use the user's actual habit names, completion history, streaks, and other provided information when relevant.

Do not invent facts, habits, statistics, or personal information.

If the provided data is insufficient to answer the question, clearly say that the available data is insufficient.

Be concise, helpful, and natural.

Use plain prose with line breaks.
`,


    // ===================================================
    // MORNING MOTIVATION
    // ===================================================

    morning: `
You are a warm, motivating friend.

Write a single short morning message using the user's actual habit names and available habit data.

Make the message feel personal, encouraging, and natural rather than generic.

Mention a relevant habit or small action when possible.

Do not invent information about the user.

Do not use markdown headers.

Use plain prose with line breaks.

Write only one short morning message of 30-60 words.
`,
};