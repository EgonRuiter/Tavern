import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityResponseDto } from "~/api";

const {
  addImage,
  addPage,
  save,
  setFontSize,
  setFont,
  setTextColor,
  setFillColor,
  text,
  rect,
  line,
  setDrawColor,
  splitTextToSize,
  jsPDFCtor,
} = vi.hoisted(() => {
  const addImage = vi.fn();
  const addPage = vi.fn();
  const save = vi.fn();
  const setFontSize = vi.fn();
  const setFont = vi.fn();
  const setTextColor = vi.fn();
  const setFillColor = vi.fn();
  const text = vi.fn();
  const rect = vi.fn();
  const line = vi.fn();
  const setDrawColor = vi.fn();
  const splitTextToSize = vi.fn((str: string) => [str]);
  const getWidth = vi.fn(() => 210);
  const getHeight = vi.fn(() => 297);
  const jsPDFCtor = vi.fn(function MockJsPDF(this: unknown) {
    return {
      internal: { pageSize: { getWidth, getHeight } },
      addImage,
      addPage,
      save,
      setFontSize,
      setFont,
      setTextColor,
      setFillColor,
      text,
      rect,
      line,
      setDrawColor,
      splitTextToSize,
    };
  });
  return {
    addImage,
    addPage,
    save,
    setFontSize,
    setFont,
    setTextColor,
    setFillColor,
    text,
    rect,
    line,
    setDrawColor,
    splitTextToSize,
    jsPDFCtor,
  };
});

vi.mock("jspdf", () => ({ jsPDF: jsPDFCtor }));

describe("generateA3Pdf", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("fetches each image with the auth token and adds it as a page", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["fake"], { type: "image/jpeg" })),
    });

    const { generateA3Pdf } = await import("~/util/pdf.util");
    await generateA3Pdf(["https://img.example.com/1.jpg"], "test-token");

    expect(global.fetch).toHaveBeenCalledWith("https://img.example.com/1.jpg", {
      headers: { Authorization: "Bearer test-token" },
    });
    expect(addImage).toHaveBeenCalledTimes(1);
    expect(addImage.mock.calls[0][1]).toBe("JPEG");
    expect(save).toHaveBeenCalledWith("a3.pdf");
  });

  it("adds a new page for every image after the first", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["fake"], { type: "image/jpeg" })),
    });

    const { generateA3Pdf } = await import("~/util/pdf.util");
    await generateA3Pdf(
      ["https://img.example.com/1.jpg", "https://img.example.com/2.jpg"],
      "test-token",
    );

    expect(addImage).toHaveBeenCalledTimes(2);
    expect(addPage).toHaveBeenCalledTimes(1);
    expect(addPage).toHaveBeenCalledWith("a3", "p");
  });

  it("skips an image whose fetch response is not ok, without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const { generateA3Pdf } = await import("~/util/pdf.util");
    await generateA3Pdf(["https://img.example.com/missing.jpg"], "token");

    expect(addImage).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith("a3.pdf");
  });

  it("continues past a fetch rejection instead of failing the whole export", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { generateA3Pdf } = await import("~/util/pdf.util");
    await generateA3Pdf(["https://img.example.com/1.jpg"], "token");

    expect(addImage).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith("a3.pdf");
    consoleError.mockRestore();
  });
});

describe("generateParticipantChecklistPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockActivity: ActivityResponseDto = {
    id: 1,
    name: "Introductie Borrel 2026",
    price: 0,
    dutchDescription: "Gezellige borrel",
    englishDescription: "Fun drinks",
    dateTimeStart: "2026-09-10T20:00:00Z",
    dateTimeEnd: "2026-09-10T23:00:00Z",
    location: "Tavern Bar",
    participantLimit: 50,
    showInKoala: true,
    showOnWebsite: true,
    isEnrollable: true,
    areParticipantsVisible: true,
    isAdultOnly: false,
    isWeeklyDrinks: false,
    enrollments: [
      {
        isOnWaitingList: false,
        registeredOn: "2026-01-01T00:00:00Z",
        member: {
          id: "m1",
          firstName: "Jan",
          lastName: "Jansen",
          email: "jan@example.com",
        } as any,
        specificationAnswers: [{ answer: "Vegetarisch" }] as any,
        activity: {} as any,
      },
      {
        isOnWaitingList: true,
        registeredOn: "2026-01-01T00:00:00Z",
        member: {
          id: "m2",
          firstName: "Piet",
          lastName: "Pietersen",
          email: "piet@example.com",
        } as any,
        specificationAnswers: [],
        activity: {} as any,
      },
    ],
    specificationQuestions: [],
  };

  it("generates a participant checklist PDF in Dutch", async () => {
    const { generateParticipantChecklistPdf } = await import("~/util/pdf.util");
    generateParticipantChecklistPdf(mockActivity, true);

    expect(jsPDFCtor).toHaveBeenCalledWith({
      orientation: "p",
      unit: "mm",
      format: "a4",
    });
    expect(save).toHaveBeenCalledWith("afvinklijst-introductie-borrel-2026.pdf");
    expect(text).toHaveBeenCalledWith(
      "Introductie Borrel 2026",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("generates a participant checklist PDF in English", async () => {
    const { generateParticipantChecklistPdf } = await import("~/util/pdf.util");
    generateParticipantChecklistPdf(mockActivity, false);

    expect(save).toHaveBeenCalledWith("afvinklijst-introductie-borrel-2026.pdf");
    expect(text).toHaveBeenCalledWith(
      "Introductie Borrel 2026",
      expect.any(Number),
      expect.any(Number),
    );
  });

  it("handles activity without name and without enrollments", async () => {
    const { generateParticipantChecklistPdf } = await import("~/util/pdf.util");
    const emptyActivity = {
      ...mockActivity,
      name: "",
      enrollments: [],
    };
    generateParticipantChecklistPdf(emptyActivity, true);

    expect(save).toHaveBeenCalledWith("afvinklijst-activiteit.pdf");
  });
});
