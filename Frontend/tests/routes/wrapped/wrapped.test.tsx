import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivities } from "~/api";
import StickyWrappedPage from "~/routes/wrapped/wrapped";
import { createMockAuthService, renderWithProviders } from "~/testUtils";
import type { TokenParsed } from "~/types/TokenParsed";

vi.mock("~/api", () => ({
  getActivities: vi.fn(),
}));

const mockToken: TokenParsed = {
  locale: "en",
  UserId: "user-abc-123" as TokenParsed["UserId"],
  access_level: "member",
  given_name: "Alice",
  family_name: "Smith",
  name: "Alice Smith",
};

describe("StickyWrappedPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading indicator initially while fetching activities", async () => {
    vi.mocked(getActivities).mockImplementation(
      () => new Promise(() => {}) as any,
    );

    const authService = createMockAuthService({
      getTokenParsed: vi.fn(async () => mockToken),
    });

    renderWithProviders(<StickyWrappedPage />, { authService });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows empty state when user has not participated in any activities", async () => {
    vi.mocked(getActivities).mockResolvedValue({
      data: [],
    } as any);

    const authService = createMockAuthService({
      getTokenParsed: vi.fn(async () => mockToken),
    });

    renderWithProviders(<StickyWrappedPage />, { authService });

    await waitFor(() => {
      expect(screen.getByText("wrapped_no_data")).toBeInTheDocument();
    });
    expect(screen.getByText("wrapped_no_data_subtitle")).toBeInTheDocument();
    expect(screen.getByText("browse_activities")).toBeInTheDocument();
  });

  it("renders story mode slides and navigates through them", async () => {
    const mockActivities = [
      {
        id: 1,
        name: "Game Night",
        dateTimeStart: "2026-03-01T18:00:00Z",
        dateTimeEnd: "2026-03-01T22:00:00Z",
        location: "Sticky Room",
        price: 0,
        enrollments: [
          {
            id: 10,
            member: { id: "user-abc-123" },
            isOnWaitingList: false,
          },
        ],
      },
      {
        id: 2,
        name: "Gala",
        dateTimeStart: "2026-04-10T20:00:00Z",
        dateTimeEnd: "2026-04-11T02:00:00Z",
        location: "City Hall",
        price: 25,
        enrollments: [
          {
            id: 11,
            member: { id: "user-abc-123" },
            isOnWaitingList: false,
          },
        ],
      },
    ];

    vi.mocked(getActivities).mockResolvedValue({
      data: mockActivities,
    } as any);

    const authService = createMockAuthService({
      getTokenParsed: vi.fn(async () => mockToken),
    });

    renderWithProviders(<StickyWrappedPage />, { authService });

    // Initial slide 0
    await waitFor(() => {
      expect(screen.getAllByText(/sticky_wrapped/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("wrapped_welcome_name")).toBeInTheDocument();

    // Navigate to slide 1
    const nextBtn = screen.getByRole("button", { name: "next_slide" });
    fireEvent.click(nextBtn);

    expect(screen.getByText("wrapped_total_activities")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Navigate to slide 2
    fireEvent.click(nextBtn);
    expect(screen.getByText("wrapped_total_hours")).toBeInTheDocument();

    // Switch to Summary Mode
    const summaryTab = screen.getByRole("button", { name: "summary" });
    fireEvent.click(summaryTab);

    // Verify summary tiles
    expect(screen.getByText("wrapped_persona")).toBeInTheDocument();
    expect(screen.getByText("favorite_spots")).toBeInTheDocument();
    expect(screen.getByText("free_activities")).toBeInTheDocument();

    // Click replay story
    const replayBtn = screen.getByRole("button", { name: "replay_story" });
    fireEvent.click(replayBtn);

    // Should return to slide 0 in story mode
    expect(screen.getByText("wrapped_welcome_name")).toBeInTheDocument();
  });
});
