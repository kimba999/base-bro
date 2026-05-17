"use client";

import { motion } from "framer-motion";

type StreakVisualProps = {
  currentStreak: bigint;
};

function dayInCycle(streak: bigint): number {
  if (streak <= BigInt(0)) return 1;
  return Number((streak - BigInt(1)) % BigInt(7) + BigInt(1));
}

function cellState(day: number, streak: bigint): "completed" | "current" | "upcoming" {
  const pos = dayInCycle(streak);
  if (streak <= BigInt(0)) {
    return day === 1 ? "current" : "upcoming";
  }
  if (day < pos) return "completed";
  if (day === pos) return "current";
  return "upcoming";
}

export function StreakVisual({ currentStreak }: StreakVisualProps) {
  const days = [1, 2, 3, 4, 5, 6, 7] as const;
  const streakZero = currentStreak <= BigInt(0);

  return (
    <div className="mb-5 sm:mb-6">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">
        7-day $BAZA streak
      </p>
      <div className="flex justify-between gap-1 sm:gap-2">
        {days.map((day) => {
          const state = cellState(day, currentStreak);
          const isSeventh = day === 7;
          const isCompleted = state === "completed";
          const isCurrent = state === "current";
          const isUpcoming = state === "upcoming";
          const inviteFirstDay = streakZero && day === 1;

          const baseCircle =
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition sm:h-12 sm:w-12";

          let className = baseCircle;

          if (isUpcoming) {
            className +=
              " border-slate-600/50 bg-slate-800/40 text-slate-500 opacity-50";
          } else if (isCompleted) {
            if (isSeventh) {
              className +=
                " border-amber-400 bg-blue-600 text-white shadow-[0_0_12px_rgba(251,191,36,0.35)]";
            } else {
              className +=
                " border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/30";
            }
          } else if (isCurrent) {
            if (isSeventh) {
              className +=
                " border-amber-400 bg-slate-900/90 text-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.45)] animate-[streak-ring_1.6s_ease-in-out_infinite]";
            } else if (inviteFirstDay) {
              className +=
                " border-blue-400 bg-slate-900/90 text-blue-100 shadow-[0_0_22px_rgba(59,130,246,0.55)] ring-2 ring-blue-400/50 ring-offset-2 ring-offset-slate-900 animate-[streak-ring_1.3s_ease-in-out_infinite]";
            } else {
              className +=
                " border-blue-500 bg-slate-900/90 text-blue-100 animate-[streak-ring_1.4s_ease-in-out_infinite]";
            }
          }

          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <div className={className}>
                {isSeventh && (isCurrent || isCompleted) ? (
                  <motion.span
                    className="text-lg leading-none"
                    aria-hidden
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 20 }}
                  >
                    🎁
                  </motion.span>
                ) : null}
                {isCompleted && !isSeventh ? (
                  <motion.svg
                    key={`check-${day}-${currentStreak.toString()}`}
                    className="h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  >
                    <motion.path
                      d="M20 6L9 17l-5-5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </motion.svg>
                ) : null}
                {isCurrent && !isSeventh ? (
                  <span className="text-xs text-blue-200">{day}</span>
                ) : null}
                {isUpcoming ? (
                  <span className="text-xs text-slate-500">{day}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
