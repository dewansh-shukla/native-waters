"use client";

type MotionControlsProps = {
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
};

export function MotionControls({ paused, onPausedChange }: MotionControlsProps) {
  return (
    <button type="button" aria-pressed={paused} onClick={() => onPausedChange(!paused)}>
      {paused ? "Resume" : "Pause"}
    </button>
  );
}
