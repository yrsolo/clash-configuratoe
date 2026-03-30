import type { RuleSetNode } from "./types";

export type PresetDefinition = {
  id: string;
  label: string;
  ruleSet: RuleSetNode["ruleSet"];
};

export const builtInPresets: PresetDefinition[] = [
  {
    id: "preset-ai",
    label: "AI Services",
    ruleSet: {
      name: "AI Services",
      visibleSections: ["domains", "domainSuffixes"],
      first: false,
      domains: ["gemini.google.com", "notebooklm.google.com"],
      domainSuffixes: ["openai.com", "chatgpt.com", "claude.ai", "claude.com"],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: [],
      rawRules: [],
      match: false
    }
  },
  {
    id: "preset-telegram",
    label: "Telegram",
    ruleSet: {
      name: "Telegram",
      visibleSections: ["domains", "domainSuffixes", "geosites", "geoips", "processNames"],
      first: false,
      domains: ["t.me"],
      domainSuffixes: ["telegram.org"],
      domainKeywords: [],
      geosites: ["telegram"],
      geoips: ["telegram"],
      processNames: ["Telegram.exe"],
      ipCidrs: [],
      rawRules: [],
      match: false
    }
  },
  {
    id: "preset-video",
    label: "Video",
    ruleSet: {
      name: "Video",
      visibleSections: ["domainSuffixes"],
      first: false,
      domains: [],
      domainSuffixes: ["youtube.com", "googlevideo.com", "instagram.com", "facebook.com"],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: [],
      rawRules: [],
      match: false
    }
  },
  {
    id: "preset-torrents",
    label: "Torrents",
    ruleSet: {
      name: "Torrents",
      visibleSections: ["domainSuffixes", "processNames"],
      first: false,
      domains: [],
      domainSuffixes: ["rutracker.org"],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: ["qbittorrent.exe", "uTorrent.exe"],
      ipCidrs: [],
      rawRules: [],
      match: false
    }
  },
  {
    id: "preset-local-direct",
    label: "Local Direct",
    ruleSet: {
      name: "Local Direct",
      visibleSections: ["domainSuffixes", "ipCidrs"],
      first: true,
      domains: [],
      domainSuffixes: ["local", "yandex.ru", "yandex.net"],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: ["127.0.0.0/8"],
      rawRules: [],
      match: false
    }
  },
  {
    id: "preset-rest",
    label: "Rest Of World",
    ruleSet: {
      name: "Rest Of World",
      visibleSections: ["match"],
      first: false,
      domains: [],
      domainSuffixes: [],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: [],
      rawRules: [],
      match: true
    }
  }
];
