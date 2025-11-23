// --- DATI E VARIABILI GLOBALI ---
const NUM_SPECIE_INIZIALI = 172620; 
const NUM_SPECIE_A_RISCHIO = 34208; // Numero totale di pallini da far apparire (le specie minacciate)
const NUM_SPECIE_FINALI = NUM_SPECIE_INIZIALI - NUM_SPECIE_A_RISCHIO;

// --- Dati per l'Animazione Graduale (7 secondi) ---
let tempoInizioAnimazione; 
const DURATA_ANIMAZIONE_TOTALE_MS = 7000; // 7 secondi totali come richiesto (era 8)

let specieMinacciateApparse = []; 
let indiceProssimaSpecie = 0; 
let isCountdownAnimating = false; 
let isPhraseTwoDisplayed = true; // Stato per distinguere il primo click (lettura) dal secondo (animazione)
let animationComplete = false;

// Riferimenti DOM
let h1Element; 
let backgroundElement; 
let arrowNext;
let arrowPrev;
let textOverlay;

// Frasi visualizzate:
const frasi = [
    "Le specie viventi<br>conosciute nel mondo sono<br>2.140.000",
    // Usiamo gli span per poterli manipolare separatamente con il CSS/JS
    `<span id='descriptive-text'>Tra queste, finora è stato possibile<br>studiarne e catalogarne</span><br><span id='animated-number'>${NUM_SPECIE_INIZIALI.toLocaleString('it-IT')}</span>`, 
];

let indiceFrase = 0;

// --------------------------------------------------------------------------------
// SEZIONE P5.JS (Funzioni di base e Logica di Easing)
// --------------------------------------------------------------------------------

/**
 * Funzione di Easing Power 5 (Slow-Start/Fast-End).
 * Questa curva è molto lenta all'inizio, poi accelera rapidamente verso la fine.
 * Perfetta per l'effetto "prima un pallino, poi tutti gli altri velocemente".
 * @param {number} t - Tempo normalizzato (0 a 1).
 * @returns {number} Valore di easing (0 a 1).
 */
function powerEasing(t) {
    // Usiamo t^5 per un effetto di slow-in molto pronunciato.
    return t * t * t * t * t; 
}

/**
 * Funzione di setup di P5.js. Viene eseguita una sola volta.
 */
function setup() {
    // Crea il canvas e lo nasconde inizialmente
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.style('z-index', '2'); 
    canvas.position(0, 0); 
    canvas.elt.style.display = 'none'; 
}

/**
 * Funzione di loop di P5.js. Eseguita 60 volte al secondo.
 */
function draw() {
    // MODIFICA CRITICA: Usiamo clear() invece di background() per rendere il canvas trasparente
    // Questo permette all'immagine di sfondo HTML (sfocata e con filtro verde) di essere visibile
    clear(); 
    
    if (isCountdownAnimating) {
        
        // --- LOGICA DI ANIMAZIONE GRADUALE (Curva Power 5) ---
        const tempoCorrente = millis();
        const tempoTrascorso = tempoCorrente - tempoInizioAnimazione;
        
        // Normalizza il tempo trascorso (da 0 a 1)
        let tempoNormalizzato = constrain(tempoTrascorso / DURATA_ANIMAZIONE_TOTALE_MS, 0, 1);
        
        // Applica l'easing Power 5
        const curvaEasing = powerEasing(tempoNormalizzato);
        
        // Calcola il numero totale di pallini che *dovrebbero* essere apparsi finora
        const targetCount = floor(NUM_SPECIE_A_RISCHIO * curvaEasing);
        
        // Calcola quanti pallini rilasciare in questo frame
        let numToRelease = targetCount - indiceProssimaSpecie;

        // Controlla se il tempo è scaduto
        if (tempoTrascorso >= DURATA_ANIMAZIONE_TOTALE_MS) {
            numToRelease = NUM_SPECIE_A_RISCHIO - indiceProssimaSpecie;
            isCountdownAnimating = false; 
            animationComplete = true;
        }
        
        // Rilascia i pallini nel canvas
        for (let i = 0; i < numToRelease; i++) {
            if (indiceProssimaSpecie < NUM_SPECIE_A_RISCHIO) {
                aggiungiSpecieMinacciata();
            }
        }
        
        // Se l'animazione è terminata e tutti i pallini sono stati aggiunti
        if (animationComplete && specieMinacciateApparse.length === NUM_SPECIE_A_RISCHIO) {
             // Aggiorna il numero finale nel DOM (la differenza esatta)
             const numSpan = h1Element.querySelector('#animated-number');
             if (numSpan) {
                 numSpan.innerHTML = NUM_SPECIE_FINALI.toLocaleString('it-IT');
             }
             arrowNext.classList.add('visible'); // Riabilita la navigazione
        }

        // Aggiorna il testo del countdown nel DOM in tempo reale
        if (h1Element) {
            const numSpan = h1Element.querySelector('#animated-number');
            if (numSpan) {
                const currentDisplayedCount = NUM_SPECIE_INIZIALI - specieMinacciateApparse.length; 
                // Assicura che il conteggio non scenda sotto il finale
                if (currentDisplayedCount >= NUM_SPECIE_FINALI) {
                    const numeroFormattato = Math.round(currentDisplayedCount).toLocaleString('it-IT');
                    numSpan.innerHTML = numeroFormattato;
                }
            }
        }
    }

    // Disegna tutti i pallini apparsi
    for (let i = 0; i < specieMinacciateApparse.length; i++) {
        specieMinacciateApparse[i].display();
    }
}

/**
 * Gestisce il ridimensionamento della finestra per il canvas P5.js.
 */
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}


// --------------------------------------------------------------------------------
// SEZIONE LOGICA PARTICELLE/SPECIE
// --------------------------------------------------------------------------------

/**
 * Aggiunge un nuovo pallino di specie minacciata in una posizione casuale
 * fuori dalla zona di sicurezza ovale centrale.
 */
function aggiungiSpecieMinacciata() {
    // Dimensione del pallino ridotta per una migliore distribuzione
    const raggio = 4; 
    
    // Zona di sicurezza OVALE centrata sul testo
    // Queste dimensioni devono essere sincronizzate con la dimensione finale del testo
    const SAFETY_ZONE_WIDTH = width * 0.40; 
    const SAFETY_ZONE_HEIGHT = height * 0.40; 
    const CENTER_X = width / 2;
    const CENTER_Y = height / 2;
    
    let x, y;
    let attempts = 0;
    let positionOK = false;

    // Tentativi per trovare una posizione FUORI dalla zona centrale
    while(!positionOK && attempts < 50) {
        
        // Genera coordinate casuali su TUTTO lo schermo (0 a width/height)
        x = random(width); 
        y = random(height); 
        
        // Verifica se il punto è all'interno dell'ELLISSE di sicurezza centrale
        const x_rel = x - CENTER_X;
        const y_rel = y - CENTER_Y;
        
        // La formula dell'ellisse: (x^2 / a^2) + (y^2 / b^2) < 1
        const isInsideSafetyZone = ( (x_rel * x_rel) / (SAFETY_ZONE_WIDTH / 2 * SAFETY_ZONE_WIDTH / 2) ) + 
                                   ( (y_rel * y_rel) / (SAFETY_ZONE_HEIGHT / 2 * SAFETY_ZONE_HEIGHT / 2) ) < 1;
        
        if (!isInsideSafetyZone) {
            positionOK = true;
        }
        attempts++;
    }

    if (positionOK) {
        specieMinacciateApparse.push(new SpeciesParticle(x, y, raggio));
        indiceProssimaSpecie++;
    }
}

/**
 * Classe per disegnare e gestire ogni singolo pallino di specie.
 */
class SpeciesParticle {
    constructor(x, y, r) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.alpha = 0; // Opacità iniziale (invisibile)
        this.targetAlpha = 255;
        this.fadeSpeed = 10; 
    }
    
    display() {
        // Aggiorna l'opacità del pallino per l'effetto fade-in
        if (this.alpha < this.targetAlpha) {
            this.alpha += this.fadeSpeed;
            this.alpha = min(this.alpha, this.targetAlpha);
        }

        // Disegna il pallino (bianco)
        noStroke();
        fill(255, this.alpha); 
        ellipse(this.x, this.y, this.r * 2);
    }
}


// --------------------------------------------------------------------------------
// SEZIONE DOM (Gestione Interfaccia e Navigazione)
// --------------------------------------------------------------------------------

window.addEventListener('load', function() {
    
    // --- RIFERIMENTI DOM ---
    backgroundElement = document.getElementById('foto_sfondo_inizio');
    textOverlay = document.getElementById('text-overlay');
    h1Element = textOverlay.querySelector('h1'); 
    arrowNext = document.getElementById('arrow-next');
    arrowPrev = document.getElementById('arrow-prev');
    
    // --- INIZIALIZZAZIONE (Mostra Frase 1 dopo 3 secondi) ---
    setTimeout(function() {
        backgroundElement.classList.add('blurred');
        
        setTimeout(function() {
            // Visualizza la prima frase
            h1Element.innerHTML = frasi[indiceFrase]; 
            textOverlay.classList.add('visible');
            updateArrowsVisibility(); 
        }, 500); 
        
    }, 3000); 

    // --- FUNZIONI DI SUPPORTO ---

    /**
     * Aggiorna il contenuto testuale e resetta lo stato dell'animazione.
     * @param {number} newIndex - Indice della frase da visualizzare.
     */
    function updateContent(newIndex) {
        // Nascondi l'overlay
        textOverlay.classList.remove('visible');
        
        // Reset stato animazione e variabili P5
        isCountdownAnimating = false;
        animationComplete = false;
        
        const canvasElement = document.querySelector('canvas');
        if (canvasElement) canvasElement.style.display = 'none'; // Nasconde il canvas
        
        // Rimuovi tutti i pallini
        specieMinacciateApparse = [];
        indiceProssimaSpecie = 0; 
        
        backgroundElement.style.opacity = 1; 

        indiceFrase = newIndex;
        
        isPhraseTwoDisplayed = (indiceFrase === 1);
        
        // Visualizza il nuovo contenuto
        setTimeout(() => {
            h1Element.innerHTML = frasi[indiceFrase];
            
            // Reset classi di animazione del numero (se esistenti)
            const numElement = h1Element.querySelector('#animated-number');
            if(numElement) {
                numElement.classList.remove('final-animation');
            }
            const descriptiveText = h1Element.querySelector('#descriptive-text');
            if(descriptiveText) {
                descriptiveText.classList.remove('hidden-text');
            }
            
            textOverlay.classList.add('visible');
            updateArrowsVisibility();
        }, 1500); // Ritardo per l'effetto di dissolvenza/riapparizione
    }
    
    /**
     * Aggiorna la visibilità delle frecce di navigazione in base allo stato corrente.
     */
    function updateArrowsVisibility() {
        if (indiceFrase > 0) {
            arrowPrev.classList.add('visible');
        } else {
            arrowPrev.classList.remove('visible');
        }
        
        // Freccia 'next': visibile se non siamo all'ultima slide E non stiamo animando.
        if (indiceFrase === 0 || isPhraseTwoDisplayed || animationComplete) {
             arrowNext.classList.add('visible');
        } else {
             arrowNext.classList.remove('visible');
        }
    }
    
    /**
     * Avvia la sequenza di animazione P5.js.
     */
    function startAnimationCountdown() {
        
        // 1. Applica le transizioni CSS per ingrandire il numero e nascondere il testo circostante
        const numElement = h1Element.querySelector('#animated-number');
        if(numElement) {
            numElement.classList.add('final-animation'); 
        }

        const descriptiveText = h1Element.querySelector('#descriptive-text');
        if(descriptiveText) {
            descriptiveText.classList.add('hidden-text');
        }

        arrowNext.classList.remove('visible'); // Nasconde le frecce durante l'animazione
        arrowPrev.classList.remove('visible'); 

        // Avvia l'animazione P5 dopo la transizione CSS di ingrandimento (~1.5s)
        setTimeout(function() {
             
             const canvasElement = document.querySelector('canvas');
             if (canvasElement) canvasElement.style.display = 'block'; // Mostra il canvas
             
             // Reset e avvio animazione
             specieMinacciateApparse = [];
             indiceProssimaSpecie = 0;
             animationComplete = false;

             // Registra il tempo di inizio per la curva di accelerazione
             tempoInizioAnimazione = millis(); 
             
             isCountdownAnimating = true; // Avvia il loop 'draw()' in p5.js
             isPhraseTwoDisplayed = false; // Lo stato di lettura è terminato
             
        }, 1500); // Ritardo per permettere alla transizione CSS di iniziare
    }


    // --- GESTIONE EVENTI CLICK ---
    
    arrowNext.addEventListener('click', function() {
        if (isCountdownAnimating) return; 

        if (indiceFrase === 0) { 
            // Click 1: Passa da Frase 1 a Frase 2 (stato di lettura)
            updateContent(1); 
            
        } else if (indiceFrase === 1 && isPhraseTwoDisplayed) {
            // Click 2: Avvia l'animazione (il numero si ingrandisce al centro)
            startAnimationCountdown();
            
        } else if (indiceFrase === 1 && animationComplete) { 
            // Click 3: Animazione completata. Passa alla prossima fase.
            console.log("Animazione completata. Passaggio alla prossima slide.");
        }
    });
    
    arrowPrev.addEventListener('click', function() {
        if (isCountdownAnimating) return; 

        if (indiceFrase > 0) { 
            // Torna alla frase precedente (Frase 1)
            updateContent(indiceFrase - 1);
        }
    });
});