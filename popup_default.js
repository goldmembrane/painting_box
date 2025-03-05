// ✅ crypto-js를 동적으로 불러오기 (Manifest V3 호환)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("libs/crypto-js.min.js"); // 로컬에서 로드
script.onload = () => {
  console.log("✅ crypto-js 로드 완료!");
};
document.head.appendChild(script);

// ✅ AES-256 암호화를 위한 키 (보안을 위해 저장하지 않고, 서버에서 받아오는 것이 일반적)
const encryptionKey = "painted_box_1_20"; // 32바이트 키 (보안 필요)

document.addEventListener("DOMContentLoaded", () => {
  loadPresets();
});

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
      data.colorPresets.forEach((preset) => {
        let presetDiv = document.createElement("div");
        presetDiv.classList.add("preset-item");

        let presetTitle = document.createElement("h3");
        presetTitle.innerText = preset.name;

        let colorPreview = document.createElement("div");
        colorPreview.classList.add("color-preview");

        preset.colors.forEach((color) => {
          let colorBox = document.createElement("div");
          colorBox.classList.add("color-box");
          colorBox.style.backgroundColor = color;
          colorPreview.appendChild(colorBox);
        });

        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "삭제";
        deleteBtn.onclick = () => deletePreset(preset.id);

        // ✅ "코드로 보내기" 버튼 추가
        let encryptBtn = document.createElement("button");
        encryptBtn.innerText = "코드로 보내기";
        encryptBtn.onclick = () => encryptAndCopyToClipboard(preset.colors);

        presetDiv.appendChild(presetTitle);
        presetDiv.appendChild(colorPreview);
        presetDiv.appendChild(deleteBtn);
        presetDiv.appendChild(encryptBtn);
        presetContainer.appendChild(presetDiv);
      });
    } else {
      presetContainer.innerHTML = "<p>저장된 프리셋이 없습니다.</p>";
    }
  });
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

// ✅ HEX 색상 리스트를 AES-256으로 암호화하는 함수
function encryptColorsWithAES(colors) {
  let jsonString = JSON.stringify(colors);
  let encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  return encrypted;
}

// ✅ 암호화 후 input 필드에 표시하고 클립보드에 복사하는 함수
function encryptAndCopyToClipboard(colors) {
  let encryptedCode = encryptColorsWithAES(colors);

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
