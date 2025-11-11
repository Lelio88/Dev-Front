// exo3 Worker
console.log("Worker : coucou");
addEventListener("message", (message) => {
    if (message.data.commande === "multiplier") {
        calculNb(message.data.nb1, message.data.nb2);
    }
});

function calculNb(nb1, nb2) {
    const result = nb1 * nb2;
    console.log("Worker : " + nb1 + "," + nb2 + " reçu ");
    postMessage({ resultat: result });
    self.close();
}
