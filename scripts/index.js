const PvC = document.getElementById("PvC");
const PvP = document.getElementById("PvP");

function main() {
  PvC.addEventListener("click", function () {
    location.href = "/PvC/pvc_game.html";
  });

  PvP.addEventListener("click", function () {
    location.href = "/PvP/pvp_game.html";
  });
}
main();
