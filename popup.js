let selectedColors = new Set(); // ✅ 선택된 색상을 저장할 Set
let selectedColorNames = {};

// ✅ 구독 상태 확인 함수
function checkSubscriptionStatus() {
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

        if (isSubscribed) {
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
            window.close();
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

document.addEventListener("DOMContentLoaded", () => {
  const lang = chrome.i18n.getUILanguage();
  document.getElementById("extracted_colors").textContent =
    chrome.i18n.getMessage("extracted_colors");

  document.getElementById("subscribe_prompt").textContent =
    chrome.i18n.getMessage("subscribe_prompt");

  document.getElementById("subscribeNow").textContent =
    chrome.i18n.getMessage("subscribe_button");

  document.getElementById("extracting_colors").textContent =
    chrome.i18n.getMessage("extracting_colors");

  document.getElementById("captured_image").textContent =
    chrome.i18n.getMessage("captured_image");

  document.getElementById("show_selected_colors").textContent =
    chrome.i18n.getMessage("show_selected_colors");

  document.getElementById("save_colors_to_preset_title").textContent =
    chrome.i18n.getMessage("save_colors_to_preset_title");

  document.getElementById("select_preset").textContent =
    chrome.i18n.getMessage("select_preset");

  document.getElementById("saveSelectedColors").textContent =
    chrome.i18n.getMessage("save_colors_to_preset");

  document.getElementById("create_new_preset_immediately").textContent =
    chrome.i18n.getMessage("create_new_preset_immediately");

  document.getElementById("newPresetName").placeholder = chrome.i18n.getMessage(
    "enter_new_preset_name"
  );

  document.getElementById("saveSelectedNewPresetColors").textContent =
    chrome.i18n.getMessage("save_colors_to_preset");

  if (lang.startsWith("es")) {
    document.getElementById("saveSelectedNewPresetColors").style.fontSize =
      "11px";
    document.getElementById("saveSelectedColors").style.fontSize = "11px";
  }

  const loadingScreen = document.getElementById("loadingScreen");
  const mainContent = document.getElementById("mainContent");

  // ✅ 처음엔 로딩 화면 표시, 본문 숨김
  loadingScreen.classList.remove("hidden");
  mainContent.classList.add("hidden");

  chrome.storage.local.get(
    ["capturedImage", "darkMode", "dataImage"],
    (data) => {
      document.getElementById("loadingScreen").classList.add("hidden");
      document.getElementById("mainContent").classList.remove("hidden");

      let imageContainer = document.getElementById("capturedImageContainer");
      let colorContainer = document.getElementById("colorList");

      if (data.darkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("toggleDarkMode").innerText = "☀️";
        applyDarkMode();
      }

      if (data.capturedImage) {
        let img = new Image();
        img.src = data.capturedImage;
        img.style.width = "90%";
        img.style.border = "1px solid #ddd";
        imageContainer.appendChild(img);
      } else {
        imageContainer.innerText = chrome.i18n.getMessage("no_captured_image");
      }

      if (data.capturedImage) {
        const img = new Image();
        img.src = data.capturedImage;
        img.crossOrigin = "Anonymous";

        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          canvas.width = img.width;
          canvas.height = img.height;

          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          ).data;

          const dominantColors = extractDominantColorsStrictFromImageData(
            imageData,
            canvas.width,
            canvas.height,
            20
          );

          console.log("[최종 dominant colors]", dominantColors);

          // 👉 dominantColors를 UI로 뿌려주기
          renderColorList(dominantColors, colorContainer);
        };
      } else {
        colorContainer.innerText = chrome.i18n.getMessage(
          "no_extracted_colors"
        );
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          loadingScreen.classList.add("hidden"); // 로딩 숨김
          mainContent.classList.remove("hidden"); // 본문 보이기
          checkSubscriptionStatus();
        }, 200);
      });
    }
  );

  chrome.storage.sync.get(["colorPresets"], (data) => {
    let presetDropdown = document.getElementById("presetDropdown");
    // ✅ 프리셋 목록 불러오기
    if (data.colorPresets && data.colorPresets.length > 0) {
      data.colorPresets.forEach((preset) => {
        let option = document.createElement("option");
        option.value = preset.id;
        option.innerText = preset.name;
        presetDropdown.appendChild(option);
      });
    }
  });

  // ✅ 다크 모드 버튼 클릭 이벤트 추가
  document.getElementById("toggleDarkMode").addEventListener("click", () => {
    let isDarkMode = document.body.classList.toggle("dark-mode");

    // ✅ 버튼 아이콘 변경
    document.getElementById("toggleDarkMode").innerText = isDarkMode
      ? "☀️"
      : "🌙";

    // ✅ 다크 모드 상태 저장
    chrome.storage.local.set({ darkMode: isDarkMode });

    // ✅ 다크 모드 스타일 적용
    applyDarkMode();
  });
  // ✅ 스크롤 버튼 기능
  const scrollToTopBtn = document.getElementById("scrollToTop");
  const scrollToBottomBtn = document.getElementById("scrollToBottom");

  // ✅ 맨 위로 이동
  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // ✅ 맨 아래로 이동
  scrollToBottomBtn.addEventListener("click", () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  });

  // ✅ 스크롤 이벤트 리스너 추가
  window.addEventListener("scroll", () => {
    let scrollTop = window.scrollY;
    let scrollHeight = document.documentElement.scrollHeight;
    let clientHeight = document.documentElement.clientHeight;

    // ✅ 스크롤이 100px 이상 내려가면 "맨 위로" 버튼 보이기
    if (scrollTop > 100) {
      scrollToTopBtn.style.display = "block";
    } else {
      scrollToTopBtn.style.display = "none";
    }

    // ✅ 스크롤이 맨 아래에 도달하면 "맨 아래로" 버튼 숨기기
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      scrollToBottomBtn.style.display = "none";
    } else {
      scrollToBottomBtn.style.display = "block";
    }
  });

  // ✅ 초기 버튼 상태 설정
  scrollToTopBtn.style.display = "none"; // 처음엔 숨김

  // ✅ 선택한 색상을 기존 프리셋 또는 새로운 프리셋에 저장
  document
    .getElementById("saveSelectedColors")
    .addEventListener("click", () => {
      saveNewPreset();
    });

  document
    .getElementById("saveSelectedNewPresetColors")
    .addEventListener("click", () => {
      saveNewPreset();
    });

  const presetSelect = document.getElementById("presetDropdown");
  const presetSelectSave = document.getElementById("saveSelectedColors");
  const presetInput = document.getElementById("newPresetName");
  const presetInputSave = document.getElementById(
    "saveSelectedNewPresetColors"
  );

  // ✅ Select 태그 선택 시 Input 비활성화
  presetSelect.addEventListener("change", () => {
    if (presetSelect.value) {
      presetInput.disabled = true;
      presetInputSave.disabled = true;
    } else {
      presetInput.disabled = false;
      presetInputSave.disabled = false;
    }
  });

  // ✅ Input 입력 시 Select 비활성화
  presetInput.addEventListener("input", () => {
    if (presetInput.value.trim() !== "") {
      presetSelect.disabled = true;
      presetSelectSave.disabled = true;
    } else {
      presetSelect.disabled = false;
      presetSelectSave.disabled = false;
    }
  });
});

// ✅ 다크 모드 스타일 적용 함수
function applyDarkMode() {
  let isDarkMode = document.body.classList.contains("dark-mode");

  if (isDarkMode) {
    document.body.style.backgroundColor = "#222";

    document.querySelectorAll("h2").forEach((label) => {
      label.style.color = "#fff";
    });

    document.querySelectorAll("h3").forEach((label) => {
      label.style.color = "#fff";
    });

    document.querySelectorAll("button").forEach((button) => {
      button.style.backgroundColor = "#444";
      button.style.color = "#fff";
      button.style.border = "1px solid #666";
    });

    document.querySelectorAll("input, select").forEach((input) => {
      input.style.backgroundColor = "#333";
      input.style.color = "#fff";
      input.style.border = "1px solid #666";
    });
  } else {
    document.body.style.backgroundColor = "#fff";
    document.body.style.color = "#000";

    document.querySelectorAll("h2").forEach((label) => {
      label.style.color = "#000";
    });

    document.querySelectorAll("h3").forEach((label) => {
      label.style.color = "#000";
    });

    document.querySelectorAll("button").forEach((button) => {
      button.style.backgroundColor = "";
      button.style.color = "";
      button.style.border = "";
    });

    document.querySelectorAll("input, select").forEach((input) => {
      input.style.backgroundColor = "";
      input.style.color = "";
      input.style.border = "";
    });
  }
}

function saveNewPreset() {
  let selectedPresetId = document.getElementById("presetDropdown").value;
  let presetNameInput = document.getElementById("newPresetName");
  let newPresetName = document.getElementById("newPresetName").value.trim();

  if (selectedColors.size === 0) {
    alert(chrome.i18n.getMessage("command_selecting_colors_for_save"));
    return;
  }

  // ✅ selectedColorNames 데이터를 {"변경이름": "색상코드"} 형태로 변환
  let invertedColorNames = {};
  Object.entries(selectedColorNames).forEach(([hex, name]) => {
    invertedColorNames[name || hex] = hex; // ✅ 이름이 없으면 HEX 코드 자체를 키로 사용
  });

  let newPreset = {
    id: Date.now(),
    name: newPresetName,
    colors: Array.from(selectedColors),
    colorNames: invertedColorNames, // ✅ 변경된 색상 이름 포함하여 저장
  };

  chrome.storage.sync.get(["colorPresets", "isSubscribed"], (data) => {
    let presets = data.colorPresets || [];
    let isSubscribed = data.isSubscribed || false;

    if (selectedPresetId) {
      // ✅ 기존 프리셋에 색상 추가 (이름 포함)
      let targetPreset = presets.find(
        (preset) => preset.id == selectedPresetId
      );
      if (!targetPreset) {
        alert(chrome.i18n.getMessage("no_find_saved_preset"));
        return;
      }

      if (!targetPreset.colorNames) {
        targetPreset.colorNames = {};
      }

      selectedColors.forEach((color) => {
        if (!targetPreset.colors.includes(color)) {
          targetPreset.colors.push(color);
        }

        // ✅ 기존 색상 이름을 유지하면서 새로운 색상 이름 추가
        let newColorName = selectedColorNames[color] || color;
        targetPreset.colorNames[newColorName] = color;
      });
    } else if (newPresetName) {
      // ✅ 새 프리셋 생성 후 저장
      if (presets.some((preset) => preset.name === newPresetName)) {
        alert(chrome.i18n.getMessage("already_existed_preset_name"));
        return;
      }

      presets.push(newPreset);
    } else {
      alert(chrome.i18n.getMessage("select_or_enter_new_preset_name"));
      return;
    }

    // ✅ 프리셋 저장 후 업데이트
    chrome.storage.sync.set({ colorPresets: presets }, () => {
      selectedColors.clear();
      selectedColorNames = {}; // ✅ 저장 후 색상 이름 초기화
      updateSelectedColorsPreview();
      resetButtons();

      presetNameInput.value = "";

      // ✅ popup_default.html 업데이트
      chrome.runtime.sendMessage({ action: "updatePresets" });

      // ✅ 새 프리셋을 select 태그에 즉시 추가
      let newOption = document.createElement("option");
      newOption.value = newPreset.id;
      newOption.innerText = newPreset.name;
      presetDropdown.appendChild(newOption);

      resetPresetFormState();

      alert(chrome.i18n.getMessage("save_colors_into_preset_alert"));
    });
  });
}

function resetPresetFormState() {
  let presetSelect = document.getElementById("presetDropdown");
  let presetSelectSave = document.getElementById("saveSelectedColors");
  let presetInput = document.getElementById("newPresetName");
  let presetInputSave = document.getElementById("saveSelectedNewPresetColors");
  presetSelect.disabled = false;
  presetSelectSave.disabled = false;
  presetInput.disabled = false;
  presetInputSave.disabled = false;
  presetSelect.value = "";
  presetInput.value = "";
}

// ✅ 색상 선택/해제 기능 (이름 입력 지원)
function toggleColorSelection(color, button, inputField) {
  if (selectedColors.has(color)) {
    selectedColors.delete(color);
    delete selectedColorNames[(inputField && inputField.value.trim()) || color]; // ✅ 입력된 이름도 제거
    button.classList.remove("selected");
    button.innerText = chrome.i18n.getMessage("select_color");
  } else {
    selectedColors.add(color);
    selectedColorNames[(inputField && inputField.value.trim()) || color] =
      color; // ✅ "이름": "색상코드" 형태로 저장
    button.classList.add("selected");
    button.innerText = chrome.i18n.getMessage("selected_color");
  }

  updateSelectedColorsPreview();
}

// ✅ 버튼 상태 초기화
function resetButtons() {
  document.querySelectorAll(".color-box-container button").forEach((button) => {
    button.classList.remove("selected");
    button.innerText = chrome.i18n.getMessage("select_color");
  });
}

// ✅ 선택한 색상 미리보기 업데이트
function updateSelectedColorsPreview() {
  let selectedColorsContainer = document.getElementById("selectedColorsList");
  selectedColorsContainer.innerHTML = "";

  selectedColors.forEach((color) => {
    let colorContainer = document.createElement("div");
    colorContainer.classList.add("selected-color-list-container");

    let colorInformation = document.createElement("div");
    colorInformation.classList.add("selected-color-information");

    let colorBox = document.createElement("div");
    colorBox.classList.add("selected-color");
    colorBox.style.backgroundColor = color;

    let colorInput = document.createElement("input");
    colorInput.classList.add("hex-text");
    colorInput.type = "text";
    colorInput.value = selectedColorNames[color] || color; // ✅ 기본값은 HEX 코드
    colorInput.addEventListener("input", (event) => {
      selectedColorNames[color] = event.target.value.trim() || color;
    });

    let removeBtn = document.createElement("button");
    removeBtn.classList.add("remove-btn");
    removeBtn.innerText = "X";
    removeBtn.onclick = () => {
      selectedColors.delete(color);
      delete selectedColorNames[color]; // ✅ 삭제 시 이름도 제거

      updateSelectedColorsPreview();

      // ✅ 그룹 내 해당 색상 버튼만 찾아서 선택 해제
      const colorButtons = document.querySelectorAll(".color-box-container");
      colorButtons.forEach((container) => {
        const colorBox = container.querySelector(".color-box");
        const button = container.querySelector("button");
        if (!colorBox || !button) return;

        const containerColor = rgbTohex(
          getComputedStyle(colorBox).backgroundColor
        );
        if (containerColor.toUpperCase() === color.toUpperCase()) {
          button.classList.remove("selected");
          button.innerText = chrome.i18n.getMessage("select_color");
        }
      });
    };

    colorInformation.appendChild(colorBox);
    colorInformation.appendChild(colorInput);
    colorContainer.appendChild(colorInformation);
    colorContainer.appendChild(removeBtn);

    selectedColorsContainer.appendChild(colorContainer);
  });
}

function extractDominantColorsStrictFromImageData(
  imageData,
  width,
  height,
  topN = 10,
  minRatio = 0.003,
  mergeThreshold = 2
) {
  const totalPixels = width * height;
  const frequencyMap = {};

  // ✅ 모든 픽셀 하나하나 읽기
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];

    if (a === 0) continue; // 투명한 픽셀 무시

    const hex = `#${r.toString(16).padStart(2, "0")}${g
      .toString(16)
      .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

    frequencyMap[hex] = (frequencyMap[hex] || 0) + 1;
  }

  // ✅ 출현 비율 기준 필터
  let filtered = Object.entries(frequencyMap)
    .filter(([hex, count]) => count / totalPixels >= minRatio)
    .map(([hex, count]) => ({ hex, count }));

  const result = [];

  if (filtered.length !== 0) {
    // 👉 정상 루트
    filtered.sort((a, b) => b.count - a.count);

    filtered.forEach(({ hex, count }) => {
      const rgb = hexToRgbArray(hex);
      const isSimilar = result.find(({ hex: existingHex }) => {
        const d = rgbDistance(rgb, hexToRgbArray(existingHex));
        return d < mergeThreshold;
      });

      if (!isSimilar) {
        result.push({ hex, count });
      }
    });

    result.sort((a, b) => {
      const aHsl = hexToHsl(a.hex);
      const bHsl = hexToHsl(b.hex);

      if (bHsl.l !== aHsl.l) {
        return bHsl.l - aHsl.l; // 밝기(l) 내림차순
      } else {
        return aHsl.s - bHsl.s; // 밝기 같으면 채도(s) 오름차순
      }
    }); // ✅ 병합 이후에도 다시 빈도수 정렬

    return result.slice(0, topN).map(({ hex }) => hex);
  } else {
    // 👉 대안 루트: RGB 양자화 후 병합
    const quantizedMap = {};

    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      if (a === 0) continue;

      const [qr, qg, qb] = quantizeRgb([r, g, b], 16);
      const qHex = `#${qr.toString(16).padStart(2, "0")}${qg
        .toString(16)
        .padStart(2, "0")}${qb.toString(16).padStart(2, "0")}`;

      quantizedMap[qHex] = (quantizedMap[qHex] || 0) + 1;
    }

    const sorted = Object.entries(quantizedMap)
      .map(([hex, count]) => ({ hex, count }))
      .sort((a, b) => b.count - a.count);

    sorted.forEach(({ hex, count }) => {
      const rgb = hexToRgbArray(hex);
      const isSimilar = result.find(({ hex: existingHex }) => {
        const d = rgbDistance(rgb, hexToRgbArray(existingHex));
        return d < mergeThreshold;
      });

      if (!isSimilar) {
        result.push({ hex, count });
      }
    });

    result.sort((a, b) => {
      const ah = hexToHsl(a.hex);
      const bh = hexToHsl(b.hex);

      if (Math.abs(bh.l - ah.l) > 0.01) {
        return bh.l - ah.l;
      } else if (Math.abs(b.count - a.count) > 0) {
        return b.count - a.count;
      } else {
        return ah.s - bh.s;
      }
    });

    return result.slice(0, topN).map(({ hex }) => hex);
  }
}

function rgbDistance(rgb1, rgb2) {
  return Math.sqrt(
    Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2)
  );
}

function hexToRgbArray(hex) {
  hex = hex.replace(/^#/, "");
  const bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r) {
      h = (g - b) / d + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else if (max === b) {
      h = (r - g) / d + 4;
    }
    h /= 6;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return [h, s, v];
}

function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function quantizeColor(hex, levels = 16) {
  const rgb = hexToRgbArray(hex);
  const factor = 256 / levels;
  const qr = Math.floor(rgb[0] / factor) * factor;
  const qg = Math.floor(rgb[1] / factor) * factor;
  const qb = Math.floor(rgb[2] / factor) * factor;
  return rgbToHex([qr, qg, qb]);
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  const bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function hexToHsl(hex) {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h, s, l;
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
    h /= 6;
  }

  return { h, s, l }; // 0~1 범위
}

function quantizeRgb([r, g, b], levels = 16) {
  const factor = 256 / levels;
  const qr = Math.floor(r / factor) * factor;
  const qg = Math.floor(g / factor) * factor;
  const qb = Math.floor(b / factor) * factor;
  return [qr, qg, qb];
}

function renderColorList(colors, container) {
  container.innerHTML = ""; // 기존 내용 비움

  colors.forEach((color) => {
    const colorBoxContainer = document.createElement("div");
    colorBoxContainer.classList.add("color-box-container");

    const colorInfoContainer = document.createElement("div");
    colorInfoContainer.classList.add("color-info-container");

    const colorBox = document.createElement("div");
    colorBox.classList.add("color-box");
    colorBox.style.backgroundColor = color;

    const rgb = hexToRgb(color);
    const rgbText = `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

    const textBox = document.createElement("div");
    textBox.classList.add("color-text");
    textBox.innerText = `${color}\n${rgbText}`;

    colorInfoContainer.appendChild(colorBox);
    colorInfoContainer.appendChild(textBox);

    const saveBtn = document.createElement("button");
    saveBtn.innerText = chrome.i18n.getMessage("select_color");
    saveBtn.classList.add("color-select-btn");
    saveBtn.onclick = () => toggleColorSelection(color, saveBtn);

    colorBoxContainer.appendChild(colorInfoContainer);
    colorBoxContainer.appendChild(saveBtn);
    container.appendChild(colorBoxContainer);
  });
}

function sortColorGroupsByFrequency(colorClusters, extractedColors) {
  // HEX → 빈도수 매핑 생성
  const frequencyMap = {};
  extractedColors.forEach((hex) => {
    frequencyMap[hex] = (frequencyMap[hex] || 0) + 1;
  });

  // 각 그룹별 총 등장 횟수 계산
  const sorted = colorClusters
    .map((cluster) => {
      const totalFrequency = cluster.reduce((sum, hex) => {
        return sum + (frequencyMap[hex] || 0);
      }, 0);
      return { cluster, totalFrequency };
    })
    .sort((a, b) => b.totalFrequency - a.totalFrequency) // 내림차순 정렬
    .map((entry) => entry.cluster);

  return sorted;
}
