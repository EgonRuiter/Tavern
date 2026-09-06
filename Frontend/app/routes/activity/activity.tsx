import { t } from "i18next";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ActivityResponseDto } from "~/api";
import ActivityDetailsTile from "~/components/Activity/ActivityDetailsTile/ActivityDetailsTile";
import ActivityParticipantsTile from "~/components/Activity/ActivityParticipantsTile/ActivityParticipantsTile";
import Button from "~/components/UI/Button";
import { useConfirm } from "~/components/UI/ConfirmModal/useConfirm";
import { PageHeader } from "~/components/UI/PageHeader";
import toast from "react-hot-toast";
import { useAuth } from "~/context/AuthContext";
import type { TokenParsed } from "~/types/TokenParsed";
import { hasEnrollmentOpened } from "~/util/activity.util";
import { downloadActivityEnrollmentsCsv } from "~/util/activityCsv.util";
import { canEditActivity, isBoardOrCandidateBoard } from "~/util/group.util";
import type { Route } from "./+types/activity";
import {
  getActivityBackPath,
  handleDeleteActivity,
  handleEditActivityClick,
  loadActivityData,
} from "./activity.handlers";

/**
 * Detailed view for a specific activity, including description and participant lists.
 *
 * This page serves as the single source of truth for an activity's information.
 * It manages:
 * - **Data Hydration**: Fetches activity details based on the URL `id` parameter.
 * - **Enrollment Management**: Passes state-updating functions to child tiles
 *   to allow immediate UI feedback after joining/leaving.
 * - **Participant Visibility**: Filters and displays the participant list and
 *   waiting list, respecting the `areParticipantsVisible` privacy flag.
 * - **Contextual Navigation**: Determines the "Back" path based on whether
 *   the user arrived via an admin route or the standard member list.
 * - **Permissions**: Shows an edit action only for authorized users (Board or Organizers).
 *
 * @page
 * @component
 * @param {Route.LoaderArgs} props - Route parameters provided by the framework, including the activity ID.
 */
export default function ActivityPage({ params }: Route.LoaderArgs) {
  const authService = useAuth();
  const [confirmModal, confirm] = useConfirm();
  const [tokenParsed, setTokenParsed] = useState<TokenParsed | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const navigate = useNavigate();
  const { pathname } = window.location;
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityResponseDto | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const tokenParsed = await authService.getTokenParsed();
      setTokenParsed(tokenParsed);

      if (!tokenParsed) {
        console.error("User not authenticated");
        return;
      }
    };
    loadToken();
  }, [authService]);

  useEffect(() => {
    if (!tokenParsed) return;
    const activityId = Number(params.id);
    if (activity?.id === activityId) return;
    loadActivityData({
      activityId,
      setLoading,
      setActivity: (next) => setActivity(next),
    });
  }, [activity?.id, params.id, tokenParsed]);

  useEffect(() => {
    if (!tokenParsed || activity == null) {
      setCanEdit(false);
      return;
    }

    setCanEdit(canEditActivity(activity, tokenParsed));
  }, [activity, tokenParsed]);

  const isBoard = isBoardOrCandidateBoard(tokenParsed);

  if (loading || !tokenParsed) return t("loading");
  if (activity == null) return t("failed_fetching");

  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title={activity.name}
        backTo={getActivityBackPath(pathname)}
        action={
          activity &&
          (canEdit || isBoard) && (
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  onClick={() =>
                    handleEditActivityClick(navigate, pathname, activity.id)
                  }
                  variant="secondary"
                  className="flex items-center px-2"
                  aria-label={t("edit")}
                >
                  <PencilIcon size={18} />
                </Button>
              )}
              {isBoard && (
                <Button
                  onClick={() =>
                    handleDeleteActivity(
                      activity.id,
                      navigate,
                      pathname,
                      confirm,
                    )
                  }
                  variant="danger"
                  className="flex items-center px-2"
                  aria-label={t("delete_activity")}
                >
                  <Trash2Icon size={18} />
                </Button>
              )}
            </div>
          )
        }
      />

      <div className="space-y-6 w-full">
        <ActivityDetailsTile activity={activity} setActivity={setActivity} />
        {hasEnrollmentOpened(activity) && (activity.areParticipantsVisible || isBoard) && (
          <>
            <ActivityParticipantsTile
              enrollments={
                activity.enrollments.filter((e) => !e.isOnWaitingList) ?? []
              }
              isAdmin={isBoard}
              onExportCsv={
                canEdit || isBoard
                  ? () => {
                      downloadActivityEnrollmentsCsv(
                        activity,
                        (tokenParsed?.locale || "nl")
                          .toLowerCase()
                          .startsWith("nl"),
                      );
                      toast.success(t("csv_exported"));
                    }
                  : undefined
              }
            />
            <ActivityParticipantsTile
              title={t("waiting_list")}
              enrollments={
                activity.enrollments.filter((e) => e.isOnWaitingList) ?? []
              }
              isAdmin={isBoard}
            />
          </>
        )}
      </div>
      {confirmModal}
    </div>
  );
}
