// ✅ crypto-js를 동적으로 불러오기 (Manifest V3 호환)
const script = document.createElement("script");
script.src = chrome.runtime.getURL("libs/crypto-js.min.js"); // 로컬에서 로드
script.onload = () => {
  console.log("✅ crypto-js 로드 완료!");
};
document.head.appendChild(script);

let isSubscribed = false;

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

        console.log("✅ 구글 이메일:", email);
        console.log("✅ 구독 상태:", isSubscribed);

        // ✅ 저장
        chrome.storage.sync.set({ isSubscribed, userEmail: email });

        // ✅ 구독 배너 보여주기 여부
        const subscriptionBanner =
          document.getElementById("subscriptionBanner");

        if (!isSubscribed) {
          subscriptionBanner.classList.remove("hidden"); // ✅ 구독이 필요하면 배너 표시
          setTimeout(() => {
            subscriptionBanner.classList.add("show");
            subscriptionBanner.classListadd("shifted");
          }, 500);

          setTimeout(() => {
            subscriptionBanner.classList.remove("show");
            subscriptionBanner.classList.remove("shifted");
            setTimeout(() => {
              subscriptionBanner.classList.add("hidden");
            }, 500);
          }, 5000);
        } else {
          subscriptionBanner.classList.add("hidden"); // ✅ 구독 중이면 배너 숨김
        }
      } else {
        console.warn("❌ 응답 실패:", response.error);
      }
    }
  );
}

// ✅ AES-256 암호화를 위한 키 (보안을 위해 저장하지 않고, 서버에서 받아오는 것이 일반적)
const encryptionKey = "painted_box_1_20"; // 32바이트 키 (보안 필요)

const SECRET_KEY = "palette_box_unknown";

const SECRET_SUB_KEY = "palette_box_subscription_palette";

// ✅ AES 암호화 함수
function encryptEmail(email) {
  const encrypted = CryptoJS.AES.encrypt(email, SECRET_KEY).toString();
  return encodeURIComponent(encrypted);
}

function encryptSubId(subId) {
  const encrypted = CryptoJS.AES.encrypt(subId, SECRET_SUB_KEY).toString();
  return encodeURIComponent(encrypted);
}

document.addEventListener("DOMContentLoaded", () => {
  loadPresets();
  fetchSubscriptionStatusFromBackground();
  document
    .getElementById("toggleEditMode")
    .addEventListener("click", toggleEditMode);

  document.getElementById("subscribe_prompt").textContent =
    chrome.i18n.getMessage("subscribe_prompt");

  document.getElementById("subscribeNow").textContent =
    chrome.i18n.getMessage("subscribe_button");

  document.getElementById("app_name").textContent =
    chrome.i18n.getMessage("app_name");

  document.getElementById("new_preset").textContent =
    chrome.i18n.getMessage("new_preset");

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
    chrome.i18n.getMessage("edit_names");

  document.getElementById("sendToCode").textContent =
    chrome.i18n.getMessage("export_code_button");

  function updateSubscriptionUI() {
    chrome.storage.sync.get(["isSubscribed"], (data) => {
      const isSubscribed = data.isSubscribed;

      const subscribeBtn = document.getElementById("subscribeBtn");
      const unsubscribeBtn = document.getElementById("unsubscribeBtn");

      if (isSubscribed) {
        subscribeBtn.classList.add("hidden");
        unsubscribeBtn.classList.remove("hidden");
      } else {
        subscribeBtn.classList.remove("hidden");
        unsubscribeBtn.classList.add("hidden");
      }
    });
  }

  document.getElementById("openSettingsBtn").addEventListener("click", () => {
    document.getElementById("presetContainer").classList.add("hidden");
    document.getElementById("settingsScreen").classList.remove("hidden");
    document.getElementById("navBarMain").classList.add("hidden");
    document.getElementById("navBarSetting").classList.remove("hidden");
    updateSubscriptionUI();
  });

  // ✅ + 버튼을 눌렀을 때 화면 및 네비게이션 변경
  document.getElementById("addPresetBtn").addEventListener("click", () => {
    document.getElementById("presetContainer").classList.add("hidden");
    document.getElementById("newPresetScreen").classList.remove("hidden");
    document.getElementById("navBarMain").classList.add("hidden");
    document.getElementById("navBarNewPreset").classList.remove("hidden");
  });

  // ✅ 뒤로 가기 버튼 클릭 시 메인 화면으로 전환
  document.getElementById("backToMain").addEventListener("click", () => {
    document.getElementById("newPresetScreen").classList.add("hidden");
    document.getElementById("presetContainer").classList.remove("hidden");
    document.getElementById("navBarNewPreset").classList.add("hidden");
    document.getElementById("navBarMain").classList.remove("hidden");
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
    });

  // 구독하기 버튼 클릭
  document.getElementById("subscribeBtn").addEventListener("click", () => {
    chrome.storage.sync.get(["userEmail"], (data) => {
      const email = data.userEmail;
      console.log(email);

      if (!email) {
        alert("구글 계정 정보가 없습니다. 로그인 상태를 확인해주세요.");
        return;
      }

      const encryptedEmail = encryptEmail(email);
      const subscribeUrl = `http://localhost:3002?e=${encryptedEmail}`;

      // ✅ 새 탭으로 구독 페이지 열기
      window.open(subscribeUrl, "_blank");
    });
  });

  // 구독 취소하기 버튼 클릭
  document
    .getElementById("unsubscribeBtn")
    .addEventListener("click", async () => {
      const confirmCancel = confirm("정말 구독을 취소하시겠습니까?");
      if (!confirmCancel) return;

      chrome.storage.sync.get(["subscriptionId"], async (data) => {
        const subId = data.subscriptionId;

        const encryptSubscriptionId = encryptSubId(subId);
        const subscribePageUrl = `http://localhost:3002?e=${encryptSubscriptionId}`;

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
  } else {
    footer.classList.remove("dark-mode-footer");
    document.querySelectorAll("textarea").forEach((textarea) => {
      textarea.classList.remove("dark-mode-textarea");
    });
    document.querySelectorAll("input").forEach((input) => {
      input.classList.remove("dark-mode-input");
    });
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
    console.log("📢 프리셋 변경 감지, 업데이트 수행");
    loadPresets();
  }
});

// ✅ 프리셋을 저장하는 기능 (이름을 지정하여 저장)
document.getElementById("savePreset").addEventListener("click", () => {
  let presetName = document.getElementById("newPresetName").value.trim();

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
      const banner = document.getElementById("subscriptionBanner");
      banner.classList.remove("hidden"); // ✅ 배너 표시
      setTimeout(() => {
        banner.classList.add("show");
        banner.classList.add("shifted");
      }, 500);

      // ✅ 10초 후 배너 자동 숨김
      setTimeout(() => {
        banner.classList.remove("show");
        banner.classList.remove("shifted");
        setTimeout(() => {
          banner.classList.add("hidden");
        }, 500);
      }, 5000); // 5초 후 실행 (5000ms)
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

      // ✅ 저장 후 메인 화면으로 돌아감
      document.getElementById("newPresetScreen").classList.add("hidden");
      document.getElementById("presetContainer").classList.remove("hidden");
      document.getElementById("navBarNewPreset").classList.add("hidden");
      document.getElementById("navBarMain").classList.remove("hidden");
      document.getElementById("newPresetName").value = ""; // 입력 필드 초기화
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
        codeTextarea.style.width = "270px";
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

        presetDiv.appendChild(presetHeader);
        presetDiv.appendChild(colorStrip);
        presetDiv.appendChild(encryptBtn);
        presetDiv.appendChild(codeContainer);
        presetDiv.appendChild(colorPreviewContainer);
        presetItemContainer.appendChild(presetDiv);
        presetContainer.appendChild(presetItemContainer);
      });
    } else {
      presetContainer.innerHTML = "<p>저장된 프리셋이 없습니다.</p>";
    }
  });
}

// ✅ 프리셋 상세보기 모드 표시
function showPresetDetails(presetIndex) {
  document.getElementById("navBarMain").classList.add("hidden");
  document.getElementById("navBarDetail").classList.remove("hidden");
  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];
    let preset = presets[presetIndex];

    document.getElementById("presetDetailTitle").innerText = preset.name;
    let colorList = document.getElementById("colorList");
    colorList.style.paddingBottom = "70px";
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
      colorNameInput.placeholder = "이름 입력";
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
    button.innerText = chrome.i18n.getMessage("edit_names");

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

  chrome.storage.local.get(["colorPresets"], (data) => {
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
  document.getElementById("navBarMain").classList.remove("hidden");
  document.getElementById("navBarDetail").classList.add("hidden");

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

  Object.entries(preset.colorNames || {}).forEach(([name, hex]) => {
    let colorName = name || hex; // 저장된 색상 이름이 없으면 HEX 코드 사용
    colorData[colorName] = hex; // { "빨강": "#FF0000", "초록": "#00FF00" } 형식으로 저장
  });

  let jsonString = JSON.stringify(colorData);
  let encrypted = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
  return encrypted;
}

// ✅ 암호화 후 input 필드에 표시하고 클립보드에 복사하는 함수
function encryptAndCopyToClipboard(
  preset,
  codeContainer,
  codeTextarea,
  toggleCodeBtn
) {
  if (codeContainer.style.display === "none") {
    let encryptedCode = encryptColorsWithAES(preset);
    codeTextarea.value = encryptedCode;
    codeContainer.classList.remove("hidden"); // ✅ 코드 컨테이너 보이기
    codeContainer.style.display = "block"; // ✅ display 속성 추가

    // ✅ 버튼 텍스트 변경
    toggleCodeBtn.innerText = chrome.i18n.getMessage("hide_code");

    // ✅ 클립보드에 복사
    navigator.clipboard
      .writeText(encryptedCode)
      .then(() => {
        alert("🔒 암호화된 코드가 복사되었습니다!");
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

  chrome.storage.local.get(["colorPresets"], (data) => {
    let preset = data.colorPresets[selectedPresetIndex];
    let encryptedCode = encryptColorsWithAES(preset);

    // ✅ 클립보드에 복사
    navigator.clipboard
      .writeText(encryptedCode)
      .then(() => {
        alert("🔒 암호화된 코드가 복사되었습니다!");
      })
      .catch((err) => {
        console.error("❌ 클립보드 복사 실패:", err);
      });
  });
});

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
  let presetName = document.getElementById("importPresetName").value.trim();
  let encryptedCode = document
    .getElementById("encryptedCodeInput")
    .value.trim();

  if (!presetName || !encryptedCode) {
    alert("프리셋 이름과 암호화된 코드를 입력하세요!");
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

  chrome.storage.local.get(["colorPresets"], (data) => {
    let presets = data.colorPresets || [];

    if (presets.some((preset) => preset.name === presetName)) {
      alert("이미 존재하는 프리셋 이름입니다. 다른 이름을 입력하세요.");
      return;
    }

    let newPreset = {
      id: Date.now(),
      name: presetName,
      colors: colorsArray, // HEX 코드 리스트
      colorNames: colorNamesObject, // ✅ 이름 포함된 색상 데이터
    };

    presets.push(newPreset);
    chrome.storage.local.set({ colorPresets: presets }, () => {
      console.log(`✅ 복호화된 프리셋 "${presetName}" 저장 완료:`, newPreset);
      loadPresets();
      document.getElementById("newPresetScreen").classList.add("hidden");
      document.getElementById("presetContainer").classList.remove("hidden");
      document.getElementById("navBarNewPreset").classList.add("hidden");
      document.getElementById("navBarMain").classList.remove("hidden");
      document.getElementById("importPresetName").value = "";
      document.getElementById("encryptedCodeInput").value = ""; // 입력 필드 초기화
      alert(`"${presetName}" 프리셋이 가져와졌습니다!`);
    });
  });
});

// ✅ 구독 버튼 클릭 시 이벤트 처리
document.getElementById("subscribeNow").addEventListener("click", () => {
  // ✅ 구글 이메일 정보 가져오기
  chrome.storage.sync.get(["userEmail"], (data) => {
    const email = data.userEmail;
    console.log(email);

    if (!email) {
      alert("구글 계정 정보가 없습니다. 로그인 상태를 확인해주세요.");
      return;
    }

    const encryptedEmail = encryptEmail(email);
    const subscribeUrl = `http://localhost:3002?e=${encryptedEmail}`;

    // ✅ 새 탭으로 구독 페이지 열기
    window.open(subscribeUrl, "_blank");
  });
});
