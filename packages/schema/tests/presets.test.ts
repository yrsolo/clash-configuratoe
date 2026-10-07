import { describe, expect, it } from "vitest";

import { builtInPresets } from "../src/presets";

describe("builtInPresets", () => {
  it("contains the expanded service preset catalog", () => {
    expect(builtInPresets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        "preset-telegram",
        "preset-youtube",
        "preset-meta",
        "preset-ai",
        "preset-russian-banks",
        "preset-russian-services",
        "preset-local-direct",
        "preset-rest"
      ])
    );
  });

  it("uses richer sections for major service presets", () => {
    const telegram = builtInPresets.find((preset) => preset.id === "preset-telegram");
    const youtube = builtInPresets.find((preset) => preset.id === "preset-youtube");
    const ai = builtInPresets.find((preset) => preset.id === "preset-ai");
    const russianBanks = builtInPresets.find((preset) => preset.id === "preset-russian-banks");
    const russianServices = builtInPresets.find((preset) => preset.id === "preset-russian-services");

    expect(telegram?.ruleSet.geosites.length).toBeGreaterThan(0);
    expect(telegram?.ruleSet.processNames.length).toBeGreaterThan(0);
    expect(youtube?.ruleSet.domainSuffixes).toEqual(
      expect.arrayContaining(["youtube.com", "googlevideo.com", "ytimg.com"])
    );
    expect(ai?.ruleSet.processNames.length).toBeGreaterThan(0);
    expect(russianBanks?.ruleSet.domainSuffixes).toEqual(
      expect.arrayContaining(["sberbank.ru", "alfabank.ru", "tbank.ru"])
    );
    expect(russianServices?.ruleSet.geosites).toEqual([]);
    expect(russianServices?.ruleSet.geoips).toEqual(expect.arrayContaining(["ru"]));
    expect(russianServices?.ruleSet.domainSuffixes).toEqual(
      expect.arrayContaining(["ozon.ru", "wildberries.ru", "wb.ru"])
    );
    expect(russianServices?.ruleSet.processNames).toEqual(
      expect.arrayContaining([
        "ru.ozon.app.android",
        "com.wildberries.ru",
        "ru.nspk.mirpay",
        "ru.mosmetro.metro",
        "io.itforces.android.timetable",
        "com.octopod.russianpost.client.android"
      ])
    );
  });
});
