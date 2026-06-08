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
    <motion.div className="mb-2 sm:mb-6">
      <p className="font-orbitron mb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-neon-cyan/70 sm:mb-2 sm:text-xs">
        7-day $BRO streak
      </p>
      <motion.div className="flex justify-between gap-0.5 sm:gap-2">
        {days.map((day) => {
          const state = cellState(day, currentStreak);
          const isSeventh = day === 7;
          const isCompleted = state === "completed";
          const isCurrent = state === "current";
          const isUpcoming = state === "upcoming";
          const inviteFirstDay = streakZero && day === 1;

          const baseCircle =
            "font-orbitron relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition sm:h-12 sm:w-12 sm:text-sm";

          let className = baseCircle;

          if (isUpcoming) {
            className +=
              " border-neon-magenta/30 bg-background/60 text-neon-cyan/40 opacity-50";
          } else if (isCompleted) {
            if (isSeventh) {
              className +=
                " border-neon-orange bg-neon-magenta/20 text-neon-orange shadow-[0_0_12px_rgba(255,69,0,0.45)]";
            } else {
              className +=
                " border-neon-magenta bg-neon-magenta/15 text-neon-cyan shadow-[0_0_10px_rgba(255,0,255,0.35)]";
            }
          } else if (isCurrent) {
            if (isSeventh) {
              className +=
                " border-neon-orange bg-background text-neon-orange shadow-[0_0_16px_rgba(255,69,0,0.5)] animate-[streak-ring_1.6s_ease-in-out_infinite]";
            } else if (inviteFirstDay) {
              className +=
                " border-neon-magenta bg-background text-neon-cyan shadow-[0_0_22px_rgba(255,0,255,0.55)] ring-2 ring-neon-magenta/50 ring-offset-2 ring-offset-background animate-[streak-ring_1.3s_ease-in-out_infinite]";
            } else {
              className +=
                " border-neon-magenta bg-background text-neon-cyan animate-[streak-ring_1.4s_ease-in-out_infinite]";
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
                    className="h-4 w-4 text-neon-cyan sm:h-5 sm:w-5"
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
                  <span className="text-xs text-neon-orange">{day}</span>
                ) : null}
                {isUpcoming ? (
                  <span className="text-xs text-neon-cyan/40">{day}</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
