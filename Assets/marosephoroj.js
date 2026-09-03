// @input Component.Text textComponent
// @input Component.Text eligoTeksto
// @input Component.Text eligoTeksto1

var datumojCache = null;
var datumojCacheSource = null;
var aktualaDatumojTeksto = null;

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

// ---------------- INPUT / PARSING ----------------

function normalizeInputText(s) {
    if (!s) {
        return "";
    }

    s = String(s);

    // echte Zeilenumbrüche vereinheitlichen
    s = s.replace(/\r\n/g, "\n");
    s = s.replace(/\r/g, "\n");

    // falls irgendwo wörtlich "\n" oder "\r\n" eingefügt wurde
    s = s.replace(/\\r\\n/g, "\n");
    s = s.replace(/\\n/g, "\n");
    s = s.replace(/\\r/g, "\n");

    // problematische Leerzeichen aus Tabellen / mobilen Eingabefeldern
    s = s.replace(/[\u00A0\u202F\u2007]/g, " ");

    // Unicode-Minuszeichen vereinheitlichen
    s = s.replace(/[−–—]/g, "-");

    // BOM entfernen
    s = s.replace(/^\uFEFF/, "");

    return s;
}

function parseFlexibleFloat(s) {
    if (s === null || s === undefined) {
        return NaN;
    }

    s = String(s).trim();

    // deutsches Dezimalkomma erlauben
    s = s.replace(",", ".");

    // nur echte Zahlen akzeptieren
    if (!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)) {
        return NaN;
    }

    return parseFloat(s);
}

function isConstituentName(s) {
    if (!s) {
        return false;
    }

    // Namen wie M2, 2N2, LAMBDA2, 2SM2 usw.
    // Muss mindestens einen Buchstaben enthalten.
    return /^[A-Za-z0-9_]+$/.test(s) && /[A-Za-z]/.test(s);
}

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
    var text = normalizeInputText(rawText).trim();

    if (text.length === 0) {
        return null;
    }

    // Alles über Tokens parsen, damit Zeilenumbrüche egal sind.
    var tokens = text.split(/\s+/);

    // Gesucht wird von hinten das Datum YYYYMMDDHHMM.
    // Danach kommt optional der Ortsname.
    for (var i = tokens.length - 1; i >= 0; i--) {
        if (!/^\d{12}$/.test(tokens[i])) {
            continue;
        }

        var startDate = parseDateTime(tokens[i]);

        if (!startDate) {
            continue;
        }

        var datumojTokens = tokens.slice(0, i);
        var lokTokens = tokens.slice(i + 1);

        var datumojTeksto = datumojTokens.join(" ");
        var parsedDatumoj = parseDatumoj(datumojTeksto);

        if (parsedDatumoj.length === 0) {
            continue;
        }

        var loknomo = lokTokens.length > 0
            ? lokTokens.join(" ").replace(/\s+/g, " ").trim()
            : DEFAULT_PLACE;

        if (loknomo.length === 0) {
            loknomo = DEFAULT_PLACE;
        }

        return {
            datumojTeksto: datumojTeksto,
            datoTempo: tokens[i],
            loknomo: loknomo,
            startDate: startDate
        };
    }

    return null;
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

function initializeInputFromDefault() {
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

    initialLoadDone = true;
    initialLoadStarted = false;

    if (defaultPrepared.parsed) {
        main(defaultPrepared.parsed);
    }
}

// ---------------- TOUCH / UPDATE ----------------

function onUpdateEvent(eventData) {
    var currentInput = script.textComponent ? script.textComponent.text : "";

    print("Enigo: " + currentInput);

    if (currentInput && currentInput.trim().length > 0) {
        var parsedCurrent = parseEnigo(currentInput);

        if (parsedCurrent) {
            main(parsedCurrent);
        } else {
            var prepared = buildEffectiveInput(null);

            if (script.textComponent) {
                script.textComponent.text = prepared.text;
            }

            if (prepared.parsed) {
                main(prepared.parsed);
            }
        }

        return;
    }

    var preparedDefault = buildEffectiveInput(null);

    if (script.textComponent) {
        script.textComponent.text = preparedDefault.text;
    }

    if (preparedDefault.parsed) {
        main(preparedDefault.parsed);
    }
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
            ". t0  unu  du   tri  kvar kvin ses\n" +
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

    var text = normalizeInputText(dataString).trim();

    if (text.length === 0) {
        return components;
    }

    // Nicht nach Zeilen parsen, sondern nach beliebigem Whitespace.
    // Dadurch funktionieren \n, \r\n, \r, Tabs und auch komplett fehlende Zeilenumbrüche.
    var tokens = text.split(/\s+/);

    var i = 0;

    while (i + 9 < tokens.length) {
        var nomo = tokens[i];

        if (!isConstituentName(nomo)) {
            i++;
            continue;
        }

        var a = parseFlexibleFloat(tokens[i + 1]);
        var uDeg = parseFlexibleFloat(tokens[i + 2]);
        var kh0s = parseFlexibleFloat(tokens[i + 3]);
        var ks = parseFlexibleFloat(tokens[i + 4]);
        var kh0 = parseFlexibleFloat(tokens[i + 5]);
        var kpp = parseFlexibleFloat(tokens[i + 6]);
        var kns = parseFlexibleFloat(tokens[i + 7]);
        var kq = parseFlexibleFloat(tokens[i + 8]);
        var kn90 = parseFlexibleFloat(tokens[i + 9]);

        if (
            isNaN(a) ||
            isNaN(uDeg) ||
            isNaN(kh0s) ||
            isNaN(ks) ||
            isNaN(kh0) ||
            isNaN(kpp) ||
            isNaN(kns) ||
            isNaN(kq) ||
            isNaN(kn90)
        ) {
            // Kein gültiger Datensatz ab dieser Position.
            // Einen Token weiterschieben und neu suchen.
            i++;
            continue;
        }

        components.push({
            nomo: nomo,
            a: a,
            u: uDeg * Math.PI / 180,
            kh0s: kh0s,
            ks: ks,
            kh0: kh0,
            kpp: kpp,
            kns: kns,
            kq: kq,
            kn90: kn90
        });

        // Eine vollständige Konstituente verbraucht genau 10 Tokens.
        i += 10;
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

initializeInputFromDefault();

script.createEvent("TouchStartEvent").bind(function(eventData) {
    onUpdateEvent(eventData);
    print("Bildschirm wurde berührt!");
});