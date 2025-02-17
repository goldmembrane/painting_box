document.getElementById("startPicker").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "startColorPicker" });
  window.close();
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.close();
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("pickedColor", (data) => {
    if (data.pickedColor) {
      document.getElementById("colorPreview").style.backgroundColor =
        data.pickedColor;
      document.getElementById("colorCode").innerText = data.pickedColor;
    }
  });

  document.getElementById("startPicker").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "startColorPicker" });
  });
});
