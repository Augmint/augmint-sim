"use strict";

const bigNums = require("./lib/bigNums.js");
const Acd = bigNums.BigAcd;
const Pt = bigNums.BigPt;

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
const dumpStateBtn = document.querySelector(".dumpState-btn");
const dumpMovesLogBtn = document.querySelector(".dumpMovesLog-btn");
const toggleLogBtn = document.querySelector(".toggleLog-btn");
const logWrapper = document.querySelector(".log-wrapper");
const logTextArea = document.querySelector(".log-textarea");
const ratesDropDown = document.querySelector(".rates-dropdown");
const inputs = Array.from(document.querySelectorAll(".sim-inputs input"));

const graphsWrapper = document.querySelector(".graphs-wrapper");
const errorMsg = document.querySelector(".error-msg");

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
            key === "ltdDifferenceLimit"
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
            key === "ltdDifferenceLimit"
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
        // console.log(balances);
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

function togglePause() {
    paused = !paused;

    if (!started) {
        simulation.addActorsFromGui(getActorsFromGui());
        showParamChangeAlert();
    }

    if (paused) {
        // pausing sim:
        let runTime = Date.now() - benchmarkStart;
        pauseBtn.innerHTML = "Continue";
        updateUIFromParams();
        inputs.forEach(input => {
            input.disabled = false;
        });

        const loadproductInputs = Array.from(document.querySelectorAll(".loanproduct-input-container input"));
        loadproductInputs.forEach(input => {
            input.disabled = false;
        });

        console.debug(
            "Benchmark: iterations/sec: ",
            benchmarkItCt / (runTime / 1000),
            "iteration count:" + benchmarkItCt + " running time: " + runTime + "ms"
        );
    } else {
        started = true;

        // restarting sim:
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

function collapse() {
    const style = document.querySelector(".collapse-panel").className;
    const closed = style.indexOf("closed") !== -1;

    if (closed) {
        document.querySelector(".collapse-panel").className = "collapse-panel";
        document.querySelector(".collapse-button").innerHTML = "&minus;";
        document.querySelector(".collapse-content").className = "collapse-content";
    } else {
        document.querySelector(".collapse-panel").className = "collapse-panel closed";
        document.querySelector(".collapse-button").innerHTML = "+";
        document.querySelector(".collapse-content").className = "collapse-content hidden";
    }
}

function getActorParamsBox(name, actor) {
    let template = document.getElementById("actor-params-item").innerHTML;
    template = template.replace("###NAME###", name);
    template = template.replace("###TYPE###", actor.type);
    if (actor.count !== undefined) {
        template = template.replace("<span class=\"hidden\">", "<span>");
        template = template.replace("###COUNT###", actor.count);
    }

    let balancesContent = "";
    for (var bal in actor.balances) {
        if (actor.balances.hasOwnProperty(bal)) {
            balancesContent +=
                "<label class=\"technical-inputs actor-label\">" +
                bal +
                ": </label><input data-actor-balancename=\"" +
                bal +
                "\" data-actor-param=\"balance\" type=\"number\" value=\"" +
                actor.balances[bal] +
                "\"/><br/>";
        }
    }
    template = template.replace("###BALANCES###", balancesContent);

    if (actor.params === undefined) {
        template = template.replace("<h5>params</h5>", "");
        template = template.replace("###PARAMS###", "");
    } else {
        let paramsContent = "";
        for (var p in actor.params) {
            if (actor.params.hasOwnProperty(p)) {
                paramsContent +=
                    "<label class=\"technical-inputs actor-label small-label\">" +
                    p +
                    ": </label><input data-actor-paramname=\"" +
                    p +
                    "\" data-actor-param=\"param\" type=\"number\" value=\"" +
                    actor.params[p] +
                    "\"/><br/>";
            }
        }
        template = template.replace("###PARAMS###", paramsContent);
    }

    return template;
}

function renderActorParamsGui() {
    const panel = document.getElementById("actor-params-container");
    const collapsePanel = document.querySelector(".collapse-bar");

    collapsePanel.addEventListener("click", collapse);

    let content = "";

    for (var name in scenario.actors) {
        if (scenario.actors.hasOwnProperty(name)) {
            content += getActorParamsBox(name, scenario.actors[name]);
        }
    }

    panel.innerHTML = content;
}

function init() {
    renderActorParamsGui();

    graphs.init(graphsWrapper);
    logger.init(simulation.getState, logTextArea);

    populateRatesDropDown();

    pauseBtn.addEventListener("click", togglePause);
    ratesDropDown.addEventListener("change", () => ratesDropDownOnChange(ratesDropDown.value));

    dumpStateBtn.addEventListener("click", () => {
        simulation.patchAugmintParams(getParamsFromUI());
        logger.print(simulation.getState());
    });

    dumpMovesLogBtn.addEventListener("click", () => {
        let startPos = logTextArea.textLength;
        logger.printMovesLog();
        logTextArea.focus();
        let endPos = logTextArea.textLength;
        startPos += logTextArea.value.substring(startPos, endPos).indexOf("\n") + 1;
        endPos = startPos + logTextArea.value.substring(startPos, endPos - 2).lastIndexOf("\n");
        logTextArea.selectionStart = startPos;
        logTextArea.selectionEnd = endPos;
        document.execCommand("copy");
        alert("Moves log CSV copied to clipboard");
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

    // only re-render once per day:
    if (daysPassed > lastRender) {
        lastRender = daysPassed;
        clockElem.innerHTML = daysPassed;
        graphs.update(state.meta.currentTime, state.augmint);
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
