// ✅ crypto-js를 동적으로 불러오기 (Manifest V3 호환)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("libs/crypto-js.min.js"); // 로컬에서 로드
script.onload = () => {
  console.log("✅ crypto-js 로드 완료!");
};
document.head.appendChild(script);

let selectedKeyword = "";

// ✅ popup_default.js에서 구독 상태 요청
function fetchSubscriptionStatusFromBackground() {
  chrome.runtime.sendMessage(
    { action: "getSubscriptionStatus" },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("❌ 메시지 전송 오류:", chrome.runtime.lastError.message);
        return;
      }

      if (response.success) {
        const { email, isSubscribed } = response;

        // ✅ 저장
        chrome.storage.sync.set({ isSubscribed, userEmail: email });

        if (!isSubscribed) {
          chrome.storage.sync.get(["userEmail"], async (data) => {
            const email = data.userEmail;

            if (!email) {
              alert(chrome.i18n.getMessage("no_google_email"));
              return;
            }

            const encryptedEmail = await encryptEmail(email);
            const subscribeUrl = `https://paletteboxsubscribe.com?e=${encodeURIComponent(
              encryptedEmail
            )}`;

            // ✅ 새 탭으로 구독 페이지 열기
            window.open(subscribeUrl, "_blank");
          });
        }
      } else {
        console.warn("❌ 응답 실패:", response.error);
      }
    }
  );
}

// ✅ AES 암호화 함수
async function encryptEmail(email) {
  try {
    const res = await fetch(`https://palettebox.net/encrypt-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    return data.encrypted;
  } catch (err) {
    console.error("❌ 이메일 암호화 요청 실패:", err);
    return null;
  }
}

async function encryptSubId(subId) {
  try {
    const res = await fetch(`https://palettebox.net/encrypt-subscription-id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: subId }),
    });
    const data = await res.json();
    return data.encrypted;
  } catch (err) {
    console.error("❌ 구독 ID 암호화 요청 실패:", err);
    return null;
  }
}

// 오늘의 색상 추천 조합 관련 함수
function hslToRgb(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l; // 무채색
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function colorDistance([r1, g1, b1], [r2, g2, b2]) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function generateDistinctPalette(seed, count = 5, previousHexes = []) {
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = [];
  const prevRgb = previousHexes.map(hexToRgb);

  let i = 0;
  let attempts = 0;
  while (palette.length < count && attempts < 500) {
    const hue = (hash + i * 47 + Math.floor(Math.random() * 50)) % 360;
    const saturation = 50 + Math.floor(Math.random() * 40); // 50~90%
    const lightness = 40 + Math.floor(Math.random() * 20); // 40~60%
    const rgb = hslToRgb(hue, saturation, lightness);
    const hex = rgbToHex(rgb);

    // 다른 색들과 비교
    const isSimilar = [...palette, ...prevRgb].some((existing) => {
      const existingRgb =
        typeof existing === "string" ? hexToRgb(existing) : existing;
      return colorDistance(existingRgb, rgb) < 50;
    });

    if (!isSimilar) {
      palette.push(hex);
    }

    i++;
    attempts++;
  }

  return palette;
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");
  const bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function showTodayPalette() {
  const todayKey = new Date().toISOString().slice(0, 10);
  const randomSeed = new Date().toISOString(); // 매번 달라짐

  chrome.storage.local.get(
    ["suppressTodayBanner", "lastTodayColors", "todayColorCount"],
    (data) => {
      if (data.suppressTodayBanner === todayKey) return;

      const banner = document.getElementById("today-palette-banner");
      const container = document.getElementById("today-colors");

      const previousColors = data.lastTodayColors || [];
      const count = data.todayColorCount || 5; // 기본 5개
      const palette = generateDistinctPalette(
        randomSeed,
        count,
        previousColors
      );

      // 저장
      chrome.storage.local.set({ lastTodayColors: palette });

      container.innerHTML = "";
      palette.forEach((hex) => {
        const swatch = document.createElement("div");
        swatch.style.backgroundColor = hex;
        container.appendChild(swatch);
      });

      banner.classList.remove("hidden");

      document
        .getElementById("close-today-banner")
        .addEventListener("click", () => {
          const suppress = document.getElementById(
            "suppressTodayBanner"
          ).checked;
          if (suppress) {
            chrome.storage.local.set({ suppressTodayBanner: todayKey });
          }
          banner.classList.add("hidden");
        });
    }
  );
}

document.addEventListener("DOMContentLoaded", () => {
  loadPresets();
  fetchSubscriptionStatusFromBackground();
  showTodayPalette();
  document
    .getElementById("toggleEditMode")
    .addEventListener("click", toggleEditMode);

  const lang = chrome.i18n.getUILanguage();

  document.getElementById("app_name").textContent =
    chrome.i18n.getMessage("app_name");

  document.getElementById("new_preset").textContent =
    chrome.i18n.getMessage("new_preset");

  if (lang.startsWith("ja")) {
    document.getElementById("new_preset").style.fontSize = "17px";
  } else if (lang.startsWith("es")) {
    document.getElementById("new_preset").style.fontSize = "16px";
  }

  document.getElementById("saved_presets").textContent =
    chrome.i18n.getMessage("saved_presets");

  document.getElementById("create_new_preset").textContent =
    chrome.i18n.getMessage("create_new_preset");

  document.getElementById("savePreset").textContent = chrome.i18n.getMessage(
    "create_preset_button"
  );

  document.getElementById("import_from_code").textContent =
    chrome.i18n.getMessage("import_from_code");

  document.getElementById("importPresetName").placeholder =
    chrome.i18n.getMessage("enter_preset_name");

  document.getElementById("newPresetName").placeholder =
    chrome.i18n.getMessage("enter_preset_name");

  document.getElementById("encryptedCodeInput").placeholder =
    chrome.i18n.getMessage("enter_encrypted_code");

  document.getElementById("decodeAndSave").textContent =
    chrome.i18n.getMessage("import_code_button");

  document.getElementById("setting").textContent =
    chrome.i18n.getMessage("setting");

  document.getElementById("inqury_text").textContent =
    chrome.i18n.getMessage("inqury_text");

  document.getElementById("to_inqury_text").textContent =
    chrome.i18n.getMessage("to_inqury_text");

  document.getElementById("subscribeBtn").textContent =
    chrome.i18n.getMessage("subscribe_button");

  document.getElementById("unsubscribeBtn").textContent =
    chrome.i18n.getMessage("cancel_subscribe_button");

  document.getElementById("presetDetailTitle").textContent =
    chrome.i18n.getMessage("preset_detail");

  document.getElementById("toggleEditMode").textContent =
    chrome.i18n.getMessage("edit");

  document.getElementById("sendToCode").textContent =
    chrome.i18n.getMessage("export_code_button");

  document.getElementById("add_color_into_preset_title").textContent =
    chrome.i18n.getMessage("add_color_into_preset_title");

  document.getElementById("backToDetail").textContent =
    chrome.i18n.getMessage("back_to_detail");

  document.getElementById("addColorToPreset").textContent =
    chrome.i18n.getMessage("save_colors_to_preset");

  document.getElementById("newColorName").placeholder = chrome.i18n.getMessage(
    "enter_color_name_optional"
  );

  if (lang.startsWith("es")) {
    document.getElementById("toggleEditMode").style.fontSize = "11px";
    document.getElementById("sendToCode").style.fontSize = "11px";
    document.getElementById("addColorToPreset").style.fontSize = "11px";
  }

  document.getElementById("exportPresetBtn").textContent =
    chrome.i18n.getMessage("export_preset");

  document.getElementById("color-generate-title").textContent =
    chrome.i18n.getMessage("create_color_mixture");

  document.getElementById("color-generate-label").textContent =
    chrome.i18n.getMessage("create_mixture_method");

  document.getElementById("color-generate-preset-label").textContent =
    chrome.i18n.getMessage("select_reference_preset");

  document.getElementById("select-keyword-color").textContent =
    chrome.i18n.getMessage("keyword_mixture");

  document.getElementById("color-count-mixture").textContent =
    chrome.i18n.getMessage("color_count");

  document.getElementById("generate-palette-btn").textContent =
    chrome.i18n.getMessage("create_color_palette");

  document.getElementById("daily-palette-title").textContent =
    chrome.i18n.getMessage("daily_color_mixture");

  document.getElementById("today-save-btn").textContent =
    chrome.i18n.getMessage("save_daily_color");

  document.getElementById("dismiss-today").textContent =
    chrome.i18n.getMessage("dismiss_today");

  document.querySelectorAll("option[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const message = chrome.i18n.getMessage(key);
    if (message) {
      el.label = message;
      el.textContent = message;
      el.innerHTML = message;
    }
  });

  function updateSubscriptionUI() {
    chrome.storage.sync.get(["isSubscribed"], (data) => {
      const unsubscribeBtn = document.getElementById("unsubscribeBtn");

      unsubscribeBtn.classList.remove("hidden");
    });
  }

  // 색상 조합 키워드 옵션 선택 관련
  const generationMethodSelect = document.getElementById("generation-method");
  const keywordOptionContainer = document.getElementById(
    "keyword-option-container"
  );
  const presetOptionContainer = document.getElementById(
    "preset-option-container"
  );

  const uiOptionContainer = document.getElementById("color-picker-container");
  const presetOptionSelect = document.getElementById("preset-option");

  generationMethodSelect.addEventListener("change", () => {
    const selected = generationMethodSelect.value;

    if (selected === "keyword") {
      keywordOptionContainer.classList.remove("hidden");
    } else {
      keywordOptionContainer.classList.add("hidden");
    }

    if (selected === "ui") {
      uiOptionContainer.classList.remove("hidden");
    } else {
      uiOptionContainer.classList.add("hidden");
    }

    // 프리셋 옵션 처리
    if (selected === "preset") {
      presetOptionContainer.classList.remove("hidden");
      loadPresetOptions();
    } else {
      presetOptionContainer.classList.add("hidden");
    }
  });

  // ✅ settings 화면이 열릴 때 저장된 값 불러오기
  chrome.storage.local.get(["todayColorCount"], (data) => {
    const count = data.todayColorCount || 5;
    document.getElementById("todayColorCount").value = count;
  });

  function loadPresetOptions() {
    chrome.storage.sync.get("colorPresets", (data) => {
      const presets = data.colorPresets || [];

      presetOptionSelect.innerHTML = `<option value="">프리셋을 선택하세요</option>`;

      presets.forEach((preset, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = preset.name || `프리셋 ${index + 1}`;
        presetOptionSelect.appendChild(option);
      });

      presetOptionSelect.addEventListener("change", () => {
        const selectedValue = presetOptionSelect.value;
        selectedPresetIndex =
          selectedValue === "" ? null : parseInt(selectedValue, 10);
      });
    });
  }

  const keywordSelect = document.getElementById("keyword-option");

  keywordSelect.addEventListener("change", () => {
    selectedKeyword = keywordSelect.value;
  });

  // ui 디자인 색상 추천 조합용 기준 색상 선택 ui 관련 로직

  const colorWheelCanvas = document.getElementById("colorWheelCanvas");

  // 색상 선택시에만 마우스 커서가 변하도록 하는 로직
  colorWheelCanvas.addEventListener("mouseenter", () => {
    colorWheelCanvas.style.cursor =
      "url('./images/cursor_custom.png') 0 0, auto";
  });

  colorWheelCanvas.addEventListener("mouseleave", () => {
    colorWheelCanvas.style.cursor = "default";
  });
  const ctx = colorWheelCanvas.getContext("2d");
  const brightnessSlider = document.getElementById("brightnessSlider");
  const colorPreview = document.getElementById("colorPreview");

  let selectedHue = 0;
  let selectedSaturation = 100;
  let selectedBrightness = 50;

  function drawColorWheel(radius = 100) {
    const image = ctx.createImageData(radius * 2, radius * 2);

    for (let y = -radius; y < radius; y++) {
      for (let x = -radius; x < radius; x++) {
        const dx = x;
        const dy = y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > radius) continue;

        const angle = Math.atan2(dy, dx);
        let hue = (angle * 180) / Math.PI;
        if (hue < 0) hue += 360; // ✅ hue 값을 0~360도로 보정

        const sat = (d / radius) * 100;
        const [r, g, b] = hslToRgb(hue, sat, 50); // lightness 50% 기준

        const px = x + radius;
        const py = y + radius;
        const idx = (py * radius * 2 + px) * 4;

        image.data[idx] = r;
        image.data[idx + 1] = g;
        image.data[idx + 2] = b;
        image.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
  }

  // HSL → RGB 변환
  function hslToRgb(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // 무채색
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  // 색상 선택 시
  colorWheelCanvas.addEventListener("click", (e) => {
    const rect = colorWheelCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - 100;
    const dy = y - 100;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 100) return;

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const hue = (angle + 360) % 360;
    const saturation = (distance / 100) * 100;

    selectedHue = hue;
    selectedSaturation = saturation;

    updateColorPreview();
  });

  // 명도 조절
  brightnessSlider.addEventListener("input", () => {
    selectedBrightness = parseInt(brightnessSlider.value, 10);
    updateColorPreview();
  });

  // 미리보기 업데이트
  function updateColorPreview() {
    const [r, g, b] = hslToRgb(
      selectedHue,
      selectedSaturation,
      selectedBrightness
    );
    const hex = `#${[r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")}`;

    colorPreview.style.backgroundColor = hex;
    window.selectedUiBaseColor = hex; // 다른 로직에서 사용 가능
  }

  drawColorWheel(); // 초기 렌더링
  brightnessSlider.value = 50; // ✅ UI 슬라이더 값도 50으로 설정
  updateColorPreview(); // ✅ 초기 색상 미리보기 반영

  // 설정 버튼을 눌렀을 때 화면 및 네비게이션 변경
  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    document.getElementById("presetContainer").classList.add("hidden");
    document.getElementById("settingsScreen").classList.remove("hidden");
    document.getElementById("navBarMain").classList.add("hidden");
    document.getElementById("navBarSetting").classList.remove("hidden");
    document
      .getElementById("color-generation-container")
      .classList.add("hidden");
    document.getElementById("generated-palette-container").style.display =
      "none";
    document.getElementById("generation-method").value = "";
    document.getElementById("preset-option-container").classList.add("hidden");
    document.getElementById("keyword-option-container").classList.add("hidden");
    document.getElementById("preset-option").value = "";
    document.getElementById("keyword-option").value = "";
    updateSubscriptionUI();
  });

  // ✅ + 버튼을 눌렀을 때 화면 및 네비게이션 변경
  document.getElementById("addPresetBtn").addEventListener("click", () => {
    document.getElementById("presetContainer").classList.add("hidden");
    document.getElementById("newPresetScreen").classList.remove("hidden");
    document.getElementById("navBarMain").classList.add("hidden");
    document
      .getElementById("color-generation-container")
      .classList.add("hidden");
    document.getElementById("navBarNewPreset").classList.remove("hidden");
    document.getElementById("newPresetName").value = "";
    document.getElementById("newPresetName").disabled = false;
    document.getElementById("importPresetName").value = "";
    document.getElementById("importPresetName").disabled = false;
    document.getElementById("encryptedCodeInput").value = "";
    document.getElementById("encryptedCodeInput").disabled = false;
    document.getElementById("generated-palette-container").style.display =
      "none";
    document.getElementById("generation-method").value = "";
    document.getElementById("preset-option-container").classList.add("hidden");
    document.getElementById("keyword-option-container").classList.add("hidden");
    document.getElementById("preset-option").value = "";
    document.getElementById("keyword-option").value = "";
  });

  // ✅ 뒤로 가기 버튼 클릭 시 메인 화면으로 전환
  document.getElementById("backToMain").addEventListener("click", () => {
    document.getElementById("newPresetScreen").classList.add("hidden");
    document.getElementById("presetContainer").classList.remove("hidden");
    document
      .getElementById("color-generation-container")
      .classList.remove("hidden");
    document.getElementById("navBarNewPreset").classList.add("hidden");
    document.getElementById("navBarMain").classList.remove("hidden");
    document.getElementById("newPresetName").value = "";
    document.getElementById("importPresetName").value = "";
    document.getElementById("encryptedCodeInput").value = "";
  });

  document.getElementById("addColorBtn").addEventListener("click", () => {
    document.getElementById("presetDetails").classList.add("hidden");
    document.getElementById("addColorScreen").classList.remove("hidden");
  });

  document.getElementById("backToDetail").addEventListener("click", () => {
    document.getElementById("addColorScreen").classList.add("hidden");
    document.getElementById("presetDetails").classList.remove("hidden");

    document.getElementById("newColorName").value = "";
    document.getElementById("colorPicker").value = "#000000";
  });

  document.getElementById("backToMainPage").addEventListener("click", () => {
    showPresetList();
  });

  document
    .getElementById("backToMainFromSettings")
    .addEventListener("click", () => {
      document.getElementById("settingsScreen").classList.add("hidden");
      document.getElementById("presetContainer").classList.remove("hidden");
      document.getElementById("navBarSetting").classList.add("hidden");
      document.getElementById("navBarMain").classList.remove("hidden");
      document
        .getElementById("color-generation-container")
        .classList.remove("hidden");
    });

  // 구독 취소하기 버튼 클릭
  document
    .getElementById("unsubscribeBtn")
    .addEventListener("click", async () => {
      chrome.storage.sync.get(["subscriptionId"], async (data) => {
        const subId = data.subscriptionId;

        const encryptSubscriptionId = await encryptSubId(subId);
        const subscribePageUrl = `https://paletteboxsubscribe.com/cancelSubscription?e=${encodeURIComponent(
          encryptSubscriptionId
        )}`;

        window.open(subscribePageUrl, "_blank");
      });
    });

  chrome.storage.local.get(["darkMode"], (data) => {
    if (data.darkMode) {
      document.body.classList.add("dark-mode");
      document.getElementById("toggleDarkMode").innerText = "☀️";
      applyDarkMode();
    }
  });

  // ✅ 다크모드 버튼 클릭 이벤트
  document.getElementById("toggleDarkMode").addEventListener("click", () => {
    let isDarkMode = document.body.classList.toggle("dark-mode");

    // ✅ 버튼 아이콘 변경
    document.getElementById("toggleDarkMode").innerText = isDarkMode
      ? "☀️"
      : "🌙";

    // ✅ 다크모드 상태 저장
    chrome.storage.local.set({ darkMode: isDarkMode });

    // ✅ 다크모드 스타일 적용
    applyDarkMode();
  });

  const nameOnlyInput = document.getElementById("newPresetName");
  const nameOnlyInputSave = document.getElementById("savePreset");
  const codeNameInput = document.getElementById("importPresetName");
  const codeTextInput = document.getElementById("encryptedCodeInput");
  const codeTextInputSave = document.getElementById("decodeAndSave");

  function updateInputStates() {
    if (nameOnlyInput.value.trim() !== "") {
      codeNameInput.disabled = true;
      codeTextInput.disabled = true;
      codeTextInputSave.disabled = true;
    } else if (
      codeNameInput.value.trim() !== "" ||
      codeTextInput.value.trim() !== ""
    ) {
      nameOnlyInput.disabled = true;
      nameOnlyInputSave.disabled = true;
    } else {
      // 모두 비어 있으면 다시 활성화
      nameOnlyInput.disabled = false;
      nameOnlyInputSave.disabled = false;
      codeNameInput.disabled = false;
      codeTextInput.disabled = false;
      codeTextInputSave.disabled = false;
    }
  }

  nameOnlyInput.addEventListener("input", updateInputStates);
  codeNameInput.addEventListener("input", updateInputStates);
  codeTextInput.addEventListener("input", updateInputStates);

  // 저장 후 모든 입력 활성화 복구
  document.getElementById("savePreset").addEventListener("click", () => {
    setTimeout(() => updateInputStates(), 100); // 잠시 후 상태 재확인
  });

  document.getElementById("decodeAndSave").addEventListener("click", () => {
    setTimeout(() => updateInputStates(), 100);
  });

  document.getElementById("backToMain").addEventListener("click", () => {
    updateInputStates();
  });
});

let selectedPresetIndex = null;
let isEditing = false; // ✅ 현재 이름 변경 모드 여부
let colorNameChanges = {}; // ✅ 변경된 색상 이름을 임시 저장하는 객체

// ✅ 다크모드 스타일 적용 함수
function applyDarkMode() {
  let isDarkMode = document.body.classList.contains("dark-mode");
  let footer = document.getElementById("presetDetailFooter");

  if (isDarkMode) {
    footer.classList.add("dark-mode-footer");
    document.querySelectorAll("textarea").forEach((textarea) => {
      textarea.classList.add("dark-mode-textarea");
    });
    document.querySelectorAll("input").forEach((input) => {
      input.classList.add("dark-mode-input");
    });
    document
      .getElementById("generated-palette-container")
      .classList.add("dark-mode");

    document.querySelectorAll("select").forEach((select) => {
      select.classList.add("dark-mode-select");
    });
    document.querySelectorAll("option").forEach((option) => {
      option.classList.add("dark-mode-option");
    });
    document.getElementById("today-palette-banner").classList.add("dark-mode");
  } else {
    footer.classList.remove("dark-mode-footer");
    document.querySelectorAll("textarea").forEach((textarea) => {
      textarea.classList.remove("dark-mode-textarea");
    });
    document.querySelectorAll("input").forEach((input) => {
      input.classList.remove("dark-mode-input");
    });
    document
      .getElementById("generated-palette-container")
      .classList.remove("dark-mode");
    document.querySelectorAll("select").forEach((select) => {
      select.classList.remove("dark-mode-select");
    });
    document.querySelectorAll("option").forEach((option) => {
      option.classList.remove("dark-mode-option");
    });
    document
      .getElementById("today-palette-banner")
      .classList.remove("dark-mode");
  }

  // ✅ 설정 화면 버튼에도 다크모드 적용
  const settingsScreen = document.getElementById("settingsScreen");
  if (settingsScreen) {
    settingsScreen.classList.toggle("dark-mode", isDarkMode);
  }
}

// ✅ `chrome.storage.onChanged` 리스너 추가 (자동 업데이트)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.colorPresets) {
    loadPresets();
  }
});

// ✅ 프리셋을 저장하는 기능 (이름을 지정하여 저장)
document.getElementById("savePreset").addEventListener("click", () => {
  let presetName = document.getElementById("newPresetName").value.trim();

  if (!presetName) {
    alert(chrome.i18n.getMessage("command_entering_preset_name"));
    return;
  }

  chrome.storage.sync.get(["colorPresets", "selectedColors"], (data) => {
    let presets = data.colorPresets || [];
    let selectedColors = Array.from(data.selectedColors || []);
    // let isSubscribed = data.isSubscribed || false;

    // ✅ 동일한 프리셋 이름이 있는지 확인
    if (presets.some((preset) => preset.name === presetName)) {
      alert(chrome.i18n.getMessage("already_existed_preset_name"));
      return;
    }

    let newPreset = {
      id: Date.now(),
      name: presetName,
      colors: selectedColors,
    };

    presets.push(newPreset);
    chrome.storage.sync.set({ colorPresets: presets }, () => {
      loadPresets();

      // ✅ 저장 후 메인 화면으로 돌아감
      document.getElementById("newPresetScreen").classList.add("hidden");
      document.getElementById("presetContainer").classList.remove("hidden");
      document.getElementById("navBarNewPreset").classList.add("hidden");
      document.getElementById("navBarMain").classList.remove("hidden");
      document
        .getElementById("color-generation-container")
        .classList.remove("hidden");
      document.getElementById("newPresetName").value = ""; // 입력 필드 초기화
      alert(`${presetName} ${chrome.i18n.getMessage("create_preset_alert")}`);
    });
  });
});

// ✅ 저장된 프리셋 불러오기 및 UI 업데이트
function loadPresets() {
  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presetContainer = document.getElementById("presetList");
    presetContainer.innerHTML = "";

    if (data.colorPresets && data.colorPresets.length > 0) {
      data.colorPresets.forEach((preset, presetIndex) => {
        let presetItemContainer = document.createElement("div");
        presetItemContainer.classList.add("preset-item-container");

        let presetDiv = document.createElement("div");
        presetDiv.classList.add("preset-item");
        presetDiv.dataset.presetIndex = presetIndex;

        let presetHeader = document.createElement("div");
        presetHeader.classList.add("preset-header");

        // ✅ 프리셋 제목
        let presetTitle = document.createElement("strong");
        presetTitle.innerText = preset.name;

        // ✅ 삭제(X) 버튼 (프리셋 상단 우측)
        let deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-btn");
        deleteBtn.innerHTML = "&times;"; // X 기호
        deleteBtn.style.padding = "5px";
        deleteBtn.style.borderRadius = "100px";
        deleteBtn.style.fontSize = "18px";
        deleteBtn.onclick = (event) => {
          event.stopPropagation(); // ✅ 상세보기 이벤트 방지
          deletePreset(preset.id);
        };

        presetHeader.appendChild(presetTitle);
        presetHeader.appendChild(deleteBtn);

        // ✅ 색상 띠 (같은 너비를 차지하도록)
        let colorStrip = document.createElement("div");
        colorStrip.classList.add("color-strip");

        // ✅ 색상 미리보기 추가
        let colorPreviewContainer = document.createElement("div");
        colorPreviewContainer.classList.add("color-list-container");

        // ✅ `colorNames` 객체에서 이름과 HEX 코드 가져오기
        Object.entries(preset.colorNames || {}).forEach(([name, hex]) => {
          let colorBlock = document.createElement("div");
          colorBlock.classList.add("color-block");
          colorBlock.style.backgroundColor = hex;
          colorStrip.appendChild(colorBlock);
        });

        // ✅ 프리셋 클릭 시 상세보기 모드 활성화
        presetDiv.addEventListener("click", () => {
          selectedPresetIndex = presetIndex;
          showPresetDetails(presetIndex);
        });

        // ✅ 코드 컨테이너 (처음에는 숨김)
        let codeContainer = document.createElement("div");
        codeContainer.classList.add("code-container", "hidden");
        codeContainer.style.marginTop = "20px";
        codeContainer.style.display = "none"; // ✅ 초기에는 숨김

        let codeTextarea = document.createElement("textarea");
        codeTextarea.readOnly = true;
        codeTextarea.style.resize = "none";
        codeTextarea.style.height = "80px";
        codeTextarea.style.width = "250px";
        codeTextarea.addEventListener("click", (event) => {
          event.stopPropagation();
        });

        codeContainer.appendChild(codeTextarea);

        // ✅ "코드로 보내기" 버튼 추가
        let encryptBtn = document.createElement("button");
        encryptBtn.style.marginTop = "20px";
        encryptBtn.innerText = chrome.i18n.getMessage("export_code_button");
        encryptBtn.onclick = (event) => {
          event.stopPropagation();
          encryptAndCopyToClipboard(
            preset,
            codeContainer,
            codeTextarea,
            encryptBtn
          );
        };

        let exportPresetBtn = document.createElement("button");
        exportPresetBtn.style.marginTop = "10px";
        exportPresetBtn.innerText = chrome.i18n.getMessage("export_preset");
        exportPresetBtn.onclick = (event) => {
          event.stopPropagation();
          exportPresetInPopup(preset);
        };

        presetDiv.appendChild(presetHeader);
        presetDiv.appendChild(colorStrip);
        presetDiv.appendChild(encryptBtn);
        presetDiv.appendChild(exportPresetBtn);
        presetDiv.appendChild(codeContainer);
        presetDiv.appendChild(colorPreviewContainer);
        presetItemContainer.appendChild(presetDiv);
        presetContainer.appendChild(presetItemContainer);
      });
    } else {
      presetContainer.innerText = chrome.i18n.getMessage("empty_preset");
    }
  });
}

// ✅ 프리셋 상세보기 모드 표시
function showPresetDetails(presetIndex) {
  document.getElementById("navBarMain").classList.add("hidden");
  document.getElementById("navBarDetail").classList.remove("hidden");
  document.getElementById("color-generation-container").classList.add("hidden");
  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[presetIndex];

    document.getElementById("presetDetailTitle").innerText = preset.name;
    let colorList = document.getElementById("colorList");
    colorList.style.paddingBottom = "120px";
    colorList.innerHTML = "";

    let colorContainer = document.createElement("div");
    colorContainer.classList.add("color-container");

    colorNameChanges = {}; // ✅ 기존 데이터 초기화 (중복 방지)

    Object.entries(preset.colorNames || {}).forEach(([name, hex]) => {
      let colorDiv = document.createElement("div");
      colorDiv.classList.add("color-item");

      let colorBox = document.createElement("div");
      colorBox.classList.add("color-box");
      colorBox.style.backgroundColor = hex;

      let colorNameInput = document.createElement("input");
      colorNameInput.classList.add("color-name-input");
      colorNameInput.type = "text";
      colorNameInput.placeholder = chrome.i18n.getMessage("enter_color_name");
      colorNameInput.dataset.color = name;
      colorNameInput.dataset.hex = hex;
      colorNameInput.disabled = true; // 기본적으로 비활성화

      // ✅ 저장된 색상 이름 불러오기
      colorNameInput.value = name || "";

      // ✅ 입력된 이름을 `{ 색상코드: 새이름 }` 형태로 저장
      colorNameInput.addEventListener("input", (event) => {
        let colorHex = event.target.dataset.hex;
        let newName = event.target.value.trim();

        if (newName) {
          colorNameChanges[colorHex] = newName; // ✅ `{ 색상코드: 새이름 }`으로 저장
        }
      });

      colorDiv.appendChild(colorBox);
      colorDiv.appendChild(colorNameInput);
      colorContainer.appendChild(colorDiv);
    });

    colorList.appendChild(colorContainer);

    document.getElementById("presetList").classList.add("hidden");
    document.getElementById("presetDetails").classList.remove("hidden");
    document.getElementById("toggleEditMode").innerText =
      chrome.i18n.getMessage("edit"); // ✅ 초기 버튼 상태
    isEditing = false;
  });
}

// ✅ "이름 변경" 버튼 클릭 시 편집 모드 활성화
function toggleEditMode() {
  let inputs = document.querySelectorAll(".color-name-input");
  let button = document.getElementById("toggleEditMode");

  if (isEditing) {
    // ✅ 저장 기능 실행
    savePresetColorNames();
    button.innerText = chrome.i18n.getMessage("edit");

    // ✅ 저장 후 input을 다시 비활성화
    inputs.forEach((input) => {
      input.disabled = true;
    });
  } else {
    // ✅ 편집 모드 활성화
    inputs.forEach((input) => {
      input.disabled = false;
      input.style.display = "inline-block"; // 입력 필드 표시
    });
    button.innerText = chrome.i18n.getMessage("save_names");
  }

  isEditing = !isEditing;
}

// ✅ 변경된 색상 이름을 저장
function savePresetColorNames() {
  if (selectedPresetIndex === null) return;

  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[selectedPresetIndex];

    if (!preset.colorNames) {
      preset.colorNames = {};
    }

    let updatedColorNames = {}; // ✅ `{ 새이름: 색상코드 }`로 저장할 객체
    let colorHexToOldName = {}; // ✅ `{ 색상코드: 기존이름 }` 매핑을 위한 객체

    // ✅ 기존 데이터에서 `{ 색상코드: 기존이름 }` 형태로 변환
    Object.entries(preset.colorNames).forEach(([oldName, colorHex]) => {
      colorHexToOldName[colorHex] = oldName; // 기존 이름 매핑
    });

    // ✅ 변경된 데이터를 `{ 색상코드: 새이름 }`에서 `{ 새이름: 색상코드 }`로 변환
    Object.entries(colorNameChanges).forEach(([colorHex, newName]) => {
      if (newName) {
        // ✅ 기존 이름이 있으면 삭제하고 새 이름으로 대체
        if (colorHexToOldName[colorHex]) {
          delete preset.colorNames[colorHexToOldName[colorHex]]; // ✅ 기존 키 제거
        }
        colorHexToOldName[colorHex] = newName; // ✅ 새로운 이름 저장
      }
    });

    // ✅ `{ 색상코드: 새이름 }`을 `{ 새이름: 색상코드 }`로 변환하여 저장
    Object.entries(colorHexToOldName).forEach(([colorHex, newName]) => {
      updatedColorNames[newName] = colorHex;
    });

    // ✅ 변경 사항을 프리셋에 반영
    preset.colorNames = updatedColorNames;

    // ✅ 변경된 데이터 저장
    chrome.storage.sync.set({ colorPresets: presets }, () => {
      alert(chrome.i18n.getMessage("modify_color_name_alert"));
      colorNameChanges = {}; // ✅ 저장 후 임시 데이터 초기화
    });
  });
}

document.getElementById("exportPresetBtn").addEventListener("click", () => {
  chrome.storage.sync.get(["colorPresets"], (data) => {
    const presets = data.colorPresets || [];

    if (presets.length === 0) {
      alert(chrome.i18n.getMessage("no_find_saved_preset"));
      return;
    }

    // // ✅ 선택된 프리셋 인덱스가 유효한지 확인
    if (selectedPresetIndex === null || selectedPresetIndex >= presets.length) {
      alert(chrome.i18n.getMessage("no_find_saved_preset"));
      return;
    }

    const selectedPreset = presets[selectedPresetIndex];
    const colorNames = selectedPreset.colorNames || {};

    // ✅ 선택한 프리셋의 colorNames만 export
    const exportData = {};
    Object.entries(colorNames).forEach(([name, hex]) => {
      exportData[name] = hex;
    });

    const jsonString = JSON.stringify(exportData, null, 2); // 보기 좋게 포맷
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download(
      {
        url: url,
        filename: `${selectedPreset.name || "colors"}.json`,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("❌ 다운로드 실패:", chrome.runtime.lastError.message);
          alert(chrome.i18n.getMessage("fail_download"));
        } else {
          console.log("✅ 다운로드 시작됨! ID:", downloadId);
        }
      }
    );
  });
});

// ✅ 프리셋 목록으로 돌아가기
function showPresetList() {
  document.getElementById("navBarMain").classList.remove("hidden");
  document.getElementById("navBarDetail").classList.add("hidden");

  document.getElementById("presetList").classList.remove("hidden");
  document.getElementById("presetDetails").classList.add("hidden");

  document.getElementById("addColorScreen").classList.add("hidden");
  document
    .getElementById("color-generation-container")
    .classList.remove("hidden");

  document.getElementById("newColorName").value = "";
  document.getElementById("colorPicker").value = "#000000";
}

// ✅ 프리셋 삭제 기능
function deletePreset(presetId) {
  chrome.storage.sync.get("colorPresets", (data) => {
    let presets = data.colorPresets || [];
    let updatedPresets = presets.filter((preset) => preset.id !== presetId);
    chrome.storage.sync.set({ colorPresets: updatedPresets }, () => {
      loadPresets();
    });
  });
}

document.getElementById("addColorToPreset").addEventListener("click", () => {
  const color = document.getElementById("colorPicker").value;
  const name = document.getElementById("newColorName").value.trim();

  if (!color || selectedPresetIndex === null) {
    alert(chrome.i18n.getMessage("no_preset_or_colors"));
    return;
  }

  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[selectedPresetIndex];

    if (!preset.colors.includes(color)) {
      preset.colors.push(color);
    }

    if (!preset.colorNames) {
      preset.colorNames = {};
    }

    const colorName = name || color;
    preset.colorNames[colorName] = color;

    chrome.storage.sync.set({ colorPresets: presets }, () => {
      alert(chrome.i18n.getMessage("add_colors_into_preset"));

      // UI 초기화
      document.getElementById("newColorName").value = "";
      document.getElementById("colorPicker").value = "#000000";
      document.getElementById("addColorScreen").classList.add("hidden");
      document.getElementById("presetDetails").classList.remove("hidden");

      showPresetDetails(selectedPresetIndex); // 프리셋 다시 렌더링
    });
  });
});

// 색상 추천 조합 보조 함수
function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  let c = (1 - Math.abs(2 * l - 1)) * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = l - c / 2;
  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 기존 프리셋 기반 색상 조합 추천 함수
function generateSimilarColorsFromPreset(baseColors) {
  const result = [];
  const usedHues = [];

  for (const hex of baseColors) {
    const [baseH, baseS, baseL] = hexToHSL(hex);

    let h,
      s,
      l,
      tries = 0;
    do {
      h = (baseH + (Math.random() * 60 - 30) + 360) % 360;
      s = Math.max(30, Math.min(100, baseS + (Math.random() * 30 - 15)));
      l = Math.max(20, Math.min(90, baseL + (Math.random() * 20 - 10)));

      const tooClose = usedHues.some(
        (existingH) =>
          Math.abs(existingH - h) < 18 || Math.abs(existingH - h) > 342
      );
      tries++;
      if (!tooClose || tries > 10) break; // 탈출 조건
    } while (true);

    usedHues.push(h);
    result.push(hslToHex(h, s, l));
  }

  return result;
}

// 키워드 기반 추천 함수

const keywordColorProfiles = {
  spring: {
    hueGroups: [
      [40, 60],
      [330, 360],
      [300, 320],
      [130, 160],
    ],
    satRange: [30, 70],
    lightRange: [60, 80],
    options: {
      excludeColors: ["brown"],
      distinctHuesOnly: true,
    },
  },
  summer: {
    hueGroups: [
      [180, 220],
      [100, 130],
    ],
    satRange: [40, 80],
    lightRange: [60, 80],
    options: {
      distinctHuesOnly: true,
    },
  },
  autumn: {
    hueGroups: [
      [20, 40],
      [10, 30],
      [0, 10],
      [340, 360],
    ],
    satRange: [40, 70],
    lightRange: [50, 70],
    options: {
      distinctHuesOnly: true,
    },
  },
  winter: {
    hueGroups: [
      [210, 240],
      [200, 220],
    ],
    satRange: [30, 60],
    lightRange: [70, 90],
    options: {
      excludeColors: ["green"],
      includePastel: true,
      distinctHuesOnly: true,
    },
  },
  nature: {
    hueGroups: [
      [100, 140],
      [190, 210],
    ],
    satRange: [40, 80],
    lightRange: [30, 60],
    options: {
      pickOneGroupOnly: true,
      distinctHuesOnly: true,
    },
  },
  city: {
    hueGroups: [
      [200, 240],
      [0, 0],
    ],
    satRange: [0, 20],
    lightRange: [20, 60],
    options: {
      excludePureColors: true,
      distinctHuesOnly: true,
    },
  },
  food: {
    hueGroups: [
      [10, 30],
      [0, 10],
      [40, 60],
      [100, 120],
    ],
    satRange: [50, 100],
    lightRange: [40, 70],
    options: {
      distinctHuesOnly: true,
    },
  },
  emotion: {
    hueGroups: [
      [250, 280],
      [200, 220],
      [0, 10],
    ],
    satRange: [10, 60],
    lightRange: [30, 70],
    options: {
      includeGray: true,
      distinctHuesOnly: true,
    },
  },
  modern: {
    hueGroups: [
      [210, 240],
      [0, 0],
    ],
    satRange: [0, 25],
    lightRange: [20, 70],
    options: {
      includeGray: true,
      distinctHuesOnly: true,
    },
  },
  vintage: {
    hueGroups: [
      [30, 50],
      [10, 20],
    ],
    satRange: [20, 60],
    lightRange: [40, 70],
    options: {
      distinctHuesOnly: true,
      excludePureColors: true,
    },
  },
  warm: {
    hueGroups: [[0, 40]],
    satRange: [30, 60],
    lightRange: [50, 75],
    options: {
      distinctHuesOnly: true,
    },
  },
  cool: {
    hueGroups: [
      [180, 200],
      [120, 150],
    ],
    satRange: [40, 70],
    lightRange: [60, 80],
    options: {
      distinctHuesOnly: true,
    },
  },
  bright: {
    hueGroups: [
      [50, 80],
      [300, 340],
      [100, 140],
    ],
    satRange: [30, 60],
    lightRange: [75, 95],
    options: {
      distinctHuesOnly: true,
    },
  },
  dark: {
    hueGroups: [
      [240, 260],
      [0, 10],
      [30, 50],
    ],
    satRange: [10, 40],
    lightRange: [10, 30],
    options: {
      includeBlack: true,
      distinctHuesOnly: true,
    },
  },
  calm: {
    hueGroups: [
      [160, 200],
      [20, 40],
    ],
    satRange: [10, 30],
    lightRange: [60, 85],
    options: {
      excludeColors: ["brown"],
      distinctHuesOnly: true,
    },
  },
  dynamic: {
    hueGroups: [
      [0, 20],
      [30, 50],
      [160, 180],
    ],
    satRange: [70, 100],
    lightRange: [40, 60],
    options: {
      includeBlack: true,
      preferComplementary: true,
      distinctHuesOnly: true,
    },
  },
};

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

function hslToHexKeyword(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const to255 = (n) => Math.round((n + m) * 255);
  return `#${[r, g, b]
    .map(to255)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function isDistinctHue(h, usedHues) {
  return usedHues.every((uh) => Math.abs(uh - h) > 10);
}

function isBrown(h, s, l) {
  return h >= 20 && h <= 45 && s >= 30 && s <= 60 && l >= 30 && l <= 55;
}

// 키워드 기반 색상 조합 함수
function getBaseColorFromKeyword(keyword, count = 5) {
  const profile = keywordColorProfiles[keyword];
  if (!profile) return [];

  const {
    hueGroups = [],
    satRange = [50, 100],
    lightRange = [50, 70],
    options = {},
  } = profile;

  const results = new Set();
  const usedHues = [];

  const targetHueGroups = options.pickOneGroupOnly
    ? [hueGroups[Math.floor(Math.random() * hueGroups.length)]]
    : hueGroups;

  let attempts = 0;
  const maxAttempts = 1000;

  // 조건 기반 특수 색상 삽입
  if (options.includeGray && results.size < count) {
    results.add(hslToHex(0, 0, randomInRange(40, 70)));
  }

  if (options.includeBlack && results.size < count) {
    results.add(hslToHex(0, 0, randomInRange(5, 15)));
  }

  if (options.includePastel && results.size < count) {
    const [hMin, hMax] =
      targetHueGroups[Math.floor(Math.random() * targetHueGroups.length)];
    const pastelHue = Math.floor(randomInRange(hMin, hMax));
    results.add(
      hslToHex(pastelHue, randomInRange(10, 30), randomInRange(80, 90))
    );
  }

  while (results.size < count && attempts < maxAttempts) {
    attempts++;

    const [hMin, hMax] =
      targetHueGroups[Math.floor(Math.random() * targetHueGroups.length)];
    const h = Math.floor(randomInRange(hMin, hMax));
    const s = Math.floor(randomInRange(...satRange));
    const l = Math.floor(randomInRange(...lightRange));

    if (options.distinctHuesOnly && !isDistinctHue(h, usedHues)) continue;
    if (options.excludePureColors && s > 80) continue;
    if (options.excludeColors?.includes("brown") && isBrown(h, s, l)) continue;

    const hex = hslToHex(h, s, l);
    if (!results.has(hex)) {
      usedHues.push(h);
      results.add(hex);
    }

    // 보색 전략: 조건 만족 + 공간 남으면 보색도 넣음
    if (
      options.preferComplementary &&
      results.size < count &&
      Math.random() < 0.5
    ) {
      const compHue = (h + 180) % 360;
      const compHex = hslToHex(compHue, s, l);
      if (
        (!options.distinctHuesOnly || isDistinctHue(compHue, usedHues)) &&
        !results.has(compHex)
      ) {
        usedHues.push(compHue);
        results.add(compHex);
      }
    }
  }

  // 실패 시 백업: 무작위 색으로 채움
  while (results.size < count) {
    results.add(
      hslToHex(
        Math.floor(Math.random() * 360),
        Math.floor(randomInRange(30, 80)),
        Math.floor(randomInRange(30, 80))
      )
    );
  }

  return Array.from(results).slice(0, count);
}

// ui 디자인용 색 조합 추천 함수
function hexToHslUI(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHexUI(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return (
    "#" +
    [r, g, b]
      .map((v) =>
        Math.round((v + m) * 255)
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function generateTonePalette(baseHex, count = 20) {
  const [h, s, l] = hexToHslUI(baseHex);
  const palette = [];

  for (let i = 0; i < count; i++) {
    const lightness = 95 - (90 / (count - 1)) * i;
    palette.push(hslToHexUI(h, s, lightness));
  }

  return palette;
}

const keywords = {
  nature: chrome.i18n.getMessage("nature"),
  city: chrome.i18n.getMessage("city"),
  food: chrome.i18n.getMessage("food"),
  emotion: chrome.i18n.getMessage("emotion"),
  spring: chrome.i18n.getMessage("spring"),
  summer: chrome.i18n.getMessage("summer"),
  autumn: chrome.i18n.getMessage("autumn"),
  winter: chrome.i18n.getMessage("winter"),
  vintage: chrome.i18n.getMessage("vintage"),
  modern: chrome.i18n.getMessage("modern"),
  warm: chrome.i18n.getMessage("warm"),
  cool: chrome.i18n.getMessage("cool"),
  bright: chrome.i18n.getMessage("bright"),
  dark: chrome.i18n.getMessage("dark"),
  calm: chrome.i18n.getMessage("calm"),
  dynamic: chrome.i18n.getMessage("dynamic"),
};

document
  .getElementById("generate-palette-btn")
  .addEventListener("click", () => {
    chrome.storage.sync.get("colorPresets", (data) => {
      const generationMethodSelect =
        document.getElementById("generation-method");
      const selected = generationMethodSelect.value;

      if (selected === "preset") {
        if (!data.colorPresets || selectedPresetIndex === null) {
          return;
        }

        const preset = data.colorPresets[selectedPresetIndex];
        const originalColors = preset.colors || [];

        const recommendedColors =
          generateSimilarColorsFromPreset(originalColors);

        // 이후 UI에 표시하거나 새 프리셋으로 저장하도록 연결
        renderGeneratedPalette(
          "기존 프리셋 기반",
          "기존 프리셋 기반으로 생성된 색상 조합",
          recommendedColors
        );
      } else if (selected === "keyword") {
        const colorCountInput = document.getElementById("color-count-input");

        if (colorCountInput === "") {
          alert("원하는 색상 개수를 입력해주세요.");
        }

        const keywordColors = getBaseColorFromKeyword(
          selectedKeyword,
          parseInt(colorCountInput.value)
        );

        renderGeneratedPalette(
          "키워드 기반",
          "키워드 기반으로 생성된 색상 조합",
          keywordColors,
          keywords[selectedKeyword]
        );
      } else if (selected === "ui") {
        const selectedColor = window.selectedUiBaseColor;

        const uiColors = generateTonePalette(selectedColor);

        renderGeneratedPalette(
          "UI 디자인 추천",
          "UI 디자인 추천을 위한 색상 조합",
          uiColors
        );
      }
    });
  });

function renderGeneratedPalette(title, subtitle, colors, keyword) {
  const container = document.getElementById("generated-palette-container");
  container.style.display = "block"; // ✅ 이 시점에만 보이게 함
  container.innerHTML = ""; // 초기화

  const card = document.createElement("div");

  card.innerHTML = `
    <div class="palette-title">
      <span>🎨</span>
      <span>${title} ${keyword && keyword}</span>
      <span style="font-size:10px; background:#334155; color:#60a5fa; padding: 2px 6px; border-radius: 6px;">Generated</span>
    </div>
    <div class="palette-subtitle">${subtitle}</div>
    <div class="palette-colors">
      ${colors
        .map(
          (hex) =>
            `<div class="palette-color" style="background-color: ${hex};"></div>`
        )
        .join("")}
    </div>
    <div class="palette-footer">
      <span style="font-size: 12px; color: #94a3b8;">${
        colors.length
      } colors</span>
      <div class="buttons">
        <button class="save-btn">💾 저장</button>
        <button class="close-btn">✕</button>
      </div>
    </div>
  `;

  container.appendChild(card);

  // 닫기 버튼 이벤트
  card.querySelector(".close-btn").addEventListener("click", () => {
    container.innerHTML = "";
  });

  // 저장 버튼 이벤트 (선택적으로 구현)
  card.querySelector(".save-btn").addEventListener("click", () => {
    let invertedColorNames = {};
    Object.entries(colors).forEach(([index, hex]) => {
      invertedColorNames[hex] = hex;
    });
    let newPreset = {
      id: Date.now(),
      name: keyword ? `${keyword}` : title,
      colors: colors,
      colorNames: invertedColorNames,
    };
    chrome.storage.sync.get("colorPresets", (data) => {
      const presets = data.colorPresets || [];
      presets.push(newPreset);

      chrome.storage.sync.set({ colorPresets: presets }, () => {
        loadPresets();
        alert("✅ 팔레트가 프리셋으로 저장되었습니다.");
        container.innerHTML = "";
      });
    });
  });
}

// 오늘의 랜덤 추천 색상 조합을 프리셋에 저장하는 함수
function saveTodayPaletteAsPreset() {
  chrome.storage.local.get("lastTodayColors", (localData) => {
    const banner = document.getElementById("today-palette-banner");
    const todayColors = localData.lastTodayColors;

    if (!todayColors || todayColors.length === 0) {
      alert("❌ 저장할 오늘의 색상 정보가 없습니다.");
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const presetName = `오늘의 추천 팔레트 (${timestamp})`;

    const colorNames = {};
    todayColors.forEach((hex) => {
      colorNames[hex] = hex; // 이름 없이 색상 값 그대로 사용
    });

    const newPreset = {
      id: timestamp,
      name: presetName,
      colors: todayColors,
      colorNames: colorNames,
    };

    chrome.storage.sync.get("colorPresets", (data) => {
      const presets = data.colorPresets || [];
      presets.push(newPreset);

      chrome.storage.sync.set({ colorPresets: presets }, () => {
        alert("✅ 오늘의 색상이 프리셋으로 저장되었습니다.");
        banner.classList.add("hidden");
        loadPresets();
      });
    });
  });
}

document
  .getElementById("today-save-btn")
  .addEventListener("click", saveTodayPaletteAsPreset);

// 오늘의 색상 조합에 들어가는 색상 수 저장
document.getElementById("saveTodayColorCount").addEventListener("click", () => {
  const count = parseInt(document.getElementById("todayColorCount").value, 10);
  chrome.storage.local.set({ todayColorCount: count }, () => {
    alert("오늘의 색상 수가 조정되었습니다.");
  });
});

// ✅ HEX 색상 및 색상 이름 리스트를 AES-256으로 암호화하는 함수
async function encryptColorsWithAES(preset) {
  let colorData = {}; // ✅ 색상 이름 + HEX 코드 저장용 객체

  Object.entries(preset.colorNames || {}).forEach(([name, hex]) => {
    let colorName = name || hex; // 저장된 색상 이름이 없으면 HEX 코드 사용
    colorData[colorName] = hex; // { "빨강": "#FF0000", "초록": "#00FF00" } 형식으로 저장
  });

  const response = await fetch(`https://palettebox.net/encrypt-preset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(colorData), // 평문 그대로 전송
  });

  const data = await response.json();

  return data.encryptedCode;
}

function exportPresetInPopup(preset) {
  const selectedPreset = preset;
  const colorNames = selectedPreset.colorNames || {};

  // ✅ 선택한 프리셋의 colorNames만 export
  const exportData = {};
  Object.entries(colorNames).forEach(([name, hex]) => {
    exportData[name] = hex;
  });

  const jsonString = JSON.stringify(exportData, null, 2); // 보기 좋게 포맷
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  chrome.downloads.download(
    {
      url: url,
      filename: `${selectedPreset.name || "colors"}.json`,
      saveAs: true,
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("❌ 다운로드 실패:", chrome.runtime.lastError.message);
        alert(chrome.i18n.getMessage("fail_download"));
      } else {
        console.log("✅ 다운로드 시작됨! ID:", downloadId);
      }
    }
  );
}

// ✅ 암호화 후 input 필드에 표시하고 클립보드에 복사하는 함수
async function encryptAndCopyToClipboard(
  preset,
  codeContainer,
  codeTextarea,
  toggleCodeBtn
) {
  if (codeContainer.style.display === "none") {
    let encryptedCode = await encryptColorsWithAES(preset);
    codeTextarea.value = encryptedCode;
    codeContainer.classList.remove("hidden"); // ✅ 코드 컨테이너 보이기
    codeContainer.style.display = "block"; // ✅ display 속성 추가

    // ✅ 버튼 텍스트 변경
    toggleCodeBtn.innerText = chrome.i18n.getMessage("hide_code");

    // ✅ 클립보드에 복사
    navigator.clipboard
      .writeText(encryptedCode)
      .then(() => {
        alert(chrome.i18n.getMessage("copy_encrypted_code_alert"));
      })
      .catch((err) => {
        console.error("❌ 클립보드 복사 실패:", err);
      });
  } else {
    // ✅ 코드 숨기기
    codeContainer.classList.add("hidden");
    codeContainer.style.display = "none";

    // ✅ 버튼 텍스트 변경
    toggleCodeBtn.innerText = chrome.i18n.getMessage("export_code_button");
  }
}

// ✅ 상세보기 화면에서 "코드로 보내기" 버튼 클릭 시 실행
document.getElementById("sendToCode").addEventListener("click", () => {
  if (selectedPresetIndex === null) return;

  chrome.storage.sync.get(["colorPresets"], async (data) => {
    let preset = data.colorPresets[selectedPresetIndex];
    let encryptedCode = await encryptColorsWithAES(preset);

    // ✅ 클립보드에 복사
    navigator.clipboard
      .writeText(encryptedCode)
      .then(() => {
        alert(chrome.i18n.getMessage("copy_encrypted_code_alert"));
      })
      .catch((err) => {
        console.error("❌ 클립보드 복사 실패:", err);
      });
  });
});

// ✅ AES-256 암호화된 데이터를 복호화하는 함수
async function decryptColorsWithAES(encryptedString) {
  const response = await fetch(`https://palettebox.net/decrypt-preset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ encryptedString }),
  });

  const data = await response.json();

  return data.colorNames; // 복호화된 결과
}

// ✅ 복호화 후 프리셋으로 저장하는 함수
document.getElementById("decodeAndSave").addEventListener("click", async () => {
  let presetName = document.getElementById("importPresetName").value.trim();
  let encryptedCode = document
    .getElementById("encryptedCodeInput")
    .value.trim();

  if (!presetName || !encryptedCode) {
    alert(
      chrome.i18n.getMessage("command_entering_encrypted_code_and_preset_name")
    );
    return;
  }

  let decryptedColors = await decryptColorsWithAES(encryptedCode);

  if (!decryptedColors || Object.keys(decryptedColors).length === 0) {
    alert(chrome.i18n.getMessage("no_correct_encrypted_code_alert"));
    return;
  }

  // ✅ 색상 HEX 코드만 추출하여 colors 배열 생성
  let colorsArray = Object.values(decryptedColors);
  let colorNamesObject = decryptedColors; // `{ "이름": "HEX 코드" }` 구조 유지

  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];

    if (presets.some((preset) => preset.name === presetName)) {
      alert(chrome.i18n.getMessage("already_existed_preset_name"));
      return;
    }

    let newPreset = {
      id: Date.now(),
      name: presetName,
      colors: colorsArray, // HEX 코드 리스트
      colorNames: colorNamesObject, // ✅ 이름 포함된 색상 데이터
    };

    presets.push(newPreset);
    chrome.storage.sync.set({ colorPresets: presets }, () => {
      loadPresets();
      document.getElementById("newPresetScreen").classList.add("hidden");
      document.getElementById("presetContainer").classList.remove("hidden");
      document.getElementById("navBarNewPreset").classList.add("hidden");
      document.getElementById("navBarMain").classList.remove("hidden");
      document.getElementById("newPresetName").value = "";
      document.getElementById("importPresetName").value = "";
      document.getElementById("encryptedCodeInput").value = ""; // 입력 필드 초기화
      alert(
        `"${presetName}""${chrome.i18n.getMessage("load_decrypted_preset")}"`
      );
    });
  });
});

// ✅ 구독 버튼 클릭 시 이벤트 처리
// document.getElementById("subscribeNow").addEventListener("click", () => {
//   // ✅ 구글 이메일 정보 가져오기
//   chrome.storage.sync.get(["userEmail"], async (data) => {
//     const email = data.userEmail;

//     if (!email) {
//       alert(chrome.i18n.getMessage("no_google_email"));
//       return;
//     }

//     const encryptedEmail = await encryptEmail(email);
//     const subscribeUrl = `https://paletteboxsubscribe.com?e=${encodeURIComponent(
//       encryptedEmail
//     )}`;

//     // ✅ 새 탭으로 구독 페이지 열기
//     window.open(subscribeUrl, "_blank");
//   });
// });
