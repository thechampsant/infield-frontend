import { eligibleFollowUp, istDay } from "./presentation";
import type {
  FollowUpList,
  FollowUpQuery,
  FollowUpView,
  TeamOverviewApi,
  TeamScope,
  TeamSummary,
} from "./types";

export interface FollowUpContext {
  date?: string;
  scope: TeamScope;
  summary: TeamSummary | null;
  refreshing?: boolean;
  summaryError?: string;
}

export interface FollowUpState {
  contextKey: string;
  moduleKey: string | null;
  view: FollowUpView;
  draftSearch: string;
  search: string;
  page: number;
  status: "idle" | "loading" | "ready" | "error";
  data: FollowUpList | null;
  error: string | null;
}

const contextKey = (context: FollowUpContext) =>
  `${context.date ?? "month"}:${context.scope}`;

/** Lazy selected-card requests only. Submissions, summary fetching and navigation remain host-owned. */
export class TeamFollowUpStore {
  private context: FollowUpContext = { scope: "direct", summary: null };
  private state: FollowUpState = {
    contextKey: "month:direct",
    moduleKey: null,
    view: "listed",
    draftSearch: "",
    search: "",
    page: 1,
    status: "idle",
    data: null,
    error: null,
  };
  private listeners = new Set<() => void>();
  private request?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private version = 0;

  constructor(private readonly api: Pick<TeamOverviewApi, "getFollowUps">) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<FollowUpState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  cancel = () => {
    this.version++;
    this.request?.abort();
    clearTimeout(this.timer);
  };

  configure = (context: FollowUpContext) => {
    const changed =
      this.context.summary !== context.summary ||
      this.context.date !== context.date ||
      this.context.scope !== context.scope ||
      this.context.refreshing !== context.refreshing ||
      this.context.summaryError !== context.summaryError;
    this.context = context;
    if (!changed) return;
    const key = contextKey(context);
    this.cancel();
    this.update({
      contextKey: key,
      data: null,
      error: null,
      ...(key !== this.state.contextKey
        ? { page: 1, search: "", draftSearch: "", view: "listed" as const }
        : {}),
    });
    if (!context.date) {
      this.close();
      return;
    }
    if (!this.state.moduleKey) return;
    if (!this.summaryReady()) {
      this.update({ status: "loading" });
      return;
    }
    const card = context.summary?.modules.find(
      (c) => c.sectionKey === this.state.moduleKey,
    );
    if (!card || !eligibleFollowUp(card)) {
      this.close();
      return;
    }
    this.load();
  };

  private summaryReady() {
    const { date, scope, summary, refreshing, summaryError } = this.context;
    return (
      !!date &&
      !!summary &&
      !refreshing &&
      !summaryError &&
      summary.scope === scope &&
      istDay(summary.dateRange.start) === date &&
      istDay(summary.dateRange.end) === date
    );
  }

  select = (moduleKey: string, view: FollowUpView = "listed") => {
    if (!this.summaryReady()) return;
    const card = this.context.summary?.modules.find(
      (c) => c.sectionKey === moduleKey,
    );
    const block = card && eligibleFollowUp(card);
    if (
      !block ||
      (view === "listed" ? !block.listedCount : !block.unverifiedCount)
    )
      return;
    this.cancel();
    this.update({
      moduleKey,
      view,
      page: 1,
      search: "",
      draftSearch: "",
      data: null,
      error: null,
    });
    this.load();
  };

  close = () => {
    this.cancel();
    this.update({
      moduleKey: null,
      status: "idle",
      data: null,
      error: null,
      search: "",
      draftSearch: "",
      page: 1,
    });
  };
  retry = () => {
    this.cancel();
    this.load();
  };

  setSearch = (value: string) => {
    if (!this.state.moduleKey || !this.summaryReady()) return;
    this.cancel();
    const draftSearch = value.slice(0, 100);
    this.update({
      draftSearch,
      page: 1,
      status: "loading",
      data: null,
      error: null,
    });
    this.timer = setTimeout(() => {
      this.update({ search: draftSearch.trim() });
      this.load();
    }, 300);
  };

  changePage = (direction: "next" | "previous") => {
    const pagination = this.state.data?.pagination;
    if (
      this.state.status !== "ready" ||
      !pagination ||
      !(direction === "next" ? pagination.hasNextPage : pagination.hasPrevPage)
    )
      return;
    this.update({ page: this.state.page + (direction === "next" ? 1 : -1) });
    this.load();
  };

  private async load() {
    if (!this.state.moduleKey || !this.summaryReady()) return;
    const card = this.context.summary?.modules.find(
      (c) => c.sectionKey === this.state.moduleKey,
    );
    if (!card?.followUp || card.followUp.state === "unavailable") {
      this.update({ status: "idle", data: null });
      return;
    }
    this.request?.abort();
    const request = new AbortController(),
      version = ++this.version;
    this.request = request;
    const query: FollowUpQuery = {
      moduleKey: this.state.moduleKey,
      date: this.context.date!,
      scope: this.context.scope,
      view: this.state.view,
      search: this.state.search,
      page: this.state.page,
      limit: 20,
    };
    this.update({ status: "loading", data: null, error: null });
    try {
      const data = await this.api.getFollowUps(query, request.signal);
      if (version !== this.version || request.signal.aborted) return;
      this.update({ status: "ready", data });
    } catch (error) {
      if (version !== this.version || request.signal.aborted) return;
      this.update({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Unable to load follow-ups. Please retry.",
        data: null,
      });
    }
  }
}
