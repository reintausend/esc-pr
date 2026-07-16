/*
  Finish screen: "Start Over" returns to the start screen immediately;
  as an installation idle fallback the page also redirects on its own
  after AUTO_REDIRECT_MS.
*/

const AUTO_REDIRECT_MS = 30_000;

function startOver() {
  window.location.href = "index.html";
}

document.addEventListener("fr:action", (event) => {
  if (event.detail.action === "start-over") {
    startOver();
  }
});

setTimeout(startOver, AUTO_REDIRECT_MS);
