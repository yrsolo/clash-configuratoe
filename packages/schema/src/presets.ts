import type { RuleSetNode } from "./types";

export type PresetDefinition = {
  id: string;
  label: string;
  ruleSet: RuleSetNode["ruleSet"];
};

const buildRuleSet = (
  name: string,
  ruleSet: Omit<RuleSetNode["ruleSet"], "name" | "visibleSections" | "first">
): RuleSetNode["ruleSet"] => {
  const visibleSections = [
    ruleSet.domains.length > 0 ? "domains" : null,
    ruleSet.domainSuffixes.length > 0 ? "domainSuffixes" : null,
    ruleSet.domainKeywords.length > 0 ? "domainKeywords" : null,
    ruleSet.geosites.length > 0 ? "geosites" : null,
    ruleSet.geoips.length > 0 ? "geoips" : null,
    ruleSet.processNames.length > 0 ? "processNames" : null,
    ruleSet.ipCidrs.length > 0 ? "ipCidrs" : null,
    ruleSet.rawRules.length > 0 ? "rawRules" : null,
    ruleSet.match ? "match" : null
  ].filter(Boolean) as RuleSetNode["ruleSet"]["visibleSections"];

  return {
    name,
    visibleSections,
    first: false,
    ...ruleSet
  };
};

export const builtInPresets: PresetDefinition[] = [
  {
    id: "preset-telegram",
    label: "Telegram",
    ruleSet: buildRuleSet("Telegram", {
      domains: [
        "t.me",
        "telegram.me",
        "web.telegram.org",
        "desktop.telegram.org"
      ],
      domainSuffixes: [
        "telegram.org",
        "telegra.ph",
        "telesco.pe",
        "tx.me"
      ],
      domainKeywords: ["telegram", "telegra"],
      geosites: ["telegram"],
      geoips: ["telegram"],
      processNames: [
        "Telegram.exe",
        "telegram.exe",
        "telegram-desktop.exe",
        "Updater.exe",
        "org.telegram.messenger",
        "org.thunderdog.challegram"
      ],
      ipCidrs: [],
      rawRules: [
        "IP-ASN,62041",
        "IP-ASN,59930",
        "IP-ASN,44907",
        "IP-ASN,211157"
      ],
      match: false
    })
  },
  {
    id: "preset-youtube",
    label: "YouTube",
    ruleSet: buildRuleSet("YouTube", {
      domains: [
        "youtu.be",
        "youtubei.googleapis.com",
        "yt3.ggpht.com",
        "i.ytimg.com"
      ],
      domainSuffixes: [
        "youtube.com",
        "googlevideo.com",
        "youtube-nocookie.com",
        "ytimg.com",
        "ggpht.com",
        "ytimg.l.google.com"
      ],
      domainKeywords: [
        "youtube",
        "ytimg",
        "googlevideo",
        "youtubei"
      ],
      geosites: ["youtube"],
      geoips: [],
      processNames: [
        "YouTube.exe",
        "com.google.android.youtube",
        "YouTube Music.exe",
        "com.google.android.apps.youtube.music"
      ],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-meta",
    label: "Meta",
    ruleSet: buildRuleSet("Meta", {
      domains: [
        "facebook.com",
        "m.facebook.com",
        "mbasic.facebook.com",
        "instagram.com",
        "www.instagram.com",
        "threads.net"
      ],
      domainSuffixes: [
        "facebook.com",
        "facebook.net",
        "fbcdn.net",
        "fbsbx.com",
        "messenger.com",
        "instagram.com",
        "cdninstagram.com",
        "threads.net",
        "meta.com"
      ],
      domainKeywords: ["facebook", "instagram", "threads", "messenger"],
      geosites: ["facebook", "instagram"],
      geoips: ["facebook"],
      processNames: [
        "Facebook.exe",
        "Instagram.exe",
        "Messenger.exe",
        "com.facebook.katana",
        "com.facebook.orca",
        "com.instagram.android",
        "com.threadsapp"
      ],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-ai",
    label: "AI",
    ruleSet: buildRuleSet("AI", {
      domains: [
        "chatgpt.com",
        "gemini.google.com",
        "notebooklm.google.com",
        "claude.ai",
        "claude.com",
        "poe.com",
        "perplexity.ai",
        "copilot.microsoft.com"
      ],
      domainSuffixes: [
        "openai.com",
        "oaistatic.com",
        "oaiusercontent.com",
        "chatgpt.com",
        "claude.ai",
        "claude.com",
        "anthropic.com",
        "notebooklm.google.com",
        "generativelanguage.googleapis.com",
        "deepmind.google",
        "perplexity.ai",
        "poe.com",
        "cursor.sh",
        "cursor.com",
        "copilot.microsoft.com",
        "githubcopilot.com",
        "x.ai",
        "grok.com"
      ],
      domainKeywords: [
        "openai",
        "anthropic",
        "chatgpt",
        "claude",
        "gemini",
        "notebooklm",
        "perplexity",
        "copilot",
        "cursor",
        "grok"
      ],
      geosites: [],
      geoips: [],
      processNames: [
        "ChatGPT.exe",
        "Claude.exe",
        "Cursor.exe",
        "Code.exe",
        "Trae.exe",
        "com.openai.chatgpt",
        "com.anthropic.claude",
        "com.perplexity.app"
      ],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-russian-banks",
    label: "Russian Banks",
    ruleSet: buildRuleSet("Russian Banks", {
      domains: [
        "online.sberbank.ru",
        "alfabank.ru",
        "tbank.ru",
        "vtb.ru",
        "dom.gosuslugi.ru"
      ],
      domainSuffixes: [
        "sberbank.ru",
        "sberbank.com",
        "alfabank.ru",
        "tbank.ru",
        "tinkoff.ru",
        "vtb.ru",
        "gazprombank.ru",
        "raiffeisen.ru",
        "rsb.ru",
        "sovcombank.ru",
        "psbank.ru",
        "otpbank.ru",
        "banki.ru"
      ],
      domainKeywords: [
        "sber",
        "alfa",
        "tinkoff",
        "tbank",
        "vtb",
        "gazprombank",
        "bank"
      ],
      geosites: [],
      geoips: [],
      processNames: [
        "SberbankOnline.exe",
        "SberBank.exe",
        "TBank.exe",
        "Tinkoff.exe",
        "AlfaBank.exe",
        "VTB.exe",
        "ru.sberbankmobile",
        "ru.tinkoff.mb",
        "ru.alfabank.mobile.android",
        "ru.vtb24.mobilebanking.android"
      ],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-russian-services",
    label: "Russian Services",
    ruleSet: buildRuleSet("Russian Services", {
      domains: [
        "www.gosuslugi.ru",
        "www.avito.ru",
        "www.ozon.ru",
        "www.wildberries.ru",
        "rutube.ru",
        "vk.com",
        "ok.ru"
      ],
      domainSuffixes: [
        "gosuslugi.ru",
        "esia.gosuslugi.ru",
        "avito.ru",
        "ozon.ru",
        "ozonusercontent.com",
        "ozoncdn.ru",
        "wildberries.ru",
        "wb.ru",
        "wbx-content-v2.wbstatic.net",
        "wbstatic.net",
        "wbxst.ru",
        "rutube.ru",
        "vk.com",
        "vk.ru",
        "userapi.com",
        "mycdn.me",
        "ok.ru",
        "dzen.ru",
        "ya.ru",
        "yandex.ru",
        "yandex.net"
      ],
      domainKeywords: [
        "gosuslugi",
        "avito",
        "ozon",
        "wildberries",
        "wbpay",
        "rutube",
        "vk",
        "vkontakte",
        "mirpay",
        "mosmetro",
        "cppk",
        "russianpost",
        "pochta",
        "cdek",
        "dzen",
        "yandex"
      ],
      geosites: [],
      geoips: ["ru"],
      processNames: [
        "Avito.exe",
        "Ozon.exe",
        "Wildberries.exe",
        "MirPay.exe",
        "MetroMoscow.exe",
        "CPPK.exe",
        "RussianPost.exe",
        "CDEK.exe",
        "VK.exe",
        "Rutube.exe",
        "Yandex.exe",
        "ru.gosuslugi.pos",
        "ru.ozon.app.android",
        "com.wildberries.ru",
        "ru.nspk.mirpay",
        "ru.mosmetro.metro",
        "io.itforces.android.timetable",
        "com.octopod.russianpost.client.android",
        "com.vkontakte.android",
        "com.avito.android",
        "ru.rutube.app"
      ],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-torrents",
    label: "Torrents",
    ruleSet: buildRuleSet("Torrents", {
      domains: [],
      domainSuffixes: ["rutracker.org", "nnmclub.to"],
      domainKeywords: ["torrent", "tracker"],
      geosites: [],
      geoips: [],
      processNames: ["qbittorrent.exe", "uTorrent.exe", "Transmission.exe"],
      ipCidrs: [],
      rawRules: [],
      match: false
    })
  },
  {
    id: "preset-local-direct",
    label: "Local Direct",
    ruleSet: {
      ...buildRuleSet("Local Direct", {
        domains: [],
        domainSuffixes: ["local", "yandex.ru", "yandex.net"],
        domainKeywords: [],
        geosites: [],
        geoips: [],
        processNames: [],
        ipCidrs: ["127.0.0.0/8"],
        rawRules: [],
        match: false
      }),
      first: true
    }
  },
  {
    id: "preset-rest",
    label: "Rest Of World",
    ruleSet: buildRuleSet("Rest Of World", {
      domains: [],
      domainSuffixes: [],
      domainKeywords: [],
      geosites: [],
      geoips: [],
      processNames: [],
      ipCidrs: [],
      rawRules: [],
      match: true
    })
  }
];
