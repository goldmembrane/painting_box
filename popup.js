let selectedColors = new Set(); // ✅ 선택된 색상을 저장할 Set
let selectedColorNames = {};

let isSubscribed = false;

// ✅ 구독 상태 확인 함수
function checkSubscriptionStatus() {
  chrome.storage.sync.get(["isSubscribed"], (data) => {
    isSubscribed = data.isSubscribed || false;
    const subscriptionBanner = document.getElementById("subscriptionBanner");

    // if (!isSubscribed) {
    //   subscriptionBanner.classList.remove("hidden"); // ✅ 구독이 필요하면 배너 표시
    // } else {
    //   subscriptionBanner.classList.add("hidden"); // ✅ 구독 중이면 배너 숨김
    // }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  checkSubscriptionStatus();
  chrome.storage.local.get(
    ["capturedImage", "extractedColors", "colorPresets", "darkMode"],
    (data) => {
      let imageContainer = document.getElementById("capturedImageContainer");
      let colorContainer = document.getElementById("colorList");
      let presetDropdown = document.getElementById("presetDropdown");

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
        imageContainer.innerText = "캡처된 이미지 없음";
      }

      if (data.extractedColors && data.extractedColors.length > 0) {
        let { grayscaleColors, colorClusters } =
          separateGrayscaleAndGroupByCosine(data.extractedColors, 0.99); // ✅ 더 엄격한 유사도 적용

        // ✅ 흑백 계열 색상 표시 (정렬 적용)
        if (grayscaleColors.length > 0) {
          grayscaleColors.sort(); // ✅ 오름차순 정렬
          createColorGroup("흑백 계열", grayscaleColors, colorContainer);
        }

        // ✅ 컬러 그룹 표시
        colorClusters.forEach((group, index) => {
          group.sort(); // ✅ 그룹 내 색상 오름차순 정렬
          createColorGroup(`색상 그룹 ${index + 1}`, group, colorContainer);
        });
      } else {
        colorContainer.innerText = "추출된 색상 없음";
      }

      // ✅ 프리셋 목록 불러오기
      if (data.colorPresets && data.colorPresets.length > 0) {
        data.colorPresets.forEach((preset) => {
          let option = document.createElement("option");
          option.value = preset.id;
          option.innerText = preset.name;
          presetDropdown.appendChild(option);
        });
      }
    }
  );

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
    alert("저장할 색상을 선택하세요!");
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

  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];

    if (selectedPresetId) {
      // ✅ 기존 프리셋에 색상 추가 (이름 포함)
      let targetPreset = presets.find(
        (preset) => preset.id == selectedPresetId
      );
      if (!targetPreset) {
        alert("선택한 프리셋을 찾을 수 없습니다.");
        return;
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
        alert("이미 존재하는 프리셋 이름입니다. 다른 이름을 입력하세요.");
        return;
      }

      if (!isSubscribed && presets.length >= 1) {
        const banner = document.getElementById("subscriptionBanner");
        banner.classList.remove("hidden"); // ✅ 배너 표시

        // ✅ 10초 후 배너 자동 숨김
        setTimeout(() => {
          banner.classList.add("hidden");
        }, 10000); // 10초 후 실행 (10000ms)
        return;
      }

      presets.push(newPreset);
    } else {
      alert("프리셋을 선택하거나 새 프리셋 이름을 입력하세요.");
      return;
    }

    // ✅ 프리셋 저장 후 업데이트
    chrome.storage.local.set({ colorPresets: presets }, () => {
      console.log("✅ 프리셋 저장 완료:", presets);
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

      alert("색상이 프리셋에 저장되었습니다!");
    });
  });
}

// ✅ 색상 선택/해제 기능 (이름 입력 지원)
function toggleColorSelection(color, button, inputField) {
  if (selectedColors.has(color)) {
    selectedColors.delete(color);
    delete selectedColorNames[(inputField && inputField.value.trim()) || color]; // ✅ 입력된 이름도 제거
    button.classList.remove("selected");
    button.innerText = "선택";
  } else {
    selectedColors.add(color);
    selectedColorNames[(inputField && inputField.value.trim()) || color] =
      color; // ✅ "이름": "색상코드" 형태로 저장
    button.classList.add("selected");
    button.innerText = "선택됨";
  }

  updateSelectedColorsPreview();
}

// ✅ 버튼 상태 초기화
function resetButtons() {
  document.querySelectorAll(".color-box-container button").forEach((button) => {
    button.classList.remove("selected");
    button.innerText = "선택";
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
      resetButtons();
    };

    colorInformation.appendChild(colorBox);
    colorInformation.appendChild(colorInput);
    colorContainer.appendChild(colorInformation);
    colorContainer.appendChild(removeBtn);

    selectedColorsContainer.appendChild(colorContainer);
  });
}

// ✅ 더욱 정밀한 흑백 계열 분리 및 코사인 유사도로 그룹화
function separateGrayscaleAndGroupByCosine(colors, similarityThreshold = 0.98) {
  let grayscaleColors = [];
  let colorColors = [];

  colors.forEach((hex) => {
    let rgb = hexToRgb(hex);
    let hsl = rgbToHsl(rgb);

    // ✅ 채도(S) ≤ 0.2이면 회색 계열도 포함하여 흑백 계열로 분류
    if (hsl[1] <= 0.2) {
      grayscaleColors.push(hex);
    } else {
      colorColors.push(hex);
    }
  });

  // ✅ 컬러만 코사인 유사성으로 그룹화
  let colorClusters = groupByCosineSimilarity(colorColors, similarityThreshold);

  return { grayscaleColors, colorClusters };
}

// ✅ 코사인 유사도를 기반으로 색상 그룹화
function groupByCosineSimilarity(colors, similarityThreshold = 0.98) {
  let rgbColors = colors.map(hexToRgb);
  let clusters = [];

  while (rgbColors.length > 0) {
    let baseColor = rgbColors.shift();
    let baseHex = rgbToHex(baseColor);
    let cluster = [baseHex];

    rgbColors = rgbColors.filter((color) => {
      let similarity = cosineSimilarity(baseColor, color);
      if (similarity > similarityThreshold) {
        // ✅ 유사도 0.98 이상인 색상만 같은 그룹으로
        cluster.push(rgbToHex(color));
        return false;
      }
      return true;
    });

    clusters.push(cluster);
  }

  return clusters.filter((cluster) => cluster.length > 0);
}

// ✅ 코사인 유사도 계산
function cosineSimilarity(rgb1, rgb2) {
  let dotProduct = rgb1[0] * rgb2[0] + rgb1[1] * rgb2[1] + rgb1[2] * rgb2[2];
  let magnitude1 = Math.sqrt(rgb1[0] ** 2 + rgb1[1] ** 2 + rgb1[2] ** 2);
  let magnitude2 = Math.sqrt(rgb2[0] ** 2 + rgb2[1] ** 2 + rgb2[2] ** 2);
  return dotProduct / (magnitude1 * magnitude2);
}

// ✅ HEX → RGB 변환
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  let bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

// ✅ RGB → HEX 변환
function rgbToHex(rgb) {
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// ✅ RGB → HSL 변환 (흑백 계열 판별에 사용)
function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // 무채색
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
    h /= 6;
  }

  return [h, s, l];
}

// ✅ 색상 그룹을 생성하는 함수 (UI 업데이트)
function createColorGroup(title, colors, container) {
  let groupContainer = document.createElement("div");
  groupContainer.classList.add("color-group");

  let header = document.createElement("div");
  header.classList.add("group-header");

  let colorPreview = document.createElement("div");
  colorPreview.classList.add("color-preview");
  colorPreview.style.backgroundColor = colors[0];

  let titleElement = document.createElement("span");
  titleElement.innerText = title;

  let toggleButton = document.createElement("button");
  toggleButton.innerHTML = "▼";
  toggleButton.classList.add("toggle-button");
  toggleButton.onclick = () => {
    if (colorListContainer.style.display === "none") {
      colorListContainer.style.display = "flex";
      toggleButton.innerText = "▲";
    } else {
      colorListContainer.style.display = "none";
      toggleButton.innerText = "▼";
    }
  };

  header.appendChild(colorPreview);
  header.appendChild(titleElement);
  header.appendChild(toggleButton);
  groupContainer.appendChild(header);

  let colorListContainer = document.createElement("div");
  colorListContainer.classList.add("color-list-container");
  colorListContainer.style.display = "none";

  colors.forEach((color) => {
    let colorBoxContainer = document.createElement("div");
    colorBoxContainer.classList.add("color-box-container");

    let colorInfoContainer = document.createElement("div");
    colorInfoContainer.classList.add("color-info-container");

    let colorBox = document.createElement("div");
    colorBox.classList.add("color-box");
    colorBox.style.backgroundColor = color;

    let rgb = hexToRgb(color);
    let rgbText = `RGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

    let textBox = document.createElement("div");
    textBox.classList.add("color-text");
    textBox.innerText = `${color}\n${rgbText}`;

    colorInfoContainer.appendChild(colorBox);
    colorInfoContainer.appendChild(textBox);

    let saveBtn = document.createElement("button");
    saveBtn.innerText = "선택";
    saveBtn.onclick = () => toggleColorSelection(color, saveBtn);

    colorBoxContainer.appendChild(colorInfoContainer);
    colorBoxContainer.appendChild(saveBtn);
    colorListContainer.appendChild(colorBoxContainer);
  });

  groupContainer.appendChild(colorListContainer);
  container.appendChild(groupContainer);
}

// 비즈니스 로직
// local -> 구글 계정 연동
// 프리셋 갯수 제한: 1개 -> 20개(추후 수정 가능)
