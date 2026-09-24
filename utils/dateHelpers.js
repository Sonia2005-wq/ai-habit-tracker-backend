import {
    format,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    subDays,
} from "date-fns";

export const toDateKey = (date) => {
    return format(date, "yyyy-MM-dd");
};

export const todayKey = () => {
    return toDateKey(new Date());
};

export const last90Days = () => {
    const end = new Date();
    const start = subDays(end, 89);

    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const currentWeekKeys = () => {
    const now = new Date();

    const start = startOfWeek(now, {
        weekStartsOn: 1,
    });

    const end = endOfWeek(now, {
        weekStartsOn: 1,
    });

    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const lastNDays = (n) => {
    const end = new Date();
    const start = subDays(end, n - 1);

    return eachDayOfInterval({ start, end }).map(toDateKey);
};

export const calcStreak = (sortedDateKeys) => {
    if (!sortedDateKeys.length) {
        return {
            current: 0,
            longest: 0,
        };
    }

    const set = new Set(sortedDateKeys);

    const today = todayKey();

    const yesterday = toDateKey(
        subDays(new Date(), 1)
    );

    // -------------------------
    // CURRENT STREAK
    // -------------------------

    let current = 0;

    let cursor = new Date();

    if (!set.has(today) && !set.has(yesterday)) {
        current = 0;
    } else {
        // If today is not completed,
        // start checking from yesterday.
        if (!set.has(today)) {
            cursor = subDays(cursor, 1);
        }

        while (set.has(toDateKey(cursor))) {
            current += 1;
            cursor = subDays(cursor, 1);
        }
    }

    // -------------------------
    // LONGEST STREAK
    // -------------------------

    const sortedAsc = [...sortedDateKeys].sort();

    let longest = 0;
    let run = 0;
    let prev = null;

    for (const key of sortedAsc) {
        if (!prev) {
            run = 1;
        } else {
            const currentDate = new Date(key);
            const previousDate = new Date(prev);

            const diff = Math.round(
                (currentDate - previousDate) /
                (1000 * 60 * 60 * 24)
            );

            if (diff === 1) {
                run += 1;
            } else {
                run = 1;
            }
        }

        longest = Math.max(longest, run);

        prev = key;
    }

    return {
        current,
        longest,
    };
};