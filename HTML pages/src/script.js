document.querySelectorAll("[data-include]").forEach(async (el) => {
  let file = el.getAttribute("data-include");
  let response = await fetch(file);
  let content = await response.text();
  el.innerHTML = content;
});

function startMarquee() {
  const box = document.querySelector(".marquee-box");
  const content = document.querySelector(".marquee-content");

  const boxHeight = box.offsetHeight;
  const contentHeight = content.scrollHeight;

  function animate() {
    content.style.top = boxHeight + "px";

    // total distance it needs to travel
    const totalDistance = boxHeight + contentHeight;

    const duration = totalDistance * 20; // speed control

    content.animate(
      [{ top: boxHeight + "px" }, { top: -contentHeight + "px" }],
      {
        duration: duration,
        easing: "linear",
      }
    ).onfinish = animate;
  }

  animate();
}

window.onload = startMarquee;
