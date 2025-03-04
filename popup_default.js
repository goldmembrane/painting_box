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

        presetDiv.appendChild(presetTitle);
        presetDiv.appendChild(colorPreview);
        presetDiv.appendChild(deleteBtn);
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
