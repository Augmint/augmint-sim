"use strict";

const { Acd, Pt } = require("./lib/augmintNums.js");

const simulation = require("./lib/simulation.js");

const logger = require("./lib/logger.js");
const rates = require("./augmint/rates.js");
const graphs = require("./lib/graphs.js");
const scenario = require("./scenarios/base.js");
const AugmintError = require("./augmint/augmint.error.js");
const ActorDirectory = require("./actors/actor.directory.js");

// DOM elements
const clockElem = document.querySelector(".clock");
const pauseBtn = document.querySelector(".pause-btn");
const storeBtn = document.querySelector(".store-btn");
const saveJSONBtn = document.querySelector(".save-json-btn");
const loadJSONBtn = document.querySelector(".load-json-btn");
const saveLSBtn = document.querySelector(".save-ls-btn");
const loadLSBtn = document.querySelector(".load-ls-btn");
const jsonFileInput = document.getElementById("json-file-input");

const restartBtn = document.querySelector(".restart-btn");
const clearLogBtn = document.querySelector(".clearLog-btn");
const dumpStateBtn = document.querySelector(".dumpState-btn");
const dumpMovesLogBtn = document.querySelector(".dumpMovesLog-btn");
const toggleLogBtn = document.querySelector(".toggleLog-btn");
const logWrapper = document.querySelector(".log-wrapper");
const logTextArea = document.querySelector(".log-textarea");
const ratesDropDown = document.querySelector(".rates-dropdown");
const inputs = Array.from(document.querySelectorAll(".sim-inputs input"));

const graphsWrapper = document.querySelector(".graphs-wrapper");
const errorMsg = document.querySelector(".error-msg");
const msg = document.querySelector(".msg");

let lastRender = -1;
let paused = true;
let started = false;
let logVisible = false;
let benchmarkStart;
let benchmarkItCt;

function getParamsFromUI() {
    const params = {};

    inputs.forEach(input => {
        const value = Number.parseFloat(input.value) || 0;
        const key = input.dataset.key;

        if (!key) {
            return;
        }

        //percentages
        if (
            key === "marketLockInterestRate" ||
            key === "lockedAcdInterestPercentage" ||
            key === "marketLoanInterestRate" ||
            key === "ltdLoanDifferenceLimit" ||
            key === "ltdLockDifferenceLimit"
        ) {
            params[key] = Pt(value).div(100);
        } else {
            params[key] = Acd(value);
        }
    });

    params.loanProduct = {
        minimumLoanInAcd: Acd(document.getElementById("minimumLoanInAcd").value),
        loanCollateralRatio: Pt(document.getElementById("loanCollateralRatio").value / 100),
        interestPt: Pt(document.getElementById("loanInterestPt").value / 100), // p.a.
        repaymentPeriodInDays: parseInt(document.getElementById("repaymentPeriodInDays").value),
        defaultFeePercentage: Pt(document.getElementById("defaultFeePercentage").value / 100)
    };
    //technical params
    params["ethUsdTrendSampleDays"] = parseInt(document.getElementById("ethUsdTrendSampleDays").value);
    params["graphRefreshDays"] = parseInt(document.getElementById("graphRefreshDays").value);
    params["logMoves"] = document.getElementById("logMoves").checked;

    return params;
}

function updateUIFromParams() {
    const augmint = simulation.getState().augmint;
    inputs.forEach(input => {
        const key = input.dataset.key;
        //percentages
        if (
            key === "marketLockInterestRate" ||
            key === "lockedAcdInterestPercentage" ||
            key === "marketLoanInterestRate" ||
            key === "ltdLoanDifferenceLimit" ||
            key === "ltdLockDifferenceLimit"
        ) {
            augmint.params[key] = (augmint.params[key] * 100).toFixed(2);
        }
        input.value = augmint.params[key];
    });
    // we assume there is only 1 loanProduct but it's fine for now
    document.getElementById("minimumLoanInAcd").value = augmint.loanProducts[0].minimumLoanInAcd.toString();
    document.getElementById("loanCollateralRatio").value = (augmint.loanProducts[0].loanCollateralRatio * 100).toFixed(
        2
    );
    document.getElementById("loanInterestPt").value = (augmint.loanProducts[0].interestPt * 100).toFixed(2);
    document.getElementById("repaymentPeriodInDays").value = augmint.loanProducts[0].repaymentPeriodInDays;
    document.getElementById("defaultFeePercentage").value = (
        augmint.loanProducts[0].defaultFeePercentage * 100
    ).toFixed(2);
    // technical params
    document.getElementById("ethUsdTrendSampleDays").value = augmint.params.ethUsdTrendSampleDays;
    document.getElementById("graphRefreshDays").value = augmint.params.graphRefreshDays;
}

function getActorsFromGui() {
    const actors = new Set();

    let paramItems = Array.from(document.querySelectorAll(".actor-item"));

    paramItems.forEach(paramItem => {
        let actorType = "";
        let actorName = "";
        let balances = {};
        let params = {};
        let count = null;
        let itemsWithData = Array.from(paramItem.querySelectorAll("[data-actor-param]"));
        itemsWithData.forEach(dataItem => {
            if (dataItem.getAttribute("data-actor-param") == "name") {
                actorName = dataItem.innerHTML;
            }

            if (dataItem.getAttribute("data-actor-param") == "type") {
                actorType = dataItem.innerHTML;
            }

            if (dataItem.getAttribute("data-actor-param") == "count") {
                if (dataItem.parentElement.className != "hidden") {
                    count = dataItem.value;
                }
            }

            // FIXME: mark params as ETH, ACD or Pt
            if (dataItem.getAttribute("data-actor-param") == "balance") {
                balances[dataItem.getAttribute("data-actor-balancename")] = Acd(dataItem.value);
            }

            if (dataItem.getAttribute("data-actor-param") == "param") {
                params[dataItem.getAttribute("data-actor-paramname")] = Pt(dataItem.value);
            }
        });
        const actor = new ActorDirectory[actorType](actorName, balances, null, params);
        actor.balances = balances;
        actor.parameters = params;
        if (count !== null) {
            actor.count = parseInt(count);
        }
        actors.add(actor);
    });
    return actors;
}

function showParamChangeAlert() {
    document.querySelector(".actor-alert").className = "actor-alert";
}

function hideParamChangeAlert() {
    document.querySelector(".actor-alert").className = "actor-alert hidden";
}

function togglePause() {
    paused = !paused;

    if (!started) {
        simulation.addActorsFromGui(getActorsFromGui());
        showParamChangeAlert();
    }

    if (paused) {
        // pausing sim:
        let runTime = Date.now() - benchmarkStart;
        restartBtn.disabled = false;
        pauseBtn.innerHTML = "Continue";
        updateUIFromParams();
        inputs.forEach(input => {
            input.disabled = false;
        });

        const loadproductInputs = Array.from(document.querySelectorAll(".loanproduct-input-container input"));
        loadproductInputs.forEach(input => {
            input.disabled = false;
        });

        graphs.refreshGraph();

        console.debug(
            "Benchmark: iterations/sec: ",
            benchmarkItCt / (runTime / 1000),
            "iteration count:" + benchmarkItCt + " running time: " + runTime + "ms"
        );
    } else {
        started = true;
        restartBtn.disabled = true;

        // Continuing the sim:
        benchmarkStart = Date.now();
        benchmarkItCt = 0;
        pauseBtn.innerHTML = "Pause";
        inputs.forEach(input => {
            input.disabled = true;
        });

        const loadproductInputs = Array.from(document.querySelectorAll(".loanproduct-input-container input"));
        loadproductInputs.forEach(input => {
            input.disabled = true;
        });

        const actorInputs = Array.from(document.querySelectorAll(".actor-inputs input"));
        actorInputs.forEach(input => {
            input.disabled = true;
        });

        simulation.patchAugmintParams(getParamsFromUI());
    }
}

function toggleLog() {
    logVisible = !logVisible;

    if (logVisible) {
        logWrapper.style.display = "block";
        toggleLogBtn.innerHTML = "Hide log";
    } else {
        logWrapper.style.display = "none";
        toggleLogBtn.innerHTML = "Show log";
    }
}

function ratesDropDownOnChange(newDay) {
    rates.setDay(newDay);
}

function populateRatesDropDown() {
    return new Promise(resolve => {
        for (let i = 0; i < rates.rates.length; i += 7) {
            let el = document.createElement("option");
            el.textContent = rates.rates[i].date + " | " + Math.round(rates.rates[i].close * 10000) / 10000;
            el.value = i;
            ratesDropDown.appendChild(el);
        }
        resolve();
    });
}

function collapse(e) {
    const subPanel = e.target;
    const panel = subPanel.parentElement;

    const style = panel.className;
    const closed = style.indexOf("closed") !== -1;

    if (closed) {
        panel.className = "collapse-panel";
        subPanel.innerHTML = subPanel.innerHTML.replace("+", "−");
        panel.querySelector(".collapse-content").className = "collapse-content";
    } else {
        panel.className = "collapse-panel closed";
        subPanel.innerHTML = subPanel.innerHTML.replace("−", "+");
        panel.querySelector(".collapse-content").className = "collapse-content hidden";
    }
}

function download(filename, text) {
    var element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function getMainParamsAsJSON() {
    const marketLockInterestRate = Pt(document.querySelector("[data-key='marketLockInterestRate']").value).toFixed(2);
    const lockedAcdInterestPercentage = Pt(
        document.querySelector("[data-key='lockedAcdInterestPercentage']").value
    ).toFixed(2);
    const marketLoanInterestRate = Pt(document.querySelector("[data-key='marketLoanInterestRate']").value).toFixed(2);
    const ltdLoanDifferenceLimit = Pt(document.querySelector("[data-key='ltdLoanDifferenceLimit']").value).toFixed(2);
    const ltdLockDifferenceLimit = Pt(document.querySelector("[data-key='ltdLockDifferenceLimit']").value).toFixed(2);
    const allowedLtdDifferenceAmount = document.querySelector("[data-key='allowedLtdDifferenceAmount']").value;
    const lockTimeInDays = document.querySelector("[data-key='lockTimeInDays']").value;
    const repaymentPeriodInDays = document.getElementById("repaymentPeriodInDays").value;
    const loanInterestPt = Pt(document.getElementById("loanInterestPt").value).toFixed(2);
    const loanCollateralRatio = Pt(document.getElementById("loanCollateralRatio").value).toFixed(2);
    const defaultFeePercentage = document.getElementById("defaultFeePercentage").value;
    const minimumLoanInAcd = document.getElementById("minimumLoanInAcd").value;
    const ethUsdTrendSampleDays = document.getElementById("ethUsdTrendSampleDays").value;

    var jsonObj = `{
                "marketLockInterestRate": "${marketLockInterestRate}",
                "lockedAcdInterestPercentage": "${lockedAcdInterestPercentage}",
                "marketLoanInterestRate": "${marketLoanInterestRate}",
                "ltdLoanDifferenceLimit": "${ltdLoanDifferenceLimit}",
                "ltdLockDifferenceLimit": "${ltdLockDifferenceLimit}",
                "allowedLtdDifferenceAmount": "${allowedLtdDifferenceAmount}",
                "lockTimeInDays": "${lockTimeInDays}",
                "repaymentPeriodInDays": "${repaymentPeriodInDays}",
                "loanInterestPt": "${loanInterestPt}",
                "loanCollateralRatio": "${loanCollateralRatio}",
                "defaultFeePercentage": "${defaultFeePercentage}",
                "minimumLoanInAcd": "${minimumLoanInAcd}",
                "ethUsdTrendSampleDays": "${ethUsdTrendSampleDays}"
              }`;

    return jsonObj;
}

function renderMainParams(jsonObj) {
    document.querySelector("[data-key='marketLockInterestRate']").value = jsonObj.marketLockInterestRate;
    document.querySelector("[data-key='lockedAcdInterestPercentage']").value = jsonObj.lockedAcdInterestPercentage;
    document.querySelector("[data-key='marketLoanInterestRate']").value = jsonObj.marketLoanInterestRate;
    document.querySelector("[data-key='ltdLoanDifferenceLimit']").value = jsonObj.ltdLoanDifferenceLimit;
    document.querySelector("[data-key='ltdLockDifferenceLimit']").value = jsonObj.ltdLockDifferenceLimit;
    document.querySelector("[data-key='allowedLtdDifferenceAmount']").value = jsonObj.allowedLtdDifferenceAmount;
    document.querySelector("[data-key='lockTimeInDays']").value = jsonObj.lockTimeInDays;
    document.getElementById("repaymentPeriodInDays").value = jsonObj.repaymentPeriodInDays;
    document.getElementById("loanInterestPt").value = jsonObj.loanInterestPt;
    document.getElementById("loanCollateralRatio").value = jsonObj.loanCollateralRatio;
    document.getElementById("defaultFeePercentage").value = jsonObj.defaultFeePercentage;
    document.getElementById("minimumLoanInAcd").value = jsonObj.minimumLoanInAcd;
    document.getElementById("ethUsdTrendSampleDays").value = jsonObj.ethUsdTrendSampleDays;
    document.getElementById("graphRefreshDays").value = jsonObj.graphRefreshDays;
}

function showJSONFileBrowser() {
    const panel = document.getElementById("json-file-input-panel");
    const style = panel.className;
    const hidden = style.indexOf("hidden") !== -1;

    if (hidden) {
        panel.className = "";
    } else {
        panel.className = "hidden";
    }
}

function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) return false;
    }
    return true;
}

function getParamsAsJSON() {
    var actorsFromGui = getActorsFromGui();
    const params = getMainParamsAsJSON();

    var jsonData = "{\"augmintOptions\": ";
    jsonData += "{\"params\":";
    jsonData += params;
    jsonData += ",";
    jsonData += "\"actors\": {";
    actorsFromGui.forEach(function(actor, index) {
        let tempActor = new Object();
        tempActor.type = actor.constructor.name;
        tempActor.count = actor.count;
        if (!isEmpty(actor.parameters)) tempActor.params = actor.parameters;
        tempActor.balances = actor.balances;
        jsonData += "\"" + actor.id + "\": ";
        jsonData += JSON.stringify(tempActor) + ",";
    });
    jsonData = jsonData.substring(0, jsonData.length - 1);
    jsonData += "}}}";
    return JSON.stringify(JSON.parse(jsonData), null, 4);
}

function saveToLocalStorage() {
    localStorage.setItem("parameters", getParamsAsJSON());
    msg.innerHTML = "Successfully saved to local storage.";
    msg.className = "msg";
    setTimeout(function() {
        msg.className = "msg msg-hidden";
    }, 2 * 1000);
}

function saveAsJSON() {
    download("params.json", getParamsAsJSON());
}

function collapseStore() {
    const panel = document.getElementById("store-panel");
    const style = panel.className;
    const hidden = style.indexOf("hidden") !== -1;

    if (hidden) {
        panel.className = "";
    } else {
        panel.className = "hidden";
    }
}

function getActorParamsBox(name, actor) {
    // let template = document.getElementById("actor-params-item").innerHTML;
    let balancesContent = "";
    for (var bal in actor.balances) {
        if (actor.balances.hasOwnProperty(bal)) {
            balancesContent += `<label class="technical-inputs actor-label">${bal}</label>
                <input data-actor-balancename="${bal}" data-actor-param="balance" type="number" value="${
    actor.balances[bal]
}"/><br/>`;
        }
    }

    let paramsContent = "";
    for (var p in actor.params) {
        if (actor.params.hasOwnProperty(p)) {
            paramsContent += `<label class="technical-inputs actor-label small-label">${p}</label>
                 <input data-actor-paramname="${p}" data-actor-param="param" type="number" value="${actor.params[p]}" />
                 <br/>`;
        }
    }

    const template = `<div id="actor-params-item">
        <div class="flex-item actor-item">
          <div class="actor-inputs">
            <h4 data-actor-param="name">${name}</h4>
            <span data-actor-param="type" class="actor-type">${actor.type}</span><br/>
            <span class="${
    actor.count ? "" : "hidden"
}"><label class="technical-inputs actor-label">count: </label><input type="number" data-actor-param="count" value="${
    actor.count ? actor.count : 0
}"/><br/></span>
            <h5>Starting balance</h5>
              ${balancesContent}
              ${actor.params ? "<h5>params</h5>" : ""}
              ${paramsContent}
          </div>
        </div>
      </div>`;

    return template;
}

function renderActorParamsGui(actors) {
    const panel = document.getElementById("actor-params-container");
    const collapseBars = document.querySelectorAll(".collapse-bar");

    for (let i = 0; i < collapseBars.length; ++i) {
        collapseBars[i].addEventListener("click", collapse, true);
    }

    let content = "";

    for (var name in actors) {
        if (actors.hasOwnProperty(name)) {
            content += getActorParamsBox(name, actors[name]);
        }
    }

    panel.innerHTML = content;
}

function restart() {
    hideParamChangeAlert();
    const actorInputs = Array.from(document.querySelectorAll(".actor-inputs input"));
    actorInputs.forEach(input => {
        input.disabled = false;
    });
    lastRender = -1;
    clockElem.innerHTML = "0";
    started = false;
    graphs.clear(graphsWrapper);
    graphs.init(graphsWrapper);

    restartBtn.disabled = true;
    logger.clear();
    logger.init(simulation.getState, logTextArea);
    simulation.init({
        simulationParams: {
            randomSeed: "change this for different repeatable results. or do not pass for a random seed",
            timeStep: 60 * 60 * 4 // 4 hours
        },
        // TODO: move all balances and params to UI
        augmintOptions: scenario.augmintOptions
    });
    simulation.patchAugmintParams(getParamsFromUI());
}

function parseLoadedJSON(contents) {
    const jsonObj = JSON.parse(contents);
    renderActorParamsGui(jsonObj.augmintOptions.actors);
    renderMainParams(jsonObj.augmintOptions.params);
}

function loadFile(e) {
    var file = e.target.files[0];
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        var contents = e.target.result;
        parseLoadedJSON(contents);
    };
    reader.readAsText(file);
}

function loadFromLocalStorage() {
    const jsonObj = JSON.parse(localStorage.getItem("parameters"));
    renderActorParamsGui(jsonObj.augmintOptions.actors);
    renderMainParams(jsonObj.augmintOptions.params);
}

function init() {
    if (window.File && window.FileReader && window.FileList && window.Blob) {
        jsonFileInput.addEventListener("change", loadFile, false);
    } else {
        errorMsg.innerHTML = "<p>File api not supported by your browser</p>";
    }

    renderActorParamsGui(scenario.actors);

    graphs.init(graphsWrapper);
    logger.init(simulation.getState, logTextArea);

    populateRatesDropDown();

    restartBtn.disabled = true;
    restartBtn.addEventListener("click", restart);
    storeBtn.addEventListener("click", collapseStore);
    saveJSONBtn.addEventListener("click", saveAsJSON);
    loadJSONBtn.addEventListener("click", showJSONFileBrowser);
    saveLSBtn.addEventListener("click", saveToLocalStorage);
    loadLSBtn.addEventListener("click", loadFromLocalStorage);

    pauseBtn.addEventListener("click", togglePause);
    ratesDropDown.addEventListener("change", () => ratesDropDownOnChange(ratesDropDown.value));
    clearLogBtn.addEventListener("click", () => logger.clear());
    dumpStateBtn.addEventListener("click", () => {
        simulation.patchAugmintParams(getParamsFromUI());
        logger.print(simulation.getState());
    });
    dumpMovesLogBtn.addEventListener("click", () => {
        let startPos = 0;
        logTextArea.focus();
        let endPos = logTextArea.textLength;
        startPos += logTextArea.value.substring(startPos, endPos).indexOf("\n") + 1;
        endPos = startPos + logTextArea.value.substring(startPos, endPos - 2).lastIndexOf("\n");
        logTextArea.selectionStart = startPos;
        logTextArea.selectionEnd = endPos;
        document.execCommand("copy");
        alert("log copied to clipboard");
    });

    toggleLogBtn.addEventListener("click", toggleLog);

    simulation.init({
        simulationParams: {
            randomSeed: "change this for different repeatable results. or do not pass for a random seed",
            timeStep: 60 * 60 * 4 // 4 hours
        },
        // TODO: move all balances and params to UI
        augmintOptions: scenario.augmintOptions
    });
    updateUIFromParams();
}

function render() {
    const state = simulation.getState();
    const daysPassed = state.meta.currentDay;

    // only update graphData once per day:
    if (daysPassed > lastRender) {
        lastRender = daysPassed;
        clockElem.innerHTML = daysPassed;
        graphs.updateData(state.meta.currentTime, state.augmint);
        if (state.meta.currentDay % state.augmint.params.graphRefreshDays === 0) {
            graphs.refreshGraph();
        }
    }
}

function mainLoop() {
    let doFrame = false;
    let start = Date.now();
    while (!paused && !doFrame) {
        benchmarkItCt++;
        try {
            simulation.incrementBy();
        } catch (err) {
            if (err instanceof AugmintError) {
                console.error(err);
                errorMsg.innerHTML = "<p>AugmintError: " + err.message + "</p>";
                togglePause();
            } else {
                errorMsg.innerHTML = "<p>Error: " + err.message + "</p>";
                throw err;
            }
        }
        render();
        doFrame = Date.now() - start > 10;
    }
    requestAnimationFrame(mainLoop);
}

window.addEventListener("load", () => {
    init();
    mainLoop();
});
