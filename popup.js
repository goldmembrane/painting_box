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
        let { colorClusters, grayscaleColors } =
          separateGrayscaleAndGroupByGMMImproved(data.extractedColors);

        const sortedClusters = sortColorGroupsByFrequency(
          colorClusters,
          data.extractedColors
        );

        // ✅ 정렬된 그룹 순서대로 출력
        sortedClusters.forEach((group, index) => {
          group.sort(); // 그룹 내부는 오름차순
          createColorGroup(`색상 그룹 ${index + 1}`, group, colorContainer);
        });

        // ✅ 흑백 계열 색상 표시 (정렬 적용)
        if (grayscaleColors.length > 0) {
          grayscaleColors.sort(); // ✅ 오름차순 정렬
          createColorGroup("흑백 계열", grayscaleColors, colorContainer);
        }
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
          button.innerText = "선택";
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

// ✅ 색상 분리 및 GMM + Mahalanobis + BIC
function separateGrayscaleAndGroupByGMMImproved(colors) {
  const grayscaleColors = new Set();
  const colorColors = [];

  colors.forEach((hex) => {
    if (isStrictGrayscale(hex)) {
      grayscaleColors.add(hex);
    } else {
      colorColors.push(hex);
    }
  });

  // ✅ 흑백 색상이 컬러 그룹에 중복되는 걸 방지
  const colorClusters = clusterWithGMMImproved(colorColors);

  // ✅ 클러스터 내에서도 중복 제거
  const filteredColorClusters = colorClusters
    .map((cluster) => {
      const uniqueSet = new Set(
        cluster.filter((hex) => !grayscaleColors.has(hex))
      );
      return Array.from(uniqueSet);
    })
    .filter((cluster) => cluster.length > 0);

  return {
    colorClusters: filteredColorClusters,
    grayscaleColors: Array.from(grayscaleColors),
  };
}

function isStrictGrayscale(hex) {
  const lab = labFromRgbHex(hex);
  const [L, a, b] = lab;

  const lowLight = L < 20;
  const highLight = L > 99;
  const nearGray = Math.abs(a) < 2 && Math.abs(b) < 2;

  return lowLight || highLight || nearGray;
}

function labFromRgbHex(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

// ✅ 클러스터링 with BIC
function clusterWithGMMImproved(hexColors) {
  const data = hexColors.map((hex) => labFromRgbHex(hex));
  let bestBIC = Infinity;
  let bestClusters = [];
  let bestMeans = [];

  for (let k = 2; k <= Math.min(20, data.length); k++) {
    const { clusters, means } = gmmCluster(data, k);
    const bic = computeBIC(data, clusters, means);

    if (bic < bestBIC) {
      bestBIC = bic;
      bestClusters = clusters;
      bestMeans = means;
    }
  }

  return bestClusters.map((cluster) => cluster.map((lab) => labToHex(lab)));
}

// ✅ GMM 클러스터링
function gmmCluster(data, k) {
  const means = [];
  for (let i = 0; i < k; i++) {
    means.push(data[Math.floor(Math.random() * data.length)]);
  }

  let clusters = [];
  for (let iter = 0; iter < 10; iter++) {
    clusters = Array.from({ length: k }, () => []);
    data.forEach((point) => {
      let minDist = Infinity;
      let index = 0;
      means.forEach((mean, i) => {
        const d = mahalanobis(point, mean);
        if (d < minDist) {
          minDist = d;
          index = i;
        }
      });
      clusters[index].push(point);
    });

    means.forEach((_, i) => {
      if (clusters[i].length > 0) {
        means[i] = average(clusters[i]);
      }
    });
  }

  return { clusters, means };
}

// ✅ Mahalanobis Distance
function mahalanobis(x, mean) {
  const diff = x.map((val, i) => val - mean[i]);
  const cov = identityMatrix(x.length, 0.01); // regularized
  const inv = inverse(cov);
  const result = multiply(multiplyMatrixVector(inv, diff), diff);
  return Math.sqrt(result);
}

// ✅ 평균
function average(points) {
  const len = points.length;
  const sum = points[0].map((_, i) => points.reduce((acc, p) => acc + p[i], 0));
  return sum.map((s) => s / len);
}

// ✅ BIC 계산
function computeBIC(data, clusters, means) {
  const n = data.length;
  const k = clusters.length;
  const d = data[0].length;

  let logLikelihood = 0;
  clusters.forEach((cluster, i) => {
    const mean = means[i];
    cluster.forEach((point) => {
      const dist = mahalanobis(point, mean);
      logLikelihood += -0.5 * dist ** 2;
    });
  });

  const numParams = k * (d + 0.5 * d * (d + 1));
  return -2 * logLikelihood + numParams * Math.log(n);
}

// ✅ 유틸 함수들
function hexToRgb(hex) {
  hex = hex.replace(/^#/, "");
  const bigint = parseInt(hex, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
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

  return [h, s, l];
}

function labFromRgbHex(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function labToHex([l, a, b]) {
  const [x, y, z] = labToXyz(l, a, b);
  const [r, g, b_] = xyzToRgb(x, y, z);
  return rgbToHex([r, g, b_]);
}

function rgbToHex([r, g, b]) {
  return (
    "#" +
    [r, g, b]
      .map((v) => {
        const hex = Math.round(Math.min(255, Math.max(0, v)) * 255).toString(
          16
        );
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function rgbTohex(rgbString) {
  const rgb = rgbString.match(/\d+/g).map(Number);
  return (
    "#" +
    rgb
      .map((val) => val.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function multiply(vec1, vec2) {
  return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => multiply(row, vector));
}

function identityMatrix(size, epsilon = 0) {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 + epsilon : 0))
  );
}

function inverse(matrix) {
  const size = matrix.length;
  const identity = identityMatrix(size);
  const inv = matrix.map((row) => row.slice());

  for (let i = 0; i < size; i++) {
    let diag = inv[i][i];
    if (diag === 0) diag = 1e-8;
    for (let j = 0; j < size; j++) {
      inv[i][j] = inv[i][j] / diag;
      identity[i][j] = identity[i][j] / diag;
    }
    for (let k = 0; k < size; k++) {
      if (k !== i) {
        const factor = inv[k][i];
        for (let j = 0; j < size; j++) {
          inv[k][j] -= factor * inv[i][j];
          identity[k][j] -= factor * identity[i][j];
        }
      }
    }
  }
  return identity;
}

// ✅ XYZ & LAB 변환
function rgbToXyz(r, g, b) {
  [r, g, b] = [r, g, b].map((v) =>
    v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92
  );
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
  return [x, y, z];
}

function xyzToLab(x, y, z) {
  [x, y, z] = [x / 0.95047, y / 1.0, z / 1.08883].map((t) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  );
  const l = 116 * y - 16;
  const a = 500 * (x - y);
  const b = 200 * (y - z);
  return [l, a, b];
}

function labToXyz(l, a, b) {
  let y = (l + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  [x, y, z] = [x, y, z].map((t) => {
    const t3 = t ** 3;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  });
  return [x * 0.95047, y * 1.0, z * 1.08883];
}

function xyzToRgb(x, y, z) {
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let b = x * 0.0557 + y * -0.204 + z * 1.057;
  return [r, g, b];
}

// 밝기 기준
function sortColorsByLightness(hexColors) {
  return hexColors
    .map((hex) => ({ hex, l: labFromRgbHex(hex)[0] })) // L 값 추출
    .sort((a, b) => a.l - b.l) // 밝은 → 어두운 순
    .map((c) => c.hex);
}

// ✅ 색상 그룹 UI 생성
function createColorGroup(title, colors, container) {
  const colorButtons = [];

  let groupContainer = document.createElement("div");
  groupContainer.classList.add("color-group");

  let header = document.createElement("div");
  header.classList.add("group-header");

  const sortedColors = sortColorsByLightness(colors);

  let colorPreview = document.createElement("div");
  colorPreview.classList.add("color-preview");
  colorPreview.style.backgroundColor = sortedColors[0];

  let titleElement = document.createElement("span");
  titleElement.innerText = title;

  // ✅ [추가] 전체 선택 버튼
  const selectAllBtn = document.createElement("button");
  selectAllBtn.className = "select-all-button";
  selectAllBtn.innerText = "전체 선택";

  selectAllBtn.onclick = () => {
    const allSelected = colorButtons.every(({ color }) =>
      selectedColors.has(color)
    );

    colorButtons.forEach(({ color, button }) => {
      const isSelected = selectedColors.has(color);
      if (allSelected && isSelected) {
        // 전체 선택된 상태 → 전체 해제
        toggleColorSelection(color, button);
      } else if (!allSelected && !isSelected) {
        // 아직 선택되지 않은 경우만 선택
        toggleColorSelection(color, button);
      }
    });
  };

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

  colorListContainer.appendChild(selectAllBtn);

  sortedColors.forEach((color) => {
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
    saveBtn.classList.add("color-select-btn");
    saveBtn.onclick = () => toggleColorSelection(color, saveBtn);

    colorButtons.push({ color, button: saveBtn });

    colorBoxContainer.appendChild(colorInfoContainer);
    colorBoxContainer.appendChild(saveBtn);
    colorListContainer.appendChild(colorBoxContainer);
  });

  groupContainer.appendChild(colorListContainer);
  container.appendChild(groupContainer);
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
