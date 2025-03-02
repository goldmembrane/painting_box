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

function loadPresets() {
  chrome.storage.local.get(["colorPresets"], (data) => {
    let presetContainer = document.getElementById("presetList");
    presetContainer.innerHTML = "";

    if (data.colorPresets && data.colorPresets.length > 0) {
      data.colorPresets.forEach((color) => {
        let presetDiv = document.createElement("div");
        presetDiv.classList.add("preset-item");

        let colorInformationBox = document.createElement("div");
        colorInformationBox.classList.add("color-information");

        let colorBox = document.createElement("div");
        colorBox.classList.add("color-box");
        colorBox.style.backgroundColor = color.color;

        let hexText = document.createElement("span");
        hexText.classList.add("hex-text");
        hexText.innerText = color.hexCode;

        let deleteBtn = document.createElement("button");
        deleteBtn.innerText = "삭제";
        deleteBtn.onclick = () => deletePreset(color.color);

        presetDiv.appendChild(colorInformationBox);
        colorInformationBox.appendChild(colorBox);
        colorInformationBox.appendChild(hexText);
        presetDiv.appendChild(deleteBtn);
        presetContainer.appendChild(presetDiv);
      });
    } else {
      presetContainer.innerHTML = "<p>저장된 프리셋이 없습니다.</p>";
    }
  });
}

function deletePreset(color) {
  chrome.storage.local.get("colorPresets", (data) => {
    let presets = data.colorPresets || [];
    let updatedPresets = presets.filter((c) => c.color !== color);
    chrome.storage.local.set({ colorPresets: updatedPresets }, () => {
      loadPresets();
    });
  });
}
