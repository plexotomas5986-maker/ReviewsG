/* =========================================
   ELEMENTOS
========================================= */

const mapsLinkInput = document.getElementById("mapsLink");
const generateButton = document.getElementById("generateButton");

const resultSection = document.getElementById("resultSection");
const reviewLinkInput = document.getElementById("reviewLink");

const copyButton = document.getElementById("copyButton");
const openButton = document.getElementById("openButton");

const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");

const themeToggle = document.getElementById("themeToggle");


/* =========================================
   MODO OSCURO / CLARO
========================================= */

function loadTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        themeToggle.textContent = "☀️";
    } else {
        document.body.classList.remove("light-theme");
        themeToggle.textContent = "🌙";
    }
}

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-theme");

    const isLight = document.body.classList.contains("light-theme");

    localStorage.setItem(
        "theme",
        isLight ? "light" : "dark"
    );

    themeToggle.textContent = isLight ? "☀️" : "🌙";
});

loadTheme();


/* =========================================
   LIMPIAR MENSAJES
========================================= */

function clearMessages() {
    resultSection.hidden = true;
    errorSection.hidden = true;

    reviewLinkInput.value = "";
    errorMessage.textContent = "";
}


/* =========================================
   MOSTRAR ERROR
========================================= */

function showError(message) {
    resultSection.hidden = true;

    errorMessage.textContent = message;

    errorSection.hidden = false;
}


/* =========================================
   VALIDAR GOOGLE MAPS
========================================= */

function isGoogleMapsUrl(value) {
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();

        return (
            hostname === "google.com" ||
            hostname === "www.google.com" ||
            hostname === "maps.google.com"
        );

    } catch {
        return false;
    }
}


/* =========================================
   EXTRAER FEATURE ID
=========================================

   Busca formatos como:

   0x943b4d004933ec93:0x6bf49ab42634813

   Puede aparecer dentro de:
   !1s...
   /data=...
   URLs codificadas, etc.
========================================= */

function extractFeatureId(value) {

    const decoded = decodeURIComponent(value);

    const match = decoded.match(
        /0x([0-9a-f]+):0x([0-9a-f]+)/i
    );

    if (!match) {
        return null;
    }

    return {
        hi: match[1],
        lo: match[2]
    };
}


/* =========================================
   FEATURE ID → PLACE ID
=========================================

   Google utiliza una estructura protobuf:

   0A 12
   09 + 8 bytes little-endian
   11 + 8 bytes little-endian

   Total: 20 bytes

   Después:
   bytes → Base64URL

========================================= */

function featureIdToPlaceId(featureId) {

    try {

        const hi = BigInt("0x" + featureId.hi);
        const lo = BigInt("0x" + featureId.lo);


        /*
           Creamos los 20 bytes
        */

        const buffer = new ArrayBuffer(20);
        const view = new DataView(buffer);
        const bytes = new Uint8Array(buffer);


        /*
           Cabecera protobuf
        */

        bytes[0] = 0x0a;
        bytes[1] = 0x12;


        /*
           Campo 1
           fixed64
        */

        bytes[2] = 0x09;

        view.setBigUint64(
            3,
            hi,
            true
        );


        /*
           Campo 2
           fixed64
        */

        bytes[11] = 0x11;

        view.setBigUint64(
            12,
            lo,
            true
        );


        /*
           Convertimos los bytes a texto binario
           para poder usar btoa()
        */

        let binary = "";

        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }


        /*
           Base64
        */

        let base64 = btoa(binary);


        /*
           Base64 → Base64URL
        */

        base64 = base64
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/g, "");


        return base64;

    } catch (error) {

        console.error(
            "Error convirtiendo Feature ID:",
            error
        );

        return null;
    }
}


/* =========================================
   GENERAR ENLACE DE RESEÑA
========================================= */

function generateReviewLink() {

    clearMessages();

    const mapsLink =
        mapsLinkInput.value.trim();


    /* =====================================
       CAMPO VACÍO
    ===================================== */

    if (!mapsLink) {

        showError(
            "Pegá primero el enlace de Google Maps del local."
        );

        return;
    }


    /* =====================================
       VALIDAR URL
    ===================================== */

    if (!isGoogleMapsUrl(mapsLink)) {

        showError(
            "El enlace no parece ser una URL válida de Google Maps."
        );

        return;
    }


    /* =====================================
       EXTRAER FEATURE ID
    ===================================== */

    const featureId =
        extractFeatureId(mapsLink);


    if (!featureId) {

        showError(
            "No se encontró el identificador 0x...:0x... dentro del enlace de Google Maps."
        );

        return;
    }


    console.log(
        "Feature ID encontrado:",
        `0x${featureId.hi}:0x${featureId.lo}`
    );


    /* =====================================
       CONVERTIR A PLACE ID
    ===================================== */

    const placeId =
        featureIdToPlaceId(featureId);


    if (!placeId) {

        showError(
            "No se pudo convertir el identificador del lugar."
        );

        return;
    }


    console.log(
        "Place ID generado:",
        placeId
    );


    /* =====================================
       GENERAR LINK DIRECTO
    ===================================== */

    const reviewUrl =
        "https://search.google.com/local/writereview?placeid=" +
        encodeURIComponent(placeId);


    /* =====================================
       MOSTRAR RESULTADO
    ===================================== */

    reviewLinkInput.value =
        reviewUrl;

    resultSection.hidden = false;
}


/* =========================================
   BOTÓN GENERAR
========================================= */

generateButton.addEventListener(
    "click",
    generateReviewLink
);


/* =========================================
   ENTER EN EL INPUT
========================================= */

mapsLinkInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {
            generateReviewLink();
        }

    }
);


/* =========================================
   COPIAR ENLACE
========================================= */

copyButton.addEventListener(
    "click",
    async () => {

        const link =
            reviewLinkInput.value;

        if (!link) {
            return;
        }


        try {

            await navigator.clipboard.writeText(link);

            const originalText =
                copyButton.textContent;

            copyButton.textContent =
                "✓ Copiado";

            setTimeout(() => {

                copyButton.textContent =
                    originalText;

            }, 1500);

        } catch {

            /*
               Método alternativo
            */

            reviewLinkInput.select();

            document.execCommand("copy");

            copyButton.textContent =
                "✓ Copiado";

            setTimeout(() => {

                copyButton.textContent =
                    "Copiar enlace";

            }, 1500);
        }
    }
);


/* =========================================
   ABRIR ENLACE
========================================= */

openButton.addEventListener(
    "click",
    () => {

        const link =
            reviewLinkInput.value;

        if (!link) {
            return;
        }

        window.open(
            link,
            "_blank"
        );
    }
);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
            .then(() => {
                console.log("Service Worker registrado correctamente");
            })
            .catch(error => {
                console.error("Error registrando Service Worker:", error);
            });
    });
}