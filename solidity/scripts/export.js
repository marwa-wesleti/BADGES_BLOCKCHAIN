// Copie le contrat compile (bytecode + ABI) dans les ressources du projet Java.
// Le projet Java n'a ainsi pas besoin de Node.js : il lit simplement ces deux fichiers.
const fs = require("fs");
const path = require("path");

const artifact = require("../artifacts/contracts/BadgeRegistry.sol/BadgeRegistry.json");
const target = path.join(__dirname, "..", "..", "src", "main", "resources", "contracts");

fs.mkdirSync(target, { recursive: true });
fs.writeFileSync(path.join(target, "BadgeRegistry.bin"), artifact.bytecode.replace(/^0x/, ""));
fs.writeFileSync(path.join(target, "BadgeRegistry.abi.json"), JSON.stringify(artifact.abi, null, 2));

console.log("Exporte vers " + target);
console.log("  BadgeRegistry.bin      : " + (artifact.bytecode.length - 2) / 2 + " octets de bytecode");
console.log("  BadgeRegistry.abi.json : " + artifact.abi.filter((x) => x.type === "function").length + " fonctions");
