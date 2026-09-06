import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  Clock,
  Coins,
  Compass,
  MapPin,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { type ActivityResponseDto, getActivities } from "~/api";
import BorderedTile from "~/components/Tiles/BorderedTile";
import Tile from "~/components/Tiles/Tile";
import Button from "~/components/UI/Button";
import { useAuth } from "~/context/AuthContext";
import type { TokenParsed } from "~/types/TokenParsed";
import {
  computeStickyWrapped,
  type StickyWrappedStats,
} from "~/util/wrapped.util";

export default function StickyWrappedPage() {
  const { t } = useTranslation();
  const authService = useAuth();
  const [tokenParsed, setTokenParsed] = useState<TokenParsed | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityResponseDto[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<"story" | "summary">("story");

  useEffect(() => {
    const initAuth = async () => {
      const parsed = await authService.getTokenParsed();
      setTokenParsed(parsed);
    };
    initAuth();
  }, [authService]);

  useEffect(() => {
    if (!tokenParsed?.UserId) return;

    let cancelled = false;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await getActivities({
          query: {
            UserId: tokenParsed.UserId,
            IncludePast: true,
            IncludeFuture: true,
          },
        });
        if (!cancelled && response.data) {
          setActivities(response.data);
        }
      } catch (err) {
        console.error("Failed to load activities for Sticky Wrapped:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [tokenParsed?.UserId]);

  const stats: StickyWrappedStats = computeStickyWrapped(
    activities,
    tokenParsed?.UserId || "",
    selectedYear,
  );

  const TOTAL_SLIDES = 6;

  // Auto-advance story slides if not paused and in story mode
  useEffect(() => {
    if (viewMode !== "story" || isPaused || stats.totalActivities === 0) return;

    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev < TOTAL_SLIDES - 1 ? prev + 1 : prev));
    }, 6000);

    return () => clearTimeout(timer);
  }, [currentSlide, isPaused, viewMode, stats.totalActivities]);

  const handleNextSlide = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleReplay = () => {
    setCurrentSlide(0);
    setViewMode("story");
    setIsPaused(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--board-primary-light)" />
        <p className="text-slate-500 animate-pulse">{t("loading")}...</p>
      </div>
    );
  }

  const yearLabel =
    selectedYear === "all" ? t("all_time") : String(selectedYear);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-4 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-(--board-primary) to-(--board-primary-light) text-white shadow-md">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              {t("sticky_wrapped")}
              <span className="text-sm px-2 py-0.5 rounded-full bg-(--board-primary-light)/20 text-(--board-primary) font-bold">
                {yearLabel}
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              {t("sticky_wrapped_subtitle")}
            </p>
          </div>
        </div>

        {/* Year Selector & View Mode Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {stats.availableYears.length > 0 && (
            <select
              value={selectedYear}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedYear(val === "all" ? "all" : Number(val));
                setCurrentSlide(0);
              }}
              className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
            >
              <option value="all">{t("all_time")}</option>
              {stats.availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}

          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode("story")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === "story"
                  ? "bg-white text-(--board-primary) shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("story_mode")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("summary")}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === "summary"
                  ? "bg-white text-(--board-primary) shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("summary")}
            </button>
          </div>
        </div>
      </div>

      {stats.totalActivities === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 gap-4">
          <PartyPopper size={40} className="text-gray-400" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {t("wrapped_no_data")}
            </h2>
            <p className="text-sm text-gray-500 max-w-sm mt-1">
              {t("wrapped_no_data_subtitle")}
            </p>
          </div>
          <Button href="/activities" variant="primary" showArrow>
            {t("browse_activities")}
          </Button>
        </div>
      ) : viewMode === "story" ? (
        /* --- Story Mode --- */
        <div className="relative flex flex-col w-full bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden min-h-[460px] justify-between">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full mb-6">
            {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full bg-white transition-all duration-300 ${
                    idx < currentSlide
                      ? "w-full"
                      : idx === currentSlide
                        ? "w-full animate-pulse"
                        : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Slide Content */}
          <div className="my-auto flex flex-col items-center text-center max-w-lg mx-auto py-6">
            {currentSlide === 0 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                <span className="text-6xl animate-bounce">🎁</span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {t("sticky_wrapped")} {yearLabel}
                </h2>
                <p className="text-slate-300 text-sm sm:text-base">
                  {tokenParsed?.given_name
                    ? t("wrapped_welcome_name", { name: tokenParsed.given_name })
                    : t("wrapped_welcome")}
                </p>
                <span className="text-xs text-(--board-primary-light) font-semibold uppercase tracking-wider mt-2">
                  {t("swipe_or_click_to_begin")}
                </span>
              </div>
            )}

            {currentSlide === 1 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                <span className="text-5xl">🎉</span>
                <span className="text-6xl sm:text-7xl font-extrabold text-amber-400">
                  {stats.totalActivities}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t("wrapped_total_activities")}
                </h2>
                <p className="text-slate-300 text-sm">
                  {t("wrapped_activities_subtitle", {
                    count: stats.totalActivities,
                    year: yearLabel,
                  })}
                </p>
              </div>
            )}

            {currentSlide === 2 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                <span className="text-5xl">⏱️</span>
                <span className="text-6xl sm:text-7xl font-extrabold text-(--board-primary-light)">
                  {stats.totalHours}h
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t("wrapped_total_hours")}
                </h2>
                <p className="text-slate-300 text-sm">
                  {t("wrapped_hours_subtitle", { hours: stats.totalHours })}
                </p>
              </div>
            )}

            {currentSlide === 3 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500 w-full">
                <span className="text-5xl">📍</span>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t("wrapped_top_locations")}
                </h2>
                <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                  {stats.topLocations.map((loc, i) => (
                    <div
                      key={loc.location}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10"
                    >
                      <span className="font-semibold text-sm flex items-center gap-2 truncate">
                        <span className="text-amber-400 font-bold">#{i + 1}</span>
                        {loc.location}
                      </span>
                      <span className="text-xs text-slate-300 ml-2 shrink-0">
                        {loc.count}x
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentSlide === 4 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
                <span className="text-6xl">{stats.persona.badgeEmoji}</span>
                <span className="text-xs uppercase tracking-widest text-amber-300 font-bold">
                  {t("wrapped_persona")}
                </span>
                <h2 className="text-3xl sm:text-4xl font-black text-amber-400">
                  {t(stats.persona.titleKey)}
                </h2>
                <p className="text-slate-300 text-sm max-w-sm">
                  {t(stats.persona.descriptionKey)}
                </p>
              </div>
            )}

            {currentSlide === 5 && (
              <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500 w-full">
                <span className="text-5xl">✨</span>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {t("wrapped_recap_title")}
                </h2>
                <div className="grid grid-cols-2 gap-3 w-full max-w-md my-2">
                  <div className="p-3 rounded-xl bg-white/10 text-center">
                    <p className="text-2xl font-black text-amber-400">
                      {stats.totalActivities}
                    </p>
                    <p className="text-xs text-slate-300">
                      {t("wrapped_activities")}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 text-center">
                    <p className="text-2xl font-black text-(--board-primary-light)">
                      {stats.totalHours}h
                    </p>
                    <p className="text-xs text-slate-300">
                      {t("wrapped_hours")}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 text-center">
                    <p className="text-2xl font-black text-emerald-400">
                      {stats.freeActivitiesCount}
                    </p>
                    <p className="text-xs text-slate-300">{t("free")}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/10 text-center">
                    <p className="text-2xl font-black text-violet-400">
                      {stats.persona.badgeEmoji}
                    </p>
                    <p className="text-xs text-slate-300 truncate">
                      {t(stats.persona.titleKey)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleReplay}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw size={14} />
                    {t("replay")}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => setViewMode("summary")}
                    className="text-xs"
                  >
                    {t("view_all_stats")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between w-full pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handlePrevSlide}
              disabled={currentSlide === 0}
              className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label={t("prev_slide")}
            >
              <ArrowLeft size={20} />
            </button>

            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>

            <button
              type="button"
              onClick={handleNextSlide}
              disabled={currentSlide === TOTAL_SLIDES - 1}
              className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              aria-label={t("next_slide")}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      ) : (
        /* --- Summary Mode --- */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-in fade-in duration-300">
          {/* Persona Card */}
          <Tile className="md:col-span-3 bg-gradient-to-r from-(--board-primary) to-amber-500 text-white shadow-lg p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
              <div>
                <span className="text-xs uppercase tracking-widest text-white/80 font-bold">
                  {t("wrapped_persona")}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">
                  {stats.persona.badgeEmoji} {t(stats.persona.titleKey)}
                </h2>
                <p className="text-white/90 text-sm mt-1 max-w-xl">
                  {t(stats.persona.descriptionKey)}
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleReplay}
                className="text-xs flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw size={14} />
                {t("replay_story")}
              </Button>
            </div>
          </Tile>

          {/* Stat 1: Total Activities */}
          <BorderedTile
            icon={PartyPopper}
            title={t("wrapped_total_activities")}
            subtitle={t("wrapped_activities_joined")}
          >
            <span className="text-4xl font-extrabold text-(--board-primary)">
              {stats.totalActivities}
            </span>
          </BorderedTile>

          {/* Stat 2: Total Hours */}
          <BorderedTile
            icon={Clock}
            title={t("wrapped_total_hours")}
            subtitle={t("hours_together")}
          >
            <span className="text-4xl font-extrabold text-amber-500">
              {stats.totalHours}h
            </span>
          </BorderedTile>

          {/* Stat 3: Free vs Paid */}
          <BorderedTile
            icon={Coins}
            title={t("free_activities")}
            subtitle={t("free_vs_paid_subtitle")}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-emerald-500">
                {stats.freeActivitiesCount}
              </span>
              <span className="text-xs text-gray-400">
                / {stats.totalActivities} {t("activities").toLowerCase()}
              </span>
            </div>
          </BorderedTile>

          {/* Top Locations */}
          <div className="md:col-span-2">
            <BorderedTile
              icon={MapPin}
              title={t("wrapped_top_locations")}
              subtitle={t("favorite_spots")}
            >
              <div className="flex flex-col gap-2 mt-2">
                {stats.topLocations.map((loc, i) => (
                  <div
                    key={loc.location}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <span className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      <span className="font-bold text-amber-500">#{i + 1}</span>
                      {loc.location}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      {loc.count} {t("times")}
                    </span>
                  </div>
                ))}
              </div>
            </BorderedTile>
          </div>

          {/* First Activity */}
          {stats.firstActivity && (
            <BorderedTile
              icon={Calendar}
              title={t("first_activity_of_year")}
              subtitle={new Date(
                stats.firstActivity.dateTimeStart,
              ).toLocaleDateString()}
            >
              <div className="flex flex-col gap-1">
                <span className="font-bold text-gray-900 truncate">
                  {stats.firstActivity.name}
                </span>
                <NavLink
                  to={`/activities/${stats.firstActivity.id}`}
                  className="text-xs text-(--board-primary) hover:underline mt-1"
                >
                  {t("view_details")} →
                </NavLink>
              </div>
            </BorderedTile>
          )}

          {/* Answers & Highlights */}
          {stats.highlightAnswers.length > 0 && (
            <div className="md:col-span-3">
              <BorderedTile
                icon={Award}
                title={t("wrapped_answers_highlight")}
                subtitle={t("favorite_picks")}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                  {stats.highlightAnswers.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium truncate">
                        {item.question}
                      </p>
                      <p className="text-sm font-bold text-gray-800 mt-1 truncate">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </BorderedTile>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
