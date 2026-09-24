import HabitLog from "../models/habitLog.js";
import Habit from "../models/habit.js";
import {
    last90Days,
    lastNDays,
    calcStreak,
    todayKey,
} from "../utils/dateHelpers.js";

export const markComplete = async (req, res) => {
    try {
        const { habitId, date } = req.body;

        const completeDate = date || todayKey();

        const habit = await Habit.findOne({
            _id: habitId,
            userId: req.user._id,
        });

        if (!habit) {
            return res.status(404).json({
                message: "Habit not found",
            });
        }

        const log = await HabitLog.findOneAndUpdate(
            {
                userId: req.user._id,
                habitId,
                completeDate,
            },
            {
                $setOnInsert: {
                    userId: req.user._id,
                    habitId,
                    completeDate,
                },
            },
            {
                upsert: true,
                new: true,
            }
        );

        res.status(200).json(log);
    } catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
};


export const unmarkComplete = async(req, res) =>{
    try{
        const {habitId, date} = req.body; 
        const completedDate = date || todayKey(); 
        await HabitLog.findByIdAndDelete({
            userId: req.user._id, 
            habitId, 
            completedDate, 
        }); 
        res.json({message: "Unmarked"}); 
    } catch(err){
        res.status(500).json({message: err.message}); 
    }
}; 


export const getToday = async(req, res) => {
    try{
        const logs = await HabitLog.find({
            userId: req.user._id, 
            completeDate: todayKey(), 
        }); 
        res.json(logs); 
    } catch(err){
        res.status(500).json({message: err.message}); 
    }
}; 

export const getRange = async (req, res) => {
    try{
        const {start, end} = req.query; 
        const logs = await HabitLog.find({
            userId: req.user._id, 
            completeDate: {$gte: start, $lte: end}, 
        }); 
        res.json(logs); 
    } catch(err){
        res.status(500).json({message: err.message}); 
    }
}; 



export const getHeatmap = async (req, res) => {
    try{
        const days = last90Days(); 
        const logs = await HabitLog.find({
            userId: req.user._id, 
            completeDate: {$gte: days[0], $lte: days[days.length - 1]}, 
        }); 
        const counts = {}; 
        for(const d of days) counts[d]= 0; 
        for(const l of days) counts[l.completeDate] = (counts[l.completeDate] || 0) + 1; 
        const data = days.map((d) => ({date: d, count: counts[d] || 0})); 
        res.json(data); 
    } catch(err){
        res.status(500).json({message: err.message}); 
    }
}; 
// Get statistics of a habit
export const getHabitStats = async (req, res) => {
    try {
        // 1. Find the habit
        const habit = await Habit.findOne({
            _id: req.params.habitId,
            userId: req.user._id,
        });

        // 2. If habit does not exist
        if (!habit) {
            return res.status(404).json({
                message: "Habit not found",
            });
        }

        // 3. Get all completion logs of this habit
        const logs = await HabitLog.find({
            userId: req.user._id,
            habitId: habit._id,
        }).sort({
            completedDate: -1,
        });

        // 4. Extract only dates
        const dateKeys = logs.map((l) => l.completedDate);

        // 5. Calculate current and longest streak
        const { current, longest } = calcStreak(dateKeys);

        // 6. Calculate completion rate since habit was created

        const createdKey = habit.createdAt
            .toISOString()
            .slice(0, 10);

        const today = todayKey();

        const start = new Date(createdKey);
        const end = new Date(today);

        const totalDays =
            Math.max(
                1,
                Math.round(
                    (end - start) /
                    (1000 * 60 * 60 * 24)
                )
            ) + 1;

        const completionRate = Math.round(
            (logs.length / totalDays) * 100
        );

        // 7. Monthly breakdown
        const monthly = {};

        for (const l of logs) {
            const m = l.completedDate.slice(0, 7);

            monthly[m] = (monthly[m] || 0) + 1;
        }

        // 8. Last 90 days
        const last90 = last90Days();

        const last90Set = new Set(dateKeys);

        const last90Completed = last90.filter((date) =>
            last90Set.has(date)
        ).length;

        // 9. Last 7 days
        const last7 = lastNDays(7);

        const last7Completed = last7.filter((date) =>
            last90Set.has(date)
        ).length;

        // 10. Send response
        res.status(200).json({
            habit: {
                id: habit._id,
                name: habit.name,
                category: habit.category,
                frequency: habit.frequency,
            },

            stats: {
                currentStreak: current,
                longestStreak: longest,
                totalCompletions: logs.length,
                totalDays,
                completionRate,
                last7Completed,
                last90Completed,
            },

            monthly,
        });

    } catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
};

export const getAllStats = async (req, res) => {
    try {
        // 1. Get all active habits of logged-in user
        const habits = await Habit.find({
            userId: req.user._id,
            isArchived: false,
        });

        // 2. Get last 30 days
        const days = lastNDays(30);

        // 3. Get completion logs of last 30 days
        const logs = await HabitLog.find({
            userId: req.user._id,
            completeDate: {
                $gte: days[0],
                $lte: days[days.length - 1],
            },
        });

        // 4. Calculate stats for every habit
        const perHabit = habits.map((h) => {

            // Get logs belonging to this particular habit
            const hLogs = logs.filter(
                (l) => String(l.habitId) === String(h._id)
            );

            // Extract dates and sort them
            const keys = hLogs
                .map((l) => l.completeDate)
                .sort()
                .reverse();

            // Calculate streak
            const { current, longest } = calcStreak(keys);

            return {
                habitId: h._id,
                name: h.name,
                icon: h.icon,
                color: h.color,
                category: h.category,

                completions30d: hLogs.length,

                currentStreak: current,
                longestStreak: longest,
            };
        });

        // 5. Send response
        res.status(200).json({
            perHabit,
            days,
        });

    } catch (err) {
        res.status(500).json({
            message: err.message,
        });
    }
};