export const HOUR_OPTIONS: string[] = Array.from({ length: 24 }, (_, index) =>
  index.toString().padStart(2, "0"),
);

export const MINUTE_OPTIONS: string[] = ["00", "15", "30", "45"];
export const DEFAULT_MINUTE = MINUTE_OPTIONS[0];

export const isValidHourValue = (candidate: string) => {
  if (!/^\d{2}$/.test(candidate)) return false;

  const hour = Number(candidate);
  return hour >= 0 && hour <= 23;
};

export const isValidTimeValue = (candidate: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(candidate);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = match[2];

  return hour >= 0 && hour <= 23 && MINUTE_OPTIONS.includes(minute);
};

export const parseTimeValue = (candidate: string) => {
  if (!isValidTimeValue(candidate)) {
    return { hour: null, minute: null };
  }

  const [hour, minute] = candidate.split(":");
  return { hour, minute };
};

export const buildTimeValue = (hour: string, minute: string) =>
  `${hour}:${minute}`;

export const resolveCommittedMinute = (
  selectedMinute: string | null,
  parsedMinute: string | null,
) => selectedMinute ?? parsedMinute ?? DEFAULT_MINUTE;

export const getNextTypedHourSelection = (
  currentBuffer: string,
  digit: string,
) => {
  if (!/^\d$/.test(digit)) {
    return { buffer: "", hour: null };
  }

  if (!currentBuffer) {
    return {
      buffer: digit,
      hour: digit.padStart(2, "0"),
    };
  }

  const nextCandidate = `${currentBuffer}${digit}`.slice(-2);
  if (isValidHourValue(nextCandidate)) {
    return {
      buffer: "",
      hour: nextCandidate,
    };
  }

  return {
    buffer: digit,
    hour: digit.padStart(2, "0"),
  };
};

export const getNextMinuteSelection = (
  currentMinute: string | null,
  direction: "up" | "down",
) => {
  const currentIndex = currentMinute
    ? MINUTE_OPTIONS.indexOf(currentMinute)
    : -1;

  if (currentIndex < 0) {
    return direction === "up"
      ? MINUTE_OPTIONS[MINUTE_OPTIONS.length - 1]
      : MINUTE_OPTIONS[0];
  }

  const delta = direction === "up" ? -1 : 1;
  const nextIndex =
    (currentIndex + delta + MINUTE_OPTIONS.length) % MINUTE_OPTIONS.length;

  return MINUTE_OPTIONS[nextIndex];
};
