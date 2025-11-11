// calcul-long Worker
console.log("Worker : coucou");
addEventListener("message", (message) => {
    if (message.data.commande === "calculer") {
        calculNb(message.data.nbUpTo);
    }
});

function calculNb(nbUpTo) {
    console.log("Worker : calcul lancé");
    const start = "start";
    postMessage({ start: start });
    let res = 0;
    for (let i = 0; i < nbUpTo; i++) res += i;
    postMessage({ resultat: res });
    self.close();
}