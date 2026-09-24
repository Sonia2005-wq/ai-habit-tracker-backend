import Habit from "../models/habit.js";
import HabitLog from "../models/habitLog.js";
import AIInsight from "../models/AIInsight.js";

import {
    chatCompletion,
    SYSTEM_PROMPTS
} from "../utils/aiService.js";

import {
    calcStreak,
    lastNDays,
    todayKey
} from "../utils/dateHelpers.js";


// =====================================================
// BUILD WEEKLY CONTEXT
// =====================================================

const buildWeeklyContext = async (userId) => {

    // Get all active habits
    const habits = await Habit.find({
        userId,
        isArchived: false
    });

    // Get last 7 days
    const days = lastNDays(7);

    // Get logs from those 7 days
    const logs = await HabitLog.find({
        userId,
        completeDate: {
            $gte: days[0],
            $lte: days[days.length - 1]
        }
    });

    // Create summary for each habit
    const perHabit = habits.map((h) => {

        const completed = logs.filter(
            (l) =>
                String(l.habitId) === String(h._id)
        ).length;

        return {
            name: h.name,
            category: h.category,
            frequency: h.frequency,
            completedDays: completed,
            targetDays: h.targetDays
        };
    });

    return {
        days,
        perHabit
    };
};


// =====================================================
// WEEKLY REPORT
// =====================================================

export const weeklyReport = async (req, res) => {

    try {

        const ctx = await buildWeeklyContext(
            req.user._id
        );

        // No active habits
        if (!ctx.perHabit.length) {

            return res.json({
                content:
                    "You don't have any active habits yet. Create your first habit to start tracking — I'll generate a weekly report after that."
            });
        }


        // Create Gemini message
        const userMsg =
            `Here is the user's habit data for the past 7 days (${ctx.days[0]} to ${ctx.days[6]}):\n\n` +

            ctx.perHabit
                .map(
                    (h) =>
                        `- ${h.name} (${h.category}, ${h.frequency}): ` +
                        `completed ${h.completedDays} of the past 7 days, ` +
                        `target ${h.targetDays}`
                )
                .join("\n") +

            `\n\nPlease write the personalised weekly report now.`;


        // Ask Gemini
        const {
            content,
            ok
        } = await chatCompletion({
            system: SYSTEM_PROMPTS.weekly,
            user: userMsg
        });


        // Gemini failed
        if (!ok) {

            return res.status(500).json({
                message: content
            });
        }


        // Save report
        await AIInsight.create({
            userId: req.user._id,
            type: "weekly",
            content
        });


        // Send response
        res.json({
            content
        });

    } catch (err) {

        console.error("Weekly Report Error:", err);

        res.status(500).json({
            message: err.message
        });
    }
};


// =====================================================
// SUGGEST HABITS
// =====================================================

export const suggestHabits = async (req, res) => {

    try {

        const {
            goals,
            productiveTime,
            pastStruggles
        } = req.body;


        // Create Gemini message
        const userMsg =
            `User goals: ${goals || "not provided"}\n` +

            `Most productive time: ${
                productiveTime || "not provided"
            }\n` +

            `Past struggles: ${
                pastStruggles || "not provided"
            }`;


        // Ask Gemini
        const {
            content,
            ok
        } = await chatCompletion({
            system: SYSTEM_PROMPTS.suggestion,
            user: userMsg
        });


        // Gemini failed
        if (!ok) {

            return res.status(500).json({
                message: content
            });
        }


        let suggestions = [];


        // Convert Gemini response into JSON
        try {

            const parsed = JSON.parse(
                content
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim()
            );

            suggestions =
                parsed.suggestions ||
                parsed ||
                [];

        } catch {

            suggestions = [];
        }


        // Fallback suggestions
        if (!Array.isArray(suggestions) || !suggestions.length) {

            suggestions = [

                {
                    name: "10-minute morning walk",

                    description:
                        "Start the day with light movement and fresh air.",

                    category: "Fitness",

                    icon: "🚶",

                    reason:
                        "A simple way to build consistency early in the day."
                },

                {
                    name: "Read 5 pages",

                    description:
                        "Read a few pages every day to build a learning routine.",

                    category: "Learning",

                    icon: "📚",

                    reason:
                        "A small daily habit that is easy to maintain."
                },

                {
                    name: "2 minutes of mindful breathing",

                    description:
                        "Pause and breathe slowly for two minutes.",

                    category: "Mindfulness",

                    icon: "🧘",

                    reason:
                        "A small habit that can help create a calm daily reset."
                }
            ];
        }


        // Save suggestions
        await AIInsight.create({

            userId: req.user._id,

            type: "suggestion",

            content: JSON.stringify(suggestions),

            meta: {
                goals,
                productiveTime,
                struggles: pastStruggles
            }
        });


        // Send response
        res.json({
            suggestions
        });

    } catch (err) {

        console.error("Suggest Habits Error:", err);

        res.status(500).json({
            message: err.message
        });
    }
};


// =====================================================
// RECOVERY PLAN
// =====================================================

export const recoveryPlan = async (req, res) => {

    try {

        const { habitId } = req.body;


        // Find user's habit
        const habit = await Habit.findOne({
            _id: habitId,
            userId: req.user._id,
        });


        if (!habit) {

            return res.status(404).json({
                message: "Habit not found"
            });
        }


        // Get all logs for this habit
        const logs = await HabitLog.find({
            userId: req.user._id,
            habitId,
        }).sort({
            completeDate: -1
        });


        // Extract completion dates
        const keys = logs.map(
            (l) => l.completeDate
        );


        // Calculate streak
        const {
            current,
            longest
        } = calcStreak(keys);


        // Create Gemini message
        const userMsg = `
Habit: ${habit.name} (${habit.category}).

Description: ${habit.description || "none"}.

Current Streak: ${current} days.

Longest ever: ${longest} days.

The user just broke a streak.
Write a warm, actionable 3-day recovery plan.
`;


        // Ask Gemini
        const {
            content,
            ok
        } = await chatCompletion({
            system: SYSTEM_PROMPTS.recovery,
            user: userMsg,
        });


        // Gemini failed
        if (!ok) {

            return res.status(500).json({
                message: content
            });
        }


        // Save insight
        await AIInsight.create({

            userId: req.user._id,

            type: "recovery",

            content,

            meta: {
                habitId
            }
        });


        // Send response
        res.json({
            content
        });

    } catch (err) {

        console.error("Recovery Plan Error:", err);

        res.status(500).json({
            message: err.message
        });
    }
};


// =====================================================
// CHAT ANALYSIS
// =====================================================

export const chatAnalysis = async (req, res) => {

    try {

        // Get user's question
        const { question } = req.body;


        if (!question) {

            return res.status(400).json({
                message: "Question is required"
            });
        }


        // Get user's active habits
        const habits = await Habit.find({
            userId: req.user._id,
            isArchived: false,
        });


        // Get last 30 days
        const days = lastNDays(30);


        // Get logs
        const logs = await HabitLog.find({

            userId: req.user._id,

            completeDate: {
                $gte: days[0],
                $lte: days[days.length - 1]
            }
        });


        // Build context
        const context = habits.map((h) => {

            const hlogs = logs.filter(
                (l) =>
                    String(l.habitId) === String(h._id)
            );


            return {

                name: h.name,

                category: h.category,

                frequency: h.frequency,

                targetDays: h.targetDays,

                completedDays: hlogs.length,

                completedDates:
                    hlogs.map(
                        (l) => l.completeDate
                    )
            };
        });


        // Create Gemini message
        const userMsg =
            `User question: ${question}\n\n` +

            `Here is the user's habit data for the last 30 days:\n\n` +

            context
                .map(
                    (h) =>
                        `- ${h.name} (${h.category}, ${h.frequency}): ` +

                        `completed ${h.completedDays} times in the last 30 days, ` +

                        `target ${h.targetDays} days. ` +

                        `Completion dates: ${
                            h.completedDates.join(", ") || "none"
                        }`
                )
                .join("\n") +

            `\n\nAnswer the user's question using ONLY the habit data provided above.`;


        // Ask Gemini
        const {
            content,
            ok
        } = await chatCompletion({

            system: SYSTEM_PROMPTS.chat,

            user: userMsg,

        });


        // Gemini failed
        if (!ok) {

            return res.status(500).json({
                message: content
            });
        }


        // Save analysis
        await AIInsight.create({

            userId: req.user._id,

            type: "chat",

            content,

            meta: {
                question
            }
        });


        // Send response
        res.json({
            content
        });

    } catch (err) {

        console.error("Chat Analysis Error:", err);

        res.status(500).json({
            message: err.message
        });
    }
};


// =====================================================
// MORNING MOTIVATION
// =====================================================

export const morningMotivation = async (req, res) => {

    try {

        // Get active habits
        const habits = await Habit.find({

            userId: req.user._id,

            isArchived: false,

        });


        // No habits
        if (!habits.length) {

            return res.json({

                content:
                    "Good morning! Add your first habit today and let's get the momentum started.",

            });
        }


        // Get last 30 days
        const days = lastNDays(30);


        // Get logs
        const logs = await HabitLog.find({

            userId: req.user._id,

            completeDate: {

                $gte: days[0],

                $lte: days[days.length - 1]

            },

        });


        // Build habit streak context
        const ctx = habits

            .map((h) => {

                const hLogs = logs

                    .filter(
                        (l) =>
                            String(l.habitId) ===
                            String(h._id)
                    )

                    .map(
                        (l) =>
                            l.completeDate
                    )

                    .sort()

                    .reverse();


                const {
                    current
                } = calcStreak(hLogs);


                return `${h.name}: current streak ${current}`;

            })

            .join("\n");


        // Today's date
        const today = todayKey();


        // Today's completed habits
        const todayLogs = logs.filter(

            (l) =>
                l.completeDate === today

        );


        const done = todayLogs.length;

        const total = habits.length;


        // Create Gemini message
        const userMsg =
            `Today's habits and streaks:\n${ctx}\n\n` +

            `Done today: ${done}/${total}. ` +

            `Write the morning motivation message.`;


        // Ask Gemini
        const {
            content,
            ok
        } = await chatCompletion({

            system: SYSTEM_PROMPTS.morning,

            user: userMsg,

            temperature: 0.8,

        });


        // Gemini failed
        if (!ok) {

            return res.status(500).json({
                message: content
            });
        }


        // Save insight
        await AIInsight.create({

            userId: req.user._id,

            type: "morning",

            content,

        });


        // Send response
        res.json({

            content

        });

    } catch (err) {

        console.error(
            "Morning Motivation Error:",
            err
        );

        res.status(500).json({

            message: err.message

        });
    }
};