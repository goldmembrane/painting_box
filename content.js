document.addEventListener("click", (event) => {
  event.preventDefault(); //기본 클릭 동작 방지

  let element = event.target;
  let elementStyle = window.getComputedStyle(element);

  let textColor = elementStyle.color;
  let backgroundColor = elementStyle.backgroundColor;

  console.log("클릭한 요소 정보");
  console.log("태그명: ", element.tagName);
  console.log("ID: ", element.id || "없음");
  console.log("textcolor: ", rgbaToHexa(textColor) || "없음");
  console.log("bgColor: ", rgbaToHexa(backgroundColor) || "없음");
});

function rgbaToHexa(rgba) {
  let rgbaArray = rgba.match(/\d+(\.\d+)?/g);
  if (!rgbaArray || rgbaArray.length < 3) return "Invalid RGBA";

  let r = parseInt(rgbaArray[0]).toString(16).padStart(2, "0");
  let g = parseInt(rgbaArray[1]).toString(16).padStart(2, "0");
  let b = parseInt(rgbaArray[2]).toString(16).padStart(2, "0");
  let a =
    rgbaArray.legnth === 4
      ? Math.round(parseFloat(rgbaArray[3]) * 255)
          .toString(16)
          .padStart(2, "0")
      : "";

  return a && a != "ff"
    ? `#${r}${g}${b}${a}`.toUpperCase()
    : `#${r}${g}${b}`.toUpperCase();
}
