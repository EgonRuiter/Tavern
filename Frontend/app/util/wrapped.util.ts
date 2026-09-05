import type { ActivityResponseDto } from "~/api";

export interface WrappedHighlightAnswer {
  question: string;
  answer: string;
}

export interface StickyWrappedStats {
  year: number | "all";
  totalActivities: number;
  totalHours: number;
  topLocations: Array<{ location: string; count: number }>;
  topOrganizerIds: Array<{ organizerId: number; count: number }>;
  freeActivitiesCount: number;
  paidActivitiesCount: number;
  totalSpent: number;
  firstActivity: ActivityResponseDto | null;
  highlightAnswers: WrappedHighlightAnswer[];
  persona: {
    titleKey: string;
    descriptionKey: string;
    badgeEmoji: string;
  };
  availableYears: number[];
}

/**
 * Calculates Sticky Wrapped statistics for a given user and optional year filter.
 */
export function computeStickyWrapped(
  activities: ActivityResponseDto[],
  userId: string,
  selectedYear: number | "all" = "all",
): StickyWrappedStats {
  // Find all activities user was enrolled in (not on waiting list if possible, or all enrollments)
  const enrolled = activities.filter((activity) =>
    activity.enrollments?.some(
      (enrollment) =>
        enrollment.member?.id === userId && !enrollment.isOnWaitingList,
    ),
  );

  // Discover all available years
  const yearSet = new Set<number>();
  enrolled.forEach((act) => {
    if (act.dateTimeStart) {
      const yr = new Date(act.dateTimeStart).getFullYear();
      if (!isNaN(yr)) yearSet.add(yr);
    }
  });

  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  // Filter for selected year
  const filtered = enrolled.filter((act) => {
    if (selectedYear === "all") return true;
    if (!act.dateTimeStart) return false;
    return new Date(act.dateTimeStart).getFullYear() === selectedYear;
  });

  // Sort chronologically
  filtered.sort(
    (a, b) =>
      new Date(a.dateTimeStart).getTime() - new Date(b.dateTimeStart).getTime(),
  );

  // Compute total hours
  let totalHours = 0;
  let freeActivitiesCount = 0;
  let paidActivitiesCount = 0;
  let totalSpent = 0;
  const locationCounts: Record<string, number> = {};
  const organizerCounts: Record<number, number> = {};
  const highlightAnswers: WrappedHighlightAnswer[] = [];

  filtered.forEach((act) => {
    const start = new Date(act.dateTimeStart);
    const end = new Date(act.dateTimeEnd);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalHours += Math.min(diffHours, 24); // Cap single-day event at 24h
    }

    if (act.price == null || act.price === 0) {
      freeActivitiesCount++;
    } else {
      paidActivitiesCount++;
      totalSpent += act.price;
    }

    const loc = (act.location || "Sticky Room").trim();
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;

    if (act.organizerId) {
      organizerCounts[act.organizerId] =
        (organizerCounts[act.organizerId] || 0) + 1;
    }

    // Extract interesting answers from user enrollment questions
    const userEnrollment = act.enrollments?.find(
      (e) => e.member?.id === userId,
    );
    if (userEnrollment?.specificationAnswers) {
      userEnrollment.specificationAnswers.forEach((ans) => {
        if (ans.answer && ans.answer.trim()) {
          const q = act.specificationQuestions?.find(
            (q) => q.id === ans.questionId,
          );
          const questionText =
            q?.questionEnglish || q?.questionDutch || "Question";
          highlightAnswers.push({
            question: questionText,
            answer: ans.answer,
          });
        }
      });
    }
  });

  const topLocations = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const topOrganizerIds = Object.entries(organizerCounts)
    .map(([id, count]) => ({ organizerId: Number(id), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Determine Sticky Persona
  const total = filtered.length;
  let persona = {
    titleKey: "persona_curious_newcomer",
    descriptionKey: "persona_curious_newcomer_desc",
    badgeEmoji: "🌱",
  };

  if (total >= 10) {
    persona = {
      titleKey: "persona_sticky_legend",
      descriptionKey: "persona_sticky_legend_desc",
      badgeEmoji: "👑",
    };
  } else if (total >= 5) {
    persona = {
      titleKey: "persona_social_butterfly",
      descriptionKey: "persona_social_butterfly_desc",
      badgeEmoji: "🦋",
    };
  } else if (totalHours >= 20) {
    persona = {
      titleKey: "persona_endurance_champion",
      descriptionKey: "persona_endurance_champion_desc",
      badgeEmoji: "⚡",
    };
  } else if (total > 0) {
    persona = {
      titleKey: "persona_adventurer",
      descriptionKey: "persona_adventurer_desc",
      badgeEmoji: "🚀",
    };
  }

  return {
    year: selectedYear,
    totalActivities: total,
    totalHours: Math.round(totalHours),
    topLocations,
    topOrganizerIds,
    freeActivitiesCount,
    paidActivitiesCount,
    totalSpent: Math.round(totalSpent * 100) / 100,
    firstActivity: filtered[0] || null,
    highlightAnswers: highlightAnswers.slice(0, 5),
    persona,
    availableYears,
  };
}
