window.startColorSelection = function () {
  let isDragging = true;
  let startX, startY;
  let selectionBox = null;

  // ✅ 전체 화면 덮는 오버레이 생성
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.cursor = "crosshair"; // ✅ 커서 지정
  overlay.style.zIndex = "9998";
  overlay.style.backgroundColor = "rgba(0,0,0,0)"; // 완전 투명
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onMouseDown, true);
  overlay.addEventListener("mousemove", onMouseMove, true);
  overlay.addEventListener("mouseup", onMouseUp, true);

  let startPageX, startPageY; // 박스 표시용
  let startClientX, startClientY; // 캡처용

  function onMouseDown(event) {
    if (!isDragging) return;

    event.preventDefault();

    startPageX = event.pageX;
    startPageY = event.pageY;
    startClientX = event.clientX;
    startClientY = event.clientY;

    // ✅ 선택 영역 박스 생성
    if (!selectionBox) {
      selectionBox = document.createElement("div");
      selectionBox.style.position = "absolute";
      selectionBox.style.pointerEvents = "none"; // ✅ 선택 영역 내에서도 이벤트 차단
      selectionBox.style.border = "1px dashed gray";
      selectionBox.style.zIndex = "9999";
      document.body.appendChild(selectionBox);
    }

    selectionBox.style.left = `${startPageX}px`;
    selectionBox.style.top = `${startPageY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
  }

  function onMouseMove(event) {
    if (!isDragging || !selectionBox) return;

    event.preventDefault();

    const currentPageX = event.pageX;
    const currentPageY = event.pageY;

    let width = currentPageX - startPageX;
    let height = currentPageY - startPageY;

    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
    selectionBox.style.left = `${Math.min(startPageX, currentPageX)}px`;
    selectionBox.style.top = `${Math.min(startPageY, currentPageY)}px`;
  }

  function onMouseUp(event) {
    if (!isDragging) return;

    event.preventDefault();

    const endClientX = event.clientX;
    const endClientY = event.clientY;

    // ✅ 마우스 이벤트 원상 복구
    stopSelectionMode();

    // ✅ 선택된 영역을 전달
    chrome.runtime.sendMessage({
      action: "captureScreen",
      area: {
        x1: startClientX,
        y1: startClientY,
        x2: endClientX,
        y2: endClientY,
      },
    });

    // ✅ 선택 박스 제거
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }

    if (overlay) {
      overlay.remove();
    }
  }

  function stopSelectionMode() {
    document.body.style.pointerEvents = "auto";
    document.body.style.cursor = "default";

    document.removeEventListener("mousedown", onMouseDown, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("mouseup", onMouseUp, true);
    document.removeEventListener("click", preventDefault, true);
    document.removeEventListener("contextmenu", preventDefault, true);
    document.removeEventListener("wheel", preventDefault, { passive: false });
  }

  function preventDefault(event) {
    event.preventDefault();
    event.stopPropagation();
  }
};

window.extractColorsFromImage = function (imageSrc, x1, y1, x2, y2) {
  if (
    !imageSrc ||
    typeof imageSrc !== "string" ||
    !imageSrc.startsWith("data:image/png;base64")
  ) {
    console.error("❌ [ERROR] 올바르지 않은 이미지 데이터:", imageSrc);
    return;
  }

  let img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = imageSrc;

  img.onload = () => {
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    // ✅ drawImage에서 직접 캡쳐된 범위만 그리기
    ctx.drawImage(
      img,
      x1,
      y1,
      width,
      height, // 소스 이미지의 잘라낼 부분
      0,
      0,
      width,
      height // 캔버스에 그릴 위치
    );

    const imageDataUrl = canvas.toDataURL("image/png");

    chrome.runtime.sendMessage(
      {
        action: "saveExtractedColors",
        image: imageDataUrl,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ [ERROR] popup.html 실행 실패:",
            chrome.runtime.lastError.message
          );
        } else if (response && response.success) {
          console.log("✅ popup.html 실행 성공");
        } else {
          console.error("❌ [ERROR] popup.html 실행 실패: 알 수 없는 오류");
        }
      }
    );
  };
};
