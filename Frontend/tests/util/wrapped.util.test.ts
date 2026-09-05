import { describe, expect, it } from "vitest";
import type { ActivityResponseDto } from "~/api";
import { computeStickyWrapped } from "~/util/wrapped.util";

function createActivity(
  overrides: Partial<ActivityResponseDto> = {},
): ActivityResponseDto {
  return {
    id: 1,
    name: "Sticky Event",
    dateTimeStart: "2026-03-15T10:00:00Z",
    dateTimeEnd: "2026-03-15T14:00:00Z",
    location: "Sticky Room",
    price: 0,
    organizerId: 42,
    enrollments: [
      {
        member: { id: "user-123", firstName: "Test", lastName: "User" } as any,
        isOnWaitingList: false,
      } as any,
    ],
    ...overrides,
  } as ActivityResponseDto;
}

describe("computeStickyWrapped", () => {
  it("returns default stats when activities list is empty", () => {
    const stats = computeStickyWrapped([], "user-123", "all");
    expect(stats.totalActivities).toBe(0);
    expect(stats.totalHours).toBe(0);
    expect(stats.freeActivitiesCount).toBe(0);
    expect(stats.paidActivitiesCount).toBe(0);
    expect(stats.totalSpent).toBe(0);
    expect(stats.persona.badgeEmoji).toBe("🌱");
    expect(stats.availableYears).toEqual([]);
    expect(stats.firstActivity).toBeNull();
  });

  it("filters out waiting list enrollments and ignores other users", () => {
    const activities: ActivityResponseDto[] = [
      createActivity({
        id: 1,
        enrollments: [
          {
            member: { id: "user-123" } as any,
            isOnWaitingList: true, // Should be ignored
          } as any,
        ],
      }),
      createActivity({
        id: 2,
        enrollments: [
          {
            member: { id: "other-user" } as any, // Should be ignored
            isOnWaitingList: false,
          } as any,
        ],
      }),
      createActivity({
        id: 3,
        dateTimeStart: "2026-05-10T12:00:00Z",
        dateTimeEnd: "2026-05-10T14:00:00Z",
        enrollments: [
          {
            member: { id: "user-123" } as any,
            isOnWaitingList: false, // Valid
          } as any,
        ],
      }),
    ];

    const stats = computeStickyWrapped(activities, "user-123", "all");
    expect(stats.totalActivities).toBe(1);
    expect(stats.totalHours).toBe(2);
  });

  it("calculates hours, spending, and top locations correctly", () => {
    const activities: ActivityResponseDto[] = [
      createActivity({
        id: 1,
        dateTimeStart: "2025-01-01T10:00:00Z",
        dateTimeEnd: "2025-01-01T14:00:00Z", // 4h
        location: "Sticky Room",
        price: 5.5,
        organizerId: 10,
      }),
      createActivity({
        id: 2,
        dateTimeStart: "2026-02-01T10:00:00Z",
        dateTimeEnd: "2026-02-01T13:00:00Z", // 3h
        location: "Sticky Room",
        price: 0,
        organizerId: 10,
      }),
      createActivity({
        id: 3,
        dateTimeStart: "2026-03-01T18:00:00Z",
        dateTimeEnd: "2026-03-01T21:00:00Z", // 3h
        location: "Bar",
        price: 10,
        organizerId: 20,
      }),
    ];

    const allStats = computeStickyWrapped(activities, "user-123", "all");
    expect(allStats.totalActivities).toBe(3);
    expect(allStats.totalHours).toBe(10);
    expect(allStats.freeActivitiesCount).toBe(1);
    expect(allStats.paidActivitiesCount).toBe(2);
    expect(allStats.totalSpent).toBe(15.5);
    expect(allStats.topLocations[0]).toEqual({
      location: "Sticky Room",
      count: 2,
    });
    expect(allStats.availableYears).toEqual([2026, 2025]);

    // Filtering by specific year
    const year2026Stats = computeStickyWrapped(activities, "user-123", 2026);
    expect(year2026Stats.totalActivities).toBe(2);
    expect(year2026Stats.totalHours).toBe(6);
    expect(year2026Stats.totalSpent).toBe(10);
  });

  it("assigns appropriate personas based on attendance criteria", () => {
    // 10 activities -> Sticky Legend
    const tenActivities = Array.from({ length: 10 }, (_, i) =>
      createActivity({ id: i + 1 }),
    );
    expect(
      computeStickyWrapped(tenActivities, "user-123").persona.titleKey,
    ).toBe("persona_sticky_legend");

    // 5 activities -> Social Butterfly
    const fiveActivities = Array.from({ length: 5 }, (_, i) =>
      createActivity({ id: i + 1 }),
    );
    expect(
      computeStickyWrapped(fiveActivities, "user-123").persona.titleKey,
    ).toBe("persona_social_butterfly");

    // 2 activities with 24 hours total -> Endurance Champion
    const longActivities = [
      createActivity({
        id: 1,
        dateTimeStart: "2026-01-01T00:00:00Z",
        dateTimeEnd: "2026-01-01T12:00:00Z",
      }),
      createActivity({
        id: 2,
        dateTimeStart: "2026-01-02T00:00:00Z",
        dateTimeEnd: "2026-01-02T12:00:00Z",
      }),
    ];
    expect(
      computeStickyWrapped(longActivities, "user-123").persona.titleKey,
    ).toBe("persona_endurance_champion");

    // 1 short activity -> Adventurer
    const oneActivity = [createActivity({ id: 1 })];
    expect(
      computeStickyWrapped(oneActivity, "user-123").persona.titleKey,
    ).toBe("persona_adventurer");
  });

  it("extracts custom answers correctly from enrollment questions", () => {
    const activity = createActivity({
      id: 1,
      specificationQuestions: [
        {
          id: 99,
          questionEnglish: "Favorite pizza?",
          questionDutch: "Favoriete pizza?",
          type: "String",
          isMandatory: false,
          isPublic: false,
        },
      ],
      enrollments: [
        {
          member: { id: "user-123" } as any,
          isOnWaitingList: false,
          specificationAnswers: [
            { questionId: 99, answerId: 1, answer: "Margherita" },
          ],
        } as any,
      ],
    });

    const stats = computeStickyWrapped([activity], "user-123");
    expect(stats.highlightAnswers).toHaveLength(1);
    expect(stats.highlightAnswers[0]).toEqual({
      question: "Favorite pizza?",
      answer: "Margherita",
    });
  });
});
