import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./api-client";
import {
  defaultMoodConfigForm,
  moodCheckerConfigService,
  moodConfigToForm,
  moodFormToInput,
  normalizeMoodConfiguration,
  validateMoodConfigForm,
} from "./mood-checker-config-service";

vi.mock("./api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);
const patch = vi.mocked(apiClient.patch);
const del = vi.mocked(apiClient.delete);

const rawConfig = {
  _id: "cfg1",
  projectId: "p1",
  name: "ISP Mood",
  applicableDesignations: ["d1"],
  question: "How are you feeling today?",
  options: [
    { key: "k2", label: "Neutral", emoji: "😐", order: 1 },
    { key: "k1", label: "Happy", emoji: "😊", order: 0 },
  ],
  comment: { enabled: true, mandatory: true, placeholder: "Tell us" },
  frequency: { type: "SELECT_DAYS", days: ["MON", "FRI", "BAD"], dates: [], everyNDays: 1 },
  enforcement: { mode: "HARD", trigger: "SCHEDULED_TIME", scheduledTime: "10:30" },
};

describe("normalizeMoodConfiguration", () => {
  it("maps the API document and sorts options by order", () => {
    const config = normalizeMoodConfiguration(rawConfig);

    expect(config.id).toBe("cfg1");
    expect(config.options).toEqual([
      { key: "k1", label: "Happy", emoji: "😊" },
      { key: "k2", label: "Neutral", emoji: "😐" },
    ]);
    expect(config.frequency.days).toEqual(["MON", "FRI"]);
    expect(config.enforcement).toEqual({ mode: "HARD", trigger: "SCHEDULED_TIME", scheduledTime: "10:30" });
  });

  it("falls back to defaults for missing sections", () => {
    const config = normalizeMoodConfiguration({ _id: "x", name: "Bare" });

    expect(config.frequency.type).toBe("DAILY");
    expect(config.enforcement).toEqual({ mode: "SOFT", trigger: "ON_APP_OPEN", scheduledTime: "09:00" });
    expect(config.comment.enabled).toBe(true);
  });
});

describe("moodFormToInput", () => {
  it("keeps option keys, trims text and omits the time unless the trigger is scheduled", () => {
    const form = moodConfigToForm(normalizeMoodConfiguration(rawConfig));
    form.name = "  ISP Mood  ";
    form.options.push({ label: " Tired ", emoji: "😴" });
    form.enforcement.trigger = "ON_APP_OPEN";

    const input = moodFormToInput(form);

    expect(input.name).toBe("ISP Mood");
    expect(input.options).toEqual([
      { key: "k1", label: "Happy", emoji: "😊" },
      { key: "k2", label: "Neutral", emoji: "😐" },
      { label: "Tired", emoji: "😴" },
    ]);
    expect(input.enforcement).toEqual({ mode: "HARD", trigger: "ON_APP_OPEN" });
  });

  it("never sends a mandatory comment when the comment field is off", () => {
    const form = defaultMoodConfigForm();
    form.comment = { enabled: false, mandatory: true, placeholder: "x" };

    expect(moodFormToInput(form).comment.mandatory).toBe(false);
  });

  it("sends the time for the scheduled trigger", () => {
    const form = defaultMoodConfigForm();
    form.enforcement = { mode: "SOFT", trigger: "SCHEDULED_TIME", scheduledTime: "18:15" };

    expect(moodFormToInput(form).enforcement).toEqual({ mode: "SOFT", trigger: "SCHEDULED_TIME", scheduledTime: "18:15" });
  });
});

describe("validateMoodConfigForm", () => {
  const valid = () => ({ ...defaultMoodConfigForm(), name: "Valid" });

  it("accepts the default form once named", () => {
    expect(validateMoodConfigForm(valid())).toEqual([]);
  });

  it("requires a name and a question", () => {
    expect(validateMoodConfigForm({ ...valid(), name: " ", question: "" })).toEqual([
      "Configuration name is required.",
      "Check-in question is required.",
    ]);
  });

  it("requires two options with unique labels", () => {
    const form = valid();
    expect(validateMoodConfigForm({ ...form, options: [form.options[0]] })).toContain("Minimum 2 mood options are required.");
    expect(
      validateMoodConfigForm({ ...form, options: [{ label: "Happy", emoji: "😊" }, { label: "happy", emoji: "😃" }] }),
    ).toContain("Mood option labels must be unique.");
  });

  it("checks frequency details for the chosen type", () => {
    const form = valid();
    expect(validateMoodConfigForm({ ...form, frequency: { ...form.frequency, type: "SELECT_DAYS", days: [] } })).toContain(
      "Select at least one day.",
    );
    expect(validateMoodConfigForm({ ...form, frequency: { ...form.frequency, type: "SELECT_DATES", dates: [] } })).toContain(
      "Select at least one date.",
    );
    expect(
      validateMoodConfigForm({ ...form, frequency: { ...form.frequency, type: "EVERY_N_DAYS", everyNDays: 31 } }),
    ).toHaveLength(1);
    expect(
      validateMoodConfigForm({ ...form, frequency: { ...form.frequency, type: "EVERY_N_DAYS", everyNDays: Number.NaN } }),
    ).toHaveLength(1);
  });

  it("requires a valid time for the scheduled trigger", () => {
    const form = valid();
    expect(
      validateMoodConfigForm({ ...form, enforcement: { ...form.enforcement, trigger: "SCHEDULED_TIME", scheduledTime: "" } }),
    ).toEqual(["Trigger time is required for the Scheduled Time trigger."]);
  });
});

describe("moodCheckerConfigService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists configurations for a project", async () => {
    get.mockResolvedValue([rawConfig]);

    const configs = await moodCheckerConfigService.list("p 1");

    expect(get).toHaveBeenCalledWith("/api/v1/mood-checker/configurations?projectId=p%201");
    expect(configs[0].name).toBe("ISP Mood");
  });

  it("creates, updates, clones and deletes with the project scope", async () => {
    post.mockResolvedValue(rawConfig);
    patch.mockResolvedValue(rawConfig);
    del.mockResolvedValue(undefined);
    const input = moodFormToInput({ ...defaultMoodConfigForm(), name: "New" });

    await moodCheckerConfigService.create({ ...input, projectId: "p1" });
    await moodCheckerConfigService.update("cfg1", "p1", input);
    await moodCheckerConfigService.clone("cfg1", "p1");
    await moodCheckerConfigService.remove("cfg1", "p1");

    expect(post).toHaveBeenNthCalledWith(1, "/api/v1/mood-checker/configurations", { ...input, projectId: "p1" });
    expect(patch).toHaveBeenCalledWith("/api/v1/mood-checker/configurations/cfg1?projectId=p1", input);
    expect(post).toHaveBeenNthCalledWith(2, "/api/v1/mood-checker/configurations/cfg1/clone?projectId=p1");
    expect(del).toHaveBeenCalledWith("/api/v1/mood-checker/configurations/cfg1?projectId=p1");
  });
});
