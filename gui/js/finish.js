/*
  Finish screen: "Start Over" returns to the start screen immediately;
  as an installation idle fallback the page also redirects on its own
  after AUTO_REDIRECT_MS.
*/
import { initBlackBar, rememberBlackBar } from "./black-bar.js";

const AUTO_REDIRECT_MS = 30_000;

initBlackBar(document.getElementById("black-bar"), 24);

function startOver() {
  rememberBlackBar(24);
  window.location.href = "index.html";
}

document.addEventListener("fr:action", (event) => {
  if (event.detail.action === "start-over") {
    startOver();
  }
});

setTimeout(startOver, AUTO_REDIRECT_MS);
