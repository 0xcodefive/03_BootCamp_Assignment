const PvC = document.getElementById("PvC");
const PvP = document.getElementById("PvP");

function main() {
  PvC.addEventListener("click", function () {
    location.href = "/pvc_game.html";
  });

  PvP.addEventListener("click", function () {
    location.href = "/pvp_game.html";
  });
}
main();
