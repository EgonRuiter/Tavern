import { jsPDF } from "jspdf";

/**
 * Generates a PDF document in A3 format from an array of image URLs. Each image is added to a new page in the PDF,
 * and the resulting document is saved as "document-a3.pdf". The images are added with a "FAST" compression method for better performance.
 * @param images An array of image URLs to be included in the PDF document.
 * @returns A promise that resolves when the PDF has been generated and saved.
 */
export const generateA3Pdf = async (
  imageUrls: string[],
  token: string,
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a3",
  });

  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const response = await fetch(imageUrls[i], {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) continue;

      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      if (i > 0) {
        pdf.addPage("a3", "p");
      }

      pdf.addImage(base64Data, "JPEG", 0, 0, width, height, undefined, "FAST");
    } catch (error) {
      console.error(error);
    }
  }

  pdf.save("a3.pdf");
};

/**
 * Generates a printable participant checklist in A4 portrait format for bar/door duties.
 * Includes checkboxes, participant names, dietary answers, waiting list status, and notes.
 *
 * @param {ActivityResponseDto} activity - The activity whose participants to export.
 * @param {boolean} [isDutch=true] - Whether to format labels in Dutch or English.
 */
export const generateParticipantChecklistPdf = (
  activity: import("~/api").ActivityResponseDto,
  isDutch: boolean = true,
): void => {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = 18;

  const drawHeader = () => {
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(20, 20, 20);
    pdf.text(activity.name || (isDutch ? "Activiteit" : "Activity"), margin, y);

    y += 6;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(90, 90, 90);

    const startDate = activity.dateTimeStart
      ? new Date(activity.dateTimeStart)
      : null;
    const dateStr = startDate
      ? startDate.toLocaleDateString(isDutch ? "nl-NL" : "en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const locationStr = activity.location ? ` | ${activity.location}` : "";
    pdf.text(`${dateStr}${locationStr}`, margin, y);

    const confirmedCount = (activity.enrollments || []).filter(
      (e) => !e.isOnWaitingList,
    ).length;
    const waitingCount = (activity.enrollments || []).filter(
      (e) => e.isOnWaitingList,
    ).length;
    const countText = isDutch
      ? `Deelnemers: ${confirmedCount}${activity.participantLimit ? ` / ${activity.participantLimit}` : ""}${waitingCount > 0 ? ` (Wachtlijst: ${waitingCount})` : ""}`
      : `Participants: ${confirmedCount}${activity.participantLimit ? ` / ${activity.participantLimit}` : ""}${waitingCount > 0 ? ` (Waiting list: ${waitingCount})` : ""}`;

    y += 5;
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(50, 50, 50);
    pdf.text(countText, margin, y);

    y += 8;

    // Table Header
    pdf.setFillColor(245, 247, 250);
    pdf.rect(margin, y - 4, contentWidth, 7, "F");

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60);

    pdf.text("[  ]", margin + 2, y);
    pdf.text("#", margin + 11, y);
    pdf.text(isDutch ? "Naam" : "Name", margin + 20, y);
    pdf.text(isDutch ? "Dieet / Antwoorden" : "Diet / Answers", margin + 75, y);
    pdf.text("Status", margin + 135, y);
    pdf.text(
      isDutch ? "Handtekening / Notities" : "Signature / Notes",
      margin + 155,
      y,
    );

    y += 5;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, y - 2, margin + contentWidth, y - 2);
  };

  drawHeader();

  const sortedEnrollments = [...(activity.enrollments || [])].sort((a, b) => {
    if (a.isOnWaitingList !== b.isOnWaitingList) {
      return a.isOnWaitingList ? 1 : -1;
    }
    const nameA =
      `${a.member?.firstName || ""} ${a.member?.lastName || ""}`.toLowerCase();
    const nameB =
      `${b.member?.firstName || ""} ${b.member?.lastName || ""}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const rowHeight = 9;
  let pageNumber = 1;

  sortedEnrollments.forEach((enrollment, index) => {
    if (y + rowHeight > pageHeight - 18) {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(140, 140, 140);
      pdf.text(
        isDutch ? `Pagina ${pageNumber}` : `Page ${pageNumber}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" },
      );

      pdf.addPage("a4", "p");
      pageNumber++;
      y = 18;
      drawHeader();
    }

    const memberName = enrollment.member
      ? `${enrollment.member.firstName || ""} ${enrollment.member.lastName || ""}`.trim()
      : isDutch
        ? "Onbekend"
        : "Unknown";

    const answersText =
      (enrollment.specificationAnswers || [])
        .map((a) => a.answer)
        .filter(Boolean)
        .join(", ") || "-";

    const statusText = enrollment.isOnWaitingList
      ? isDutch
        ? "Wachtlijst"
        : "Waitlist"
      : isDutch
        ? "Deelnemer"
        : "Enrolled";

    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(40, 40, 40);

    // Empty checkbox square for pen checkoff
    pdf.setDrawColor(160, 160, 160);
    pdf.rect(margin + 2, y - 3.5, 4.5, 4.5);

    // Row number
    pdf.text(`${index + 1}`, margin + 11, y);

    // Name (truncated if long)
    const nameLines = pdf.splitTextToSize(memberName, 52);
    pdf.text(nameLines[0] || "", margin + 20, y);

    // Answers / Dietary
    const answerLines = pdf.splitTextToSize(answersText, 58);
    pdf.text(answerLines[0] || "", margin + 75, y);

    // Status
    if (enrollment.isOnWaitingList) {
      pdf.setTextColor(180, 83, 9);
    } else {
      pdf.setTextColor(22, 101, 52);
    }
    pdf.text(statusText, margin + 135, y);

    // Signature line
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin + 155, y + 0.5, margin + contentWidth - 2, y + 0.5);

    y += rowHeight;

    // Light row separator
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, y - 3, margin + contentWidth, y - 3);
  });

  // Footer for last page
  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(140, 140, 140);
  pdf.text(
    isDutch ? `Pagina ${pageNumber}` : `Page ${pageNumber}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" },
  );

  const cleanName = (activity.name || "activiteit")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-");
  pdf.save(`afvinklijst-${cleanName}.pdf`);
};
