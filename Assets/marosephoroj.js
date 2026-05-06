// @input Component.Text textComponent
// @input Component.Text eligoTeksto
// @input Component.Text eligoTeksto1
// @input Asset.CloudStorageModule cloudStorageModule

var datumojCache = null;
var datumojCacheSource = null;
var aktualaDatumojTeksto = null;

script.store = null;
var cloudStoreReady = false;
var cloudStoreInitStarted = false;
var pendingSaveValue = null;
var pendingLoadCallbacks = [];

var CLOUD_KEY = "tideInputNiveloj";

var DEFAULT_PLACE = "Cuxhaven";

var DEFAULT_DATUMOJ = `M2 132.741909 -18.798868 2 0 0 0 0 0 0
N2 21.416288 -44.772829 2 -1 0 1 0 0 0
S2 34.035663 51.595649 2 2 -2 0 0 0 0
K2 10.270645 49.497113 2 2 0 0 0 0 0
2N2 0.869336 -9.507892 2 -2 0 2 0 0 0
S1 0.776315 37.206517 1 1 -1 0 0 1 1
K1 7.552466 43.617815 1 1 0 0 0 0 1
P1 3.15716 53.599694 1 1 -2 0 0 0 -1
O1 9.05433 -107.311968 1 -1 0 0 0 0 -1
Q1 2.61827 -160.282744 1 -2 0 1 0 0 -1
M1 0.559303 16.06543 1 0 0 1 0 0 1
M4 10.591015 -147.695609 4 0 0 0 0 0 0
MM 2.154814 -147.532816 0 1 0 -1 0 0 0
MF 1.150955 -175.048688 0 2 0 0 0 0 0
SA 10.417475 -115.833536 0 0 1 0 0 -1 0
SSA 5.309425 -173.836883 0 0 2 0 0 0 0
T2 1.827479 39.962074 2 2 -3 0 0 1 0
J1 0.451758 132.147603 1 2 0 -1 0 0 1
L2 11.439029 -1.733522 2 1 0 -1 0 0 2
R2 0.40084 13.535807 2 2 -1 0 0 -1 2
2Q1 0.645097 110.941402 1 -3 0 2 0 0 -1
MSF 2.80441 48.080651 0 2 -2 0 0 0 0
MSQM 1.633025 -144.945262 0 4 -2 0 0 0 0
EP2 3.553836 53.203184 2 -3 2 1 0 0 0
M3 0.567985 -164.832244 3 0 0 0 0 0 2
MU2 13.186214 71.873159 2 -2 2 0 0 0 0
MTM 0.520988 -165.024071 0 3 0 -1 0 0 0
NU2 7.506081 -64.41662 2 -1 2 -1 0 0 0
LAMBDA2 4.694611 -7.195269 2 1 -2 1 0 0 2
MN4 3.829558 -166.259866 4 -1 0 1 0 0 0
MS4 6.678563 -85.899375 4 2 -2 0 0 0 0
MKS2 1.155672 158.230215 2 -1 0 0 0 0 0
N4 0.554048 -173.553053 4 -2 0 2 0 0 0
M6 7.064188 55.439853 6 0 0 0 0 0 0
M8 1.088542 -51.015314 8 0 0 0 0 0 0
S4 0.715169 18.705991 4 4 -4 0 0 0 0
OO1 0.521149 -68.362267 1 3 0 0 0 0 1
S3 0.07223 87.921523 3 3 -3 0 0 0 2
MA2 4.357697 -72.554396 2 0 -1 0 0 0 0
MB2 2.698539 35.287129 2 0 1 0 0 0 0
T3 0.162219 48.796041 3 3 -4 0 0 0 0
R3 0.244048 -88.252977 3 3 -2 0 0 0 0
RHO1 0.672603 160.866113 1 -2 2 -1 0 0 -1
SGM 0.463479 -90.774309 1 -3 2 0 0 0 -1
3L2 1.044693 90.086448 2 1 0 0 0 0 0
3N2 0.552452 22.270886 2 0 2 0 0 0 0
2SM2 2.954387 -84.458936 2 4 -4 0 0 0 0
2MS6 6.597852 119.038423 6 2 -2 0 0 0 0
2MK5 0.418761 -23.210387 5 1 0 0 0 0 1
2MO5 0.21434 62.960188 5 -1 0 0 0 0 -1`;

// ---------------- DEFAULT INPUT ----------------

function twoDigits(n) {
    n = n * 1;
    return n < 10 ? "0" + n : "" + n;
}

function getCurrentUtcDateTimeText() {
    var now = new Date();

    return "" +
        now.getUTCFullYear() +
        twoDigits(now.getUTCMonth() + 1) +
        twoDigits(now.getUTCDate()) +
        twoDigits(now.getUTCHours()) +
        twoDigits(now.getUTCMinutes());
}

function makeDefaultFullInput() {
    return DEFAULT_DATUMOJ + "\n" + getCurrentUtcDateTimeText() + " " + DEFAULT_PLACE;
}

var initialLoadStarted = false;
var initialLoadDone = false;

// ---------------- CLOUD STORAGE ----------------

function onCloudStorageError(code, message) {
    print("CloudStorage-Fehler: " + code + " " + message);
}

function flushPendingLoadCallbacks(value) {
    var callbacks = pendingLoadCallbacks.slice();
    pendingLoadCallbacks = [];

    for (var i = 0; i < callbacks.length; i++) {
        try {
            callbacks[i](value);
        } catch (e) {
            print("Fehler in Load-Callback: " + e);
        }
    }
}

function onCloudStoreInitError(code, message) {
    print("CloudStore-Initialisierung fehlgeschlagen: " + code + " " + message);

    cloudStoreReady = false;
    cloudStoreInitStarted = false;

    flushPendingLoadCallbacks(null);
}

function onCloudStoreReady(store) {
    print("CloudStore created");

    script.store = store;
    cloudStoreReady = true;
    cloudStoreInitStarted = false;

    if (pendingSaveValue !== null) {
        var valueToSave = pendingSaveValue;
        pendingSaveValue = null;
        saveInputToCloud(valueToSave);
    }

    if (pendingLoadCallbacks.length > 0) {
        fetchCloudValue(function(value) {
            flushPendingLoadCallbacks(value);
        });
    }
}

function createCloudStore() {
    if (cloudStoreReady || cloudStoreInitStarted) {
        return;
    }

    if (!script.cloudStorageModule) {
        print("Kein CloudStorageModule als Script-Input gesetzt.");
        flushPendingLoadCallbacks(null);
        return;
    }

    cloudStoreInitStarted = true;

    var cloudStorageOptions = CloudStorageOptions.create();

    script.cloudStorageModule.getCloudStore(
        cloudStorageOptions,
        onCloudStoreReady,
        onCloudStoreInitError
    );
}

function fetchCloudValue(callback) {
    if (!script.store) {
        callback(null);
        return;
    }

    var readOptions = CloudStorageReadOptions.create();
    readOptions.scope = StorageScope.User;

    script.store.getValue(
        CLOUD_KEY,
        readOptions,
        function onSuccess(key, value) {
            callback(value || null);
        },
        function onNotFound() {
            callback(null);
        }
    );
}

function saveInputToCloud(value) {
    if (!value || value.trim().length === 0) {
        return;
    }

    if (!cloudStoreReady || !script.store) {
        pendingSaveValue = value;
        createCloudStore();
        return;
    }

    var writeOptions = CloudStorageWriteOptions.create();
    writeOptions.scope = StorageScope.User;

    script.store.setValue(
        CLOUD_KEY,
        value,
        writeOptions,
        function onSuccess() {
            print("Eingabe im Cloud Storage gespeichert.");
        },
        onCloudStorageError
    );
}

function loadInputFromCloud(callback) {
    if (!callback) {
        return;
    }

    if (!cloudStoreReady || !script.store) {
        pendingLoadCallbacks.push(callback);
        createCloudStore();
        return;
    }

    fetchCloudValue(callback);
}

// ---------------- INPUT / PARSING ----------------

function parseDateTime(datoTempo) {
    if (!/^\d{12}$/.test(datoTempo)) {
        return null;
    }

    var jaro = parseInt(datoTempo.substr(0, 4), 10);
    var monato = parseInt(datoTempo.substr(4, 2), 10);
    var tago = parseInt(datoTempo.substr(6, 2), 10);
    var horo = parseInt(datoTempo.substr(8, 2), 10);
    var minuto = parseInt(datoTempo.substr(10, 2), 10);

    if (
        monato < 1 ||
        monato > 12 ||
        tago < 1 ||
        tago > 31 ||
        horo < 0 ||
        horo > 23 ||
        minuto < 0 ||
        minuto > 59
    ) {
        return null;
    }

    var d = new Date(Date.UTC(jaro, monato - 1, tago, horo, minuto, 0));

    if (
        d.getUTCFullYear() !== jaro ||
        d.getUTCMonth() + 1 !== monato ||
        d.getUTCDate() !== tago ||
        d.getUTCHours() !== horo ||
        d.getUTCMinutes() !== minuto
    ) {
        return null;
    }

    return d;
}

function parseEnigo(rawText) {
    var text = rawText ? rawText.trim() : "";

    if (text.length === 0) {
        return null;
    }

    // Format:
    // harmonische Konstituenten mit Doodson-Zahlen
    // YYYYMMDDHHMM Ortsname
    var match = text.match(/([\s\S]*?)\b(\d{12})\b(?:\s+([\s\S]+))?$/);

    if (!match) {
        return null;
    }

    var datumojTeksto = match[1].trim();
    var datoTempo = match[2];
    var loknomo = match[3] ? match[3].replace(/\s+/g, " ").trim() : DEFAULT_PLACE;

    if (parseDatumoj(datumojTeksto).length === 0) {
        return null;
    }

    var startDate = parseDateTime(datoTempo);

    if (!startDate) {
        return null;
    }

    return {
        datumojTeksto: datumojTeksto,
        datoTempo: datoTempo,
        loknomo: loknomo,
        startDate: startDate
    };
}

// ---------------- INITIAL LOAD ----------------

function buildEffectiveInput(storedInput) {
    var defaultFullInput = makeDefaultFullInput();

    var effectiveInput = storedInput && storedInput.trim().length > 0
        ? storedInput
        : defaultFullInput;

    var parsed = parseEnigo(effectiveInput);

    if (!parsed) {
        effectiveInput = defaultFullInput;
        parsed = parseEnigo(effectiveInput);
    }

    return {
        text: effectiveInput,
        parsed: parsed
    };
}

function initializeInputFromCloudOrDefault() {
    if (initialLoadStarted || initialLoadDone) {
        return;
    }

    initialLoadStarted = true;

    var defaultPrepared = buildEffectiveInput(null);

    if (script.textComponent) {
        var currentText = script.textComponent.text || "";

        if (currentText.trim().length === 0) {
            script.textComponent.text = defaultPrepared.text;
        }
    }

    if (defaultPrepared.parsed) {
        main(defaultPrepared.parsed);
    }

    loadInputFromCloud(function(storedInput) {
        var prepared = buildEffectiveInput(storedInput);

        if (script.textComponent) {
            script.textComponent.text = prepared.text;
        }

        initialLoadDone = true;
        initialLoadStarted = false;

        if (prepared.parsed) {
            main(prepared.parsed);
        }
    });
}

// ---------------- TOUCH / UPDATE ----------------

function onUpdateEvent(eventData) {
    var currentInput = script.textComponent ? script.textComponent.text : "";

    print("Enigo: " + currentInput);

    if (currentInput && currentInput.trim().length > 0) {
        var parsedCurrent = parseEnigo(currentInput);

        if (parsedCurrent) {
            saveInputToCloud(currentInput);
            main(parsedCurrent);
        } else {
            loadInputFromCloud(function(storedInput) {
                var prepared = buildEffectiveInput(storedInput);

                if (script.textComponent) {
                    script.textComponent.text = prepared.text;
                }

                if (prepared.parsed) {
                    main(prepared.parsed);
                }
            });
        }

        return;
    }

    loadInputFromCloud(function(storedInput) {
        var prepared = buildEffectiveInput(storedInput);

        if (script.textComponent) {
            script.textComponent.text = prepared.text;
        }

        if (prepared.parsed) {
            main(prepared.parsed);
        }
    });
}

// ---------------- MAIN ----------------

function main(parsedInput) {
    if (!parsedInput) {
        if (script.eligoTeksto) {
            script.eligoTeksto.text =
                "";
        }
        return;
    }

    aktualaDatumojTeksto = parsedInput.datumojTeksto;

    if (!datumojCache || datumojCacheSource !== aktualaDatumojTeksto) {
        datumojCache = parseDatumoj(aktualaDatumojTeksto);
        datumojCacheSource = aktualaDatumojTeksto;
    }

    var startDate = parsedInput.startDate;
    var loknomo = parsedInput.loknomo;

    var rezchioma = "";
    var rez1chioma = "";

    var dato000 = "";
    var horo000 = "";

    for (var itempoj = 0; itempoj < 7; itempoj++) {
        var d = new Date(startDate.getTime() + itempoj * 60 * 60 * 1000);

        var jaro = d.getUTCFullYear();
        var monato = d.getUTCMonth() + 1;
        var tago = d.getUTCDate();
        var horo = d.getUTCHours();
        var minuto = d.getUTCMinutes();

        if (itempoj === 0) {
            dato000 = "" + jaro + twoDigits(monato) + twoDigits(tago);
            horo000 = twoDigits(horo) + ":" + twoDigits(minuto);
        }

        // Schreibweise HH.MM, damit niv() wie im ursprünglichen Programm arbeitet.
        var zt = horo + minuto / 100.0;

        var nvo = niv(zt, tago, monato, jaro);

        // Negative Werte werden automatisch mit Minuszeichen formatiert.
        var rezulto = (Math.round(nvo * 10) / 10).toFixed(1).replace(".", ",");

        rezchioma = rezchioma + " " + rezulto;
        rez1chioma = rez1chioma + (Math.round(nvo * 1000) / 1000).toFixed(3) + " ";
    }

    // ---------------- GRAPHISCHE TEXTAUSGABE ----------------
    // Das Textfeld hat 7 Zeilen.
    // Die mittlere Zeile, also Zeile 3, entspricht dem Wasserstand 0.
    // Positive Wasserstände erscheinen oberhalb der Mitte.
    // Negative Wasserstände erscheinen unterhalb der Mitte.
    // Negative Werte behalten ihr Minuszeichen.

    var tokens = [];
    var re = /-?\d+,\d/g;
    var m;

    while ((m = re.exec(rezchioma)) !== null) {
        tokens.push({
            text: m[0],
            value: parseFloat(m[0].replace(",", ".")),
            col: m.index
        });
    }

    var width = rezchioma.length;

    var numberOfRows = 7;
    var zeroRow = 3;

    var maxAbs = 0;

    for (var i = 0; i < tokens.length; i++) {
        var absValue = Math.abs(tokens[i].value);

        if (absValue > maxAbs) {
            maxAbs = absValue;
        }
    }

    if (maxAbs === 0) {
        maxAbs = 1;
    }

    for (var j = 0; j < tokens.length; j++) {
        var normalized = tokens[j].value / maxAbs;

        // +maxAbs -> oberste Zeile
        // 0       -> mittlere Zeile
        // -maxAbs -> unterste Zeile
        var row = zeroRow - Math.round(normalized * zeroRow);

        if (row < 0) {
            row = 0;
        }

        if (row >= numberOfRows) {
            row = numberOfRows - 1;
        }

        tokens[j].row = row;
    }

    var lines = [];

    for (var r = 0; r < numberOfRows; r++) {
        var arr = [];

        for (var c = 0; c < width; c++) {
            arr.push(" ");
        }

        lines.push(arr);
    }

    for (var t = 0; t < tokens.length; t++) {
        var tok = tokens[t];

        for (var k = 0; k < tok.text.length; k++) {
            lines[tok.row][tok.col + k] = tok.text[k];
        }
    }

    var rezchioma1 = "";

    for (var li = 0; li < lines.length; li++) {
        if (li > 0) {
            rezchioma1 += "\n";
        }

        // Die mittlere Zeile wird mit "0" markiert.
        // Dadurch ist sichtbar, dass dort der Wasserstand 0 liegt.
        if (li === zeroRow) {
            rezchioma1 += "0" + lines[li].join("");
        } else {
            rezchioma1 += "." + lines[li].join("");
        }
    }

    if (script.eligoTeksto) {
        script.eligoTeksto.text =
            rezchioma1 + "\n" +
            ". t0 unu du tri kvar kvin ses\n" +
            "horojn post t0\n" +
            "Akvoniveloj en metroj en " + loknomo + ";\n" +
            "privata neoficiala prognozo.\n" +
            "Ne uzu ghin por navigaciaj celoj.\n" +
            "t0 estas " + dato000 + " " + horo000 + " horo";
    }

    if (script.eligoTeksto1) {
        script.eligoTeksto1.text = rez1chioma;
    }
}

// ---------------- DATA PARSING ----------------

function parseDatumoj(dataString) {
    var components = [];

    if (!dataString || dataString.trim().length === 0) {
        return components;
    }

    var lines = dataString.trim().split("\n");

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        if (line.length === 0) {
            continue;
        }

        var parts = line.split(/\s+/);

        // Name + Amplitude + Phase + 7 Doodson-Zahlen = mindestens 10 Felder
        if (parts.length < 10) {
            continue;
        }

        var component = {
            nomo: parts[0],
            a: parseFloat(parts[1]),
            u: parseFloat(parts[2]) * Math.PI / 180,
            kh0s: parseFloat(parts[3]),
            ks: parseFloat(parts[4]),
            kh0: parseFloat(parts[5]),
            kpp: parseFloat(parts[6]),
            kns: parseFloat(parts[7]),
            kq: parseFloat(parts[8]),
            kn90: parseFloat(parts[9])
        };

        if (
            isNaN(component.a) ||
            isNaN(component.u) ||
            isNaN(component.kh0s) ||
            isNaN(component.ks) ||
            isNaN(component.kh0) ||
            isNaN(component.kpp) ||
            isNaN(component.kns) ||
            isNaN(component.kq) ||
            isNaN(component.kn90)
        ) {
            continue;
        }

        components.push(component);
    }

    return components;
}

// ---------------- TIDE CALCULATION ----------------

function niv(zt1, tago, monato, jaro) {
    // zt1 ist in der Schreibweise HH.MM, also z.B. 13.42 für 13:42.
    // zp wandelt den Minutenanteil in echte Stundenbruchteile um.
    var zp = (zt1 - Math.floor(zt1)) * 5 / 3 + Math.floor(zt1);

    var gt =
        Math.floor(30.6001 * (1 + monato + 12 * Math.floor(1 / (monato + 1) + 0.7))) +
        Math.floor(365.25 * (jaro - Math.floor(1 / (monato + 1) + 0.7))) +
        tago +
        zp / 24 -
        723258;

    var s = 78.16001 + 13.17639673 * gt;
    var h0 = 279.82 + 0.98564734 * gt;
    var pp = 349.5 + 0.11140408 * gt;
    var ns = 208.1 + 0.05295392 * gt;
    var n90 = 90;
    var q = 282.6 + 0.000047069 * gt;

    if (!datumojCache || datumojCacheSource !== aktualaDatumojTeksto) {
        datumojCache = parseDatumoj(aktualaDatumojTeksto);
        datumojCacheSource = aktualaDatumojTeksto;
    }

    var h2 = 0;

    for (var idx = 0; idx < datumojCache.length; idx++) {
        var c = datumojCache[idx];

        var argument =
            (
                c.kh0s * zp * 15 +
                s * (c.ks - c.kh0s) +
                h0 * (c.kh0 + c.kh0s) +
                pp * c.kpp +
                ns * c.kns +
                q * c.kq +
                n90 * c.kn90
            ) * Math.PI / 180 -
            c.u;

        h2 += c.a * Math.cos(argument);

        if (c.nomo === "M2") {
            argument =
                (
                    c.kh0s * zp * 15 +
                    s * (c.ks - c.kh0s) +
                    h0 * (c.kh0 + c.kh0s) +
                    pp * c.kpp +
                    ns * (c.kns - 1) +
                    q * c.kq +
                    n90 * c.kn90
                ) * Math.PI / 180 -
                c.u;

            h2 -= c.a / 27 * Math.cos(argument);
        }

        if (c.nomo === "O1") {
            argument =
                (
                    c.kh0s * zp * 15 +
                    s * (c.ks - c.kh0s) +
                    h0 * (c.kh0 + c.kh0s) +
                    pp * c.kpp +
                    ns * (c.kns - 1) +
                    q * c.kq +
                    n90 * c.kn90
                ) * Math.PI / 180 -
                c.u;

            h2 += c.a / 5.3 * Math.cos(argument);
        }

        if (c.nomo === "K1") {
            argument =
                (
                    c.kh0s * zp * 15 +
                    s * (c.ks - c.kh0s) +
                    h0 * (c.kh0 + c.kh0s) +
                    pp * c.kpp +
                    ns * (c.kns + 1) +
                    q * c.kq +
                    n90 * c.kn90
                ) * Math.PI / 180 -
                c.u;

            h2 += c.a / 7.4 * Math.cos(argument);
        }

        if (c.nomo === "S2") {
            argument =
                (
                    c.kh0s * zp * 15 +
                    s * (c.ks - c.kh0s) +
                    h0 * (c.kh0 + c.kh0s + 2) +
                    pp * c.kpp +
                    ns * (c.kns + 1) +
                    q * c.kq +
                    n90 * c.kn90
                ) * Math.PI / 180 -
                c.u;

            h2 += c.a / 12 * Math.cos(argument);
        }
    }

    // Amplituden sind in Zentimetern; Ausgabe in Metern.
    // Kein fester Rechtenfleth-PNP-Zuschlag.
    h2 = h2 / 100 + 0.0 / 100;

    return h2;
}

// ---------------- START ----------------

createCloudStore();
initializeInputFromCloudOrDefault();

script.createEvent("TouchStartEvent").bind(function(eventData) {
    onUpdateEvent(eventData);
    print("Bildschirm wurde berührt!");
});