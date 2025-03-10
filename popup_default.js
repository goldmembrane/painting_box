// ✅ crypto-js를 동적으로 불러오기 (Manifest V3 호환)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("libs/crypto-js.min.js"); // 로컬에서 로드
script.onload = () => {
  console.log("✅ crypto-js 로드 완료!");
};
document.head.appendChild(script);

let isSubscribed = false;

// ✅ 구독 상태 확인 함수
function checkSubscriptionStatus() {
  chrome.storage.sync.get(["isSubscribed"], (data) => {
    isSubscribed = data.isSubscribed || false;
  });
}

// ✅ AES-256 암호화를 위한 키 (보안을 위해 저장하지 않고, 서버에서 받아오는 것이 일반적)
const encryptionKey = "painted_box_1_20"; // 32바이트 키 (보안 필요)

document.addEventListener("DOMContentLoaded", () => {
  loadPresets();
  checkSubscriptionStatus();
  document
    .getElementById("toggleEditMode")
    .addEventListener("click", toggleEditMode);
  document
    .getElementById("backToList")
    .addEventListener("click", showPresetList);
});

let selectedPresetIndex = null;
let isEditing = false; // ✅ 현재 이름 변경 모드 여부
let colorNameChanges = {}; // ✅ 변경된 색상 이름을 임시 저장하는 객체

// ✅ `chrome.storage.onChanged` 리스너 추가 (자동 업데이트)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.colorPresets) {
    console.log("📢 프리셋 변경 감지, 업데이트 수행");
    loadPresets();
  }
});

// ✅ 프리셋을 저장하는 기능 (이름을 지정하여 저장)
document.getElementById("savePreset").addEventListener("click", () => {
  let presetName = document.getElementById("presetName").value.trim();

  if (!presetName) {
    alert("프리셋 이름을 입력하세요!");
    return;
  }

  chrome.storage.local.get(["colorPresets", "selectedColors"], (data) => {
    let presets = data.colorPresets || [];
    let selectedColors = Array.from(data.selectedColors || []);

    // ✅ 동일한 프리셋 이름이 있는지 확인
    if (presets.some((preset) => preset.name === presetName)) {
      alert("이미 존재하는 프리셋 이름입니다. 다른 이름을 입력하세요.");
      return;
    }

    // ✅ 구독이 없고 프리셋 개수가 2개 이상이면 제한
    if (!isSubscribed && presets.length >= 1) {
      alert(
        "❌ 구독이 필요합니다! 구독을 하면 2개 이상의 프리셋을 생성할 수 있습니다!"
      );
      return;
    }

    let newPreset = {
      id: Date.now(),
      name: presetName,
      colors: selectedColors,
    };

    presets.push(newPreset);
    chrome.storage.local.set({ colorPresets: presets }, () => {
      console.log("✅ 새로운 프리셋 저장 완료:", newPreset);
      loadPresets();
      document.getElementById("presetName").value = ""; // 입력 필드 초기화
      alert(`"${presetName}" 프리셋이 생성되었습니다!`);
    });
  });
});

// ✅ 저장된 프리셋 불러오기 및 UI 업데이트
function loadPresets() {
  chrome.storage.local.get(["colorPresets"], (data) => {
    let presetContainer = document.getElementById("presetList");
    presetContainer.innerHTML = "";

    if (data.colorPresets && data.colorPresets.length > 0) {
      data.colorPresets.forEach((preset, presetIndex) => {
        let presetItemContainer = document.createElement("div");
        presetItemContainer.classList.add("preset-item-container");

        let presetDiv = document.createElement("div");
        presetDiv.classList.add("preset-item");
        presetDiv.dataset.presetIndex = presetIndex;

        // ✅ 프리셋 제목
        let presetTitle = document.createElement("strong");
        presetTitle.innerText = preset.name;

        // ✅ 색상 미리보기 추가
        let colorPreviewContainer = document.createElement("div");
        colorPreviewContainer.classList.add("color-list-container");

        // ✅ `colorNames` 객체에서 이름과 HEX 코드 가져오기
        Object.entries(preset.colorNames || {}).forEach(([name, hex]) => {
          let colorPreview = document.createElement("div");
          colorPreview.classList.add("color-preview");
          colorPreview.style.backgroundColor = hex;

          let colorName = document.createElement("span");
          colorName.classList.add("color-name");
          colorName.innerText = name || "이름 없음"; // ✅ 색상 이름 표시

          let colorItem = document.createElement("div");
          colorItem.classList.add("preset-preview");
          colorItem.appendChild(colorPreview);
          colorItem.appendChild(colorName);

          colorPreviewContainer.appendChild(colorItem);
        });

        // ✅ 프리셋 클릭 시 상세보기 모드 활성화
        presetDiv.addEventListener("click", () => {
          selectedPresetIndex = presetIndex;
          showPresetDetails(presetIndex);
        });

        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "삭제";
        deleteBtn.onclick = () => deletePreset(preset.id);

        // ✅ "코드로 보내기" 버튼 추가
        let encryptBtn = document.createElement("button");
        encryptBtn.innerText = "코드로 보내기";
        encryptBtn.onclick = () => encryptAndCopyToClipboard(preset);

        presetDiv.appendChild(presetTitle);
        presetDiv.appendChild(colorPreviewContainer);
        presetItemContainer.appendChild(presetDiv);
        presetItemContainer.appendChild(encryptBtn);
        presetItemContainer.appendChild(deleteBtn);
        presetContainer.appendChild(presetItemContainer);
      });
    } else {
      presetContainer.innerHTML = "<p>저장된 프리셋이 없습니다.</p>";
    }
  });
}

// ✅ 프리셋 상세보기 모드 표시
function showPresetDetails(presetIndex) {
  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[presetIndex];

    document.getElementById("presetTitle").innerText = preset.name;
    let colorList = document.getElementById("colorList");
    colorList.innerHTML = "";

    preset.colors.forEach((color) => {
      let colorDiv = document.createElement("div");
      colorDiv.classList.add("color-item");

      let colorBox = document.createElement("div");
      colorBox.classList.add("color-box");
      colorBox.style.backgroundColor = color;

      let colorNameInput = document.createElement("input");
      colorNameInput.classList.add("color-name-input");
      colorNameInput.type = "text";
      colorNameInput.placeholder = "이름 입력";
      colorNameInput.dataset.color = color;
      colorNameInput.disabled = true; // 기본적으로 비활성화

      // ✅ 저장된 색상 이름 불러오기
      let storedName = preset.colorNames ? preset.colorNames[color] : "";
      colorNameInput.value = storedName || "";

      // ✅ 입력된 이름을 임시 저장 객체에 저장
      colorNameInput.addEventListener("input", (event) => {
        let colorHex = event.target.dataset.color;
        let newName = event.target.value;
        colorNameChanges[colorHex] = newName;
      });

      colorDiv.appendChild(colorBox);
      colorDiv.appendChild(colorNameInput);
      colorList.appendChild(colorDiv);
    });

    document.getElementById("presetList").classList.add("hidden");
    document.getElementById("presetDetails").classList.remove("hidden");
    document.getElementById("toggleEditMode").innerText = "이름 변경"; // ✅ 초기 버튼 상태
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
    button.innerText = "이름 변경";
  } else {
    // ✅ 편집 모드 활성화
    inputs.forEach((input) => {
      input.disabled = false;
      input.style.display = "inline-block"; // 입력 필드 표시
    });
    button.innerText = "저장";
  }

  isEditing = !isEditing;
}

// ✅ 변경된 색상 이름을 저장
function savePresetColorNames() {
  if (selectedPresetIndex === null) return;

  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[selectedPresetIndex];

    if (!preset.colorNames) {
      preset.colorNames = {};
    }

    Object.keys(colorNameChanges).forEach((colorHex) => {
      preset.colorNames[colorHex] = colorNameChanges[colorHex];
    });

    // ✅ 변경된 데이터 저장
    chrome.storage.local.set({ colorPresets: presets }, () => {
      console.log(
        `✅ 프리셋 ${selectedPresetIndex}의 색상 이름이 저장되었습니다.`
      );
      alert("✅ 색상 이름이 저장되었습니다!");
      colorNameChanges = {}; // ✅ 저장 후 임시 데이터 초기화
    });
  });
}

// ✅ 프리셋 목록으로 돌아가기
function showPresetList() {
  document.getElementById("presetList").classList.remove("hidden");
  document.getElementById("presetDetails").classList.add("hidden");
}

// ✅ 프리셋 삭제 기능
function deletePreset(presetId) {
  chrome.storage.local.get("colorPresets", (data) => {
    let presets = data.colorPresets || [];
    let updatedPresets = presets.filter((preset) => preset.id !== presetId);
    chrome.storage.local.set({ colorPresets: updatedPresets }, () => {
      loadPresets();
    });
  });
}

// ✅ HEX 색상 및 색상 이름 리스트를 AES-256으로 암호화하는 함수
function encryptColorsWithAES(preset) {
  let colorData = {}; // ✅ 색상 이름 + HEX 코드 저장용 객체

  preset.colors.forEach((color) => {
    let colorName = preset.colorNames?.[color] || color; // 저장된 색상 이름이 없으면 HEX 코드 사용
    colorData[colorName] = color; // { "빨강": "#FF0000", "초록": "#00FF00" } 형식으로 저장
  });

  let jsonString = JSON.stringify(colorData);
  let encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  return encrypted;
}

// ✅ 암호화 후 input 필드에 표시하고 클립보드에 복사하는 함수
function encryptAndCopyToClipboard(preset) {
  let encryptedCode = encryptColorsWithAES(preset);

  let inputField = document.getElementById("encryptedCode");
  inputField.value = encryptedCode; // ✅ input 필드에 암호화된 코드 표시

  // ✅ 클립보드에 복사
  navigator.clipboard
    .writeText(encryptedCode)
    .then(() => {
      alert("🔒 암호화된 코드가 복사되었습니다!");
    })
    .catch((err) => {
      console.error("❌ 클립보드 복사 실패:", err);
    });
}

// ✅ AES-256 암호화된 데이터를 복호화하는 함수
function decryptColorsWithAES(encryptedString) {
  try {
    let bytes = CryptoJS.AES.decrypt(encryptedString, encryptionKey);
    let decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("❌ 복호화 오류:", error);
    return null;
  }
}

// ✅ 복호화 후 프리셋으로 저장하는 함수
document.getElementById("decodeAndSave").addEventListener("click", () => {
  let encryptedCode = document
    .getElementById("encryptedCodeInput")
    .value.trim();

  if (!encryptedCode) {
    alert("🔐 복호화할 코드를 입력하세요!");
    return;
  }

  let decryptedColors = decryptColorsWithAES(encryptedCode);

  if (!decryptedColors || Object.keys(decryptedColors).length === 0) {
    alert("❌ 올바른 암호화 코드가 아닙니다!");
    return;
  }

  // ✅ 색상 HEX 코드만 추출하여 colors 배열 생성
  let colorsArray = Object.values(decryptedColors);
  let colorNamesObject = decryptedColors; // `{ "이름": "HEX 코드" }` 구조 유지

  // ✅ 새로운 프리셋 이름 설정 (자동 생성)
  let newPresetName = `복호화 프리셋 ${Date.now()}`;

  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];

    let newPreset = {
      id: Date.now(),
      name: newPresetName,
      colors: colorsArray, // HEX 코드 리스트
      colorNames: colorNamesObject, // ✅ 이름 포함된 색상 데이터
    };

    presets.push(newPreset);
    chrome.storage.local.set({ colorPresets: presets }, () => {
      console.log(
        `✅ 복호화된 프리셋 "${newPresetName}" 저장 완료:`,
        newPreset
      );
      loadPresets();
      document.getElementById("encryptedCodeInput").value = ""; // 입력 필드 초기화
      alert(`"${newPresetName}" 프리셋이 저장되었습니다!`);
    });
  });
});
