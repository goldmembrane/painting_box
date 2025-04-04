// ✅ Google OAuth2 인증을 사용하여 이메일 가져오기
function getGoogleAccountEmail(callback) {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError || !token) {
      console.error("❌ 인증 토큰 가져오기 실패:", chrome.runtime.lastError);
      callback(null);
      return;
    }

    fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.email) {
          console.log("✅ Google 계정 이메일 가져오기 성공:", data.email);
          callback(data.email);
        } else {
          console.error("❌ 이메일 정보를 가져오지 못했습니다.");
          callback(null);
        }
      })
      .catch((error) => {
        console.error("❌ Google API 요청 실패:", error);
        callback(null);
      });
  });
}
// ✅ 백엔드 서버에 구독 상태 확인 요청
function checkSubscriptionStatus(email, callback) {
  fetch(`http://localhost:3000/subscription-status/${email}`)
    .then((res) => res.json())
    .then((data) => {
      let isSubscribed = data.isSubscribed || false;
      chrome.storage.sync.set(
        {
          isSubscribed: isSubscribed,
          subscriptionId: data.subscriptionId,
          userEmail: email,
        },
        () => {
          callback(isSubscribed);
        }
      );
    })
    .catch((error) => {
      console.error("❌ 구독 상태 확인 오류:", error);
      callback(false);
    });
}

// ✅ 확장 프로그램이 실행될 때 구독 상태 확인
chrome.runtime.onInstalled.addListener(() => {
  getGoogleAccountEmail((email) => {
    if (email) {
      checkSubscriptionStatus(email, (isSubscribed) => {
        console.log(
          `📢 ${email} 사용자의 구독 상태: ${
            isSubscribed ? "✅ 활성" : "❌ 비활성"
          }`
        );
      });
    }
  });
});

chrome.action.onClicked.addListener(() => {
  chrome.action.setPopup({ popup: "popup_default.html" });
});

// 확장 프로그램의 백그라운드 동작 구현
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "pickColor",
    title: "색 추출 모드",
    contexts: ["all"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "pickColor") {
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        files: ["content.js"],
      },
      () => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.startColorSelection(), // ✅ `content.js`에서 함수 실행
        });
      }
    );
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "captureScreen") {
    chrome.permissions.request({ permissions: ["tabs"] }, (granted) => {
      if (!granted) {
        console.error("❌ [ERROR] tabs 권한 요청 거부됨.");
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) {
          console.error("❌ [ERROR] 활성 탭 없음.");
          sendResponse({ success: false, error: "활성 탭 없음." });
          return;
        }

        let activeTabId = tabs[0].id;

        chrome.tabs.captureVisibleTab(null, { format: "png" }, (imageSrc) => {
          console.log("📢 [DEBUG] 캡처된 이미지 데이터:", imageSrc);

          if (chrome.runtime.lastError || !imageSrc) {
            console.error(
              "❌ [ERROR] 화면 캡처 실패:",
              chrome.runtime.lastError?.message || "이미지 없음"
            );
            sendResponse({ success: false, error: "captureVisibleTab() 실패" });
            return;
          }

          let { x1, y1, x2, y2 } = message.area;

          chrome.scripting.executeScript(
            {
              target: { tabId: activeTabId },
              files: ["content.js"], // 🔹 content.js를 로드해야 extractColorsFromImage를 실행할 수 있음
            },
            () => {
              chrome.scripting.executeScript({
                target: { tabId: activeTabId },
                func: (imageSrc, x1, y1, x2, y2) => {
                  window.extractColorsFromImage(imageSrc, x1, y1, x2, y2);
                },
                args: [imageSrc, x1, y1, x2, y2],
              });
            }
          );

          sendResponse({ success: true, image: imageSrc });
        });
      });
    });

    return true;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveExtractedColors") {
    chrome.storage.sync.set(
      {
        extractedColors: message.colors,
        capturedImage: message.image,
        popupMode: "colorPicker",
      },
      () => {
        console.log("✅ 색상 데이터 저장 완료");

        console.log("색상 데이터: ", message.colors);

        // ✅ 저장이 완료된 후 popup.html 실행
        chrome.windows.create(
          {
            url: chrome.runtime.getURL("popup.html"),
            type: "popup",
            width: 675,
            height: 600,
          },
          () => {
            sendResponse({ success: true }); // ✅ 응답을 보내서 message port가 닫히지 않도록 함
          }
        );
      }
    );

    return true; // ✅ 비동기 응답을 사용하기 위해 `return true;` 필요
  } else if (message.action === "updatePresets") {
    chrome.storage.sync.get(["colorPresets"], (data) => {
      sendResponse({ presets: data.colorPresets });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
});

// ✅ popup이 이메일/구독 상태를 요청할 때 응답해주는 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getSubscriptionStatus") {
    getGoogleAccountEmail((email) => {
      if (!email) {
        sendResponse({ success: false, error: "No email" });
        return;
      }

      checkSubscriptionStatus(email, (isSubscribed) => {
        sendResponse({
          success: true,
          isSubscribed,
          email,
        });
      });
    });

    return true; // 비동기 응답을 위해 true 필요
  }
});
