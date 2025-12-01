document.querySelectorAll("[data-include]").forEach(async (el) => {
  let file = el.getAttribute("data-include");
  let response = await fetch(file);
  let content = await response.text();
  el.innerHTML = content;
});

function startMarquee() {
  const boxes = document.querySelectorAll(".marquee-box");

  boxes.forEach((box) => {
    const content = box.querySelector(".marquee-content");

    const boxHeight = box.offsetHeight;
    const contentHeight = content.scrollHeight;

    // Calculate duration based on content height for smooth scrolling
    const duration = (contentHeight / 50) * 1000; // Adjust 50 for speed

    // Set initial position
    content.style.transform = `translateY(${boxHeight}px)`;

    // Apply CSS animation
    content.style.animation = `marquee ${duration}ms linear infinite`;

    // Pause on hover
    box.addEventListener("mouseenter", () => {
      content.style.animationPlayState = "paused";
    });

    box.addEventListener("mouseleave", () => {
      content.style.animationPlayState = "running";
    });
  });
}

window.onload = startMarquee;
