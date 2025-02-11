document.addEventListener("click", (event) => {
  event.preventDefault(); //기본 클릭 동작 방지

  let element = event.target;
  let elementStyle = window.getComputedStyle(element);

  let textColor = elementStyle.color;
  let backgroundColor = elementStyle.backgroundColor;

  console.log("클릭한 요소 정보");
  console.log("태그명: ", element.tagName);
  console.log("ID: ", element.id || "없음");
  console.log("textcolor: ", textColor || "없음");
  console.log("bgColor: ", backgroundColor || "없음");
});
