'use strict';
const Chart = require('chart.js');
const DARKGREEN = 'rgba(3, 71, 50, 1)';
const GREEN = 'rgba(0, 129, 72, 1)';
const YELLOW = 'rgba(198, 192, 19, 1)';
const ORANGE = 'rgba(239, 138, 23, 1)';
const RED = 'rgba(239, 41, 23, 1)';
const DARKRED = 'rgba(141, 8, 1, 1)';

const GREY_OPA = 'rgb(230, 88, 88)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const DARKGREEN_OPA = 'rgba(3, 71, 50, 0.2)';
const GREEN_OPA = 'rgba(0, 129, 72,  0.2)';
const YELLOW_OPA = 'rgba(198, 192, 19,  0.2)';
const ORANGE_OPA = 'rgba(239, 138, 23,  0.2)';
const RED_OPA = 'rgba(239, 41, 23,  0.2)';
const DARKRED_OPA = 'rgba(141, 8, 1,  0.2)';
const ONE_DAY_IN_SECS = 24 * 60 * 60;

// prettier-ignore
const graphs = [
    {
        title: 'ETH/USD',
        options: { scales: { yAxes: [ {ticks: { suggestedMax: 2 } } ] } },
        datasets: [{
            func: augmint => { return augmint.rates.ethToUsd; },
            options: { backgroundColor: TRANSPARENT}
        }]
    },
    {
        title: 'Net ACD Demand',
        options: { scales: { yAxes: [ {ticks: { min: undefined } } ] } },
        datasets: [{
            func: augmint => { return Math.round(augmint.netAcdDemand);}
        }]
    },
    {
        title: 'ACD Demand (% of total ACD)',
        options: { scales: { yAxes: [ {ticks: {min: undefined} }]}},
        datasets: [{
            func: augmint => {
                return Math.round(augmint.netAcdDemand / augmint.totalAcd * 100);
            },
            options: { backgroundColor: TRANSPARENT }
        }]
    },
    {
        title: 'Total ACD',
        datasets: [{
            func: augmint => { return Math.round(augmint.totalAcd); }
        }]
    },
    {
        title: 'ACD Supply Distribution',
        options: {
            title: { display: false },
            legend: { display: true },
            scales: { yAxes: [{ stacked: true}]},
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },
        datasets: [
            {
                func: augmint => { return (augmint.systemAcd); },
                options: {
                    label: 'system',
                    borderColor: DARKGREEN,
                    backgroundColor: DARKGREEN
                }
            },
            {
                func: augmint => { return augmint.balances.lockedAcdPool; },
                options: {
                    label: 'locked',
                    borderColor: YELLOW,
                    backgroundColor: YELLOW
                }
            },
            {
                func: augmint => {
                    return augmint.usersAcd;
                },
                options: {
                    label: 'user',
                    borderColor: RED,
                    backgroundColor: RED
                }
            }
        ]
    },
    {
        title: 'users\' ACD (accs + orders)',
        datasets: [{
            func: augmint => { return augmint.usersAcd; }
        }]
    },
    {
        title: 'ACD Reserves',
        datasets: [{
            func: augmint => { return augmint.reserveAcd; }
        }]
    },
    {
        title: 'ETH Reserves',
        datasets: [{
            func: augmint => { return augmint.reserveEth; }
        }]
    },
    {
        title: 'Interest Earned (ACD)',
        datasets: [{
            func: augmint => { return augmint.balances.interestEarnedPool; }
        }]
    },
    {
        title: 'ACD Locked',
        datasets: [{
            func: augmint => { return augmint.balances.lockedAcdPool; }
        }]
    },
    {
        title: 'ACD in open Loans',
        datasets: [{
            func: augmint => { return augmint.balances.openLoansAcd; }
        }]
    },
    {
        title: 'Total default Loans (ACD)',
        datasets: [{
            func: augmint => { return augmint.balances.defaultedLoansAcd; }
        }]
    },

    {
        title: 'ACD fees earned',
        datasets: [{
            func: augmint => { return augmint.balances.acdFeesEarned; }
        }]
    },
    {
        title: 'ETH fees earned',
        datasets: [{
            func: augmint => { return augmint.balances.ethFeesEarned; }
        }]
    }
];

function init(wrapper) {
    Chart.defaults.global.responsive = false;
    Chart.defaults.global.maintainAspectRatio = true;
    Chart.defaults.global.title.display = true;
    Chart.defaults.global.tooltips.enabled = false;
    Chart.defaults.global.animation.duration = 0;
    Chart.defaults.global.hover.mode = null;
    Chart.defaults.global.legend.display = false;
    Chart.defaults.global.elements.line.tension = 0;
    Chart.defaults.global.elements.line.borderWidth = 2;
    Chart.defaults.global.elements.line.borderColor = GREY_OPA;
    Chart.defaults.global.elements.point.radius = 0;
    Chart.scaleService.updateScaleDefaults('linear', {
        ticks: {
            min: 0,
            suggestedMax: 10
        }
    });

    graphs.forEach(graph => {
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);

        canvas.height = 250;
        canvas.width = 300;

        graph.canvas = canvas;
        graph.ctx = canvas.getContext('2d');
        graph.xData = [];
        graph.datasetsPassed = [];
        graph.datasets.forEach(dataset => {
            dataset.yData = [];
            graph.datasetsPassed.push(
                Object.assign(
                    {
                        label: dataset.options ? dataset.options.label || graph.title : 'NA',
                        data: dataset.yData
                    },
                    dataset.options
                )
            );
        });
        graph.chart = new Chart(graph.ctx, {
            type: graph.type || 'line',
            data: {
                labels: graph.xData,
                datasets: graph.datasetsPassed
            },
            options: Object.assign(
                {
                    title: { text: graph.title }
                },
                graph.options
            )
        });
    });
}

function update(timeInSecs, augmint) {
    graphs.forEach(graph => {
        // update data for graphs:
        graph.xData.push(Math.floor(timeInSecs / ONE_DAY_IN_SECS));
        graph.datasets.forEach(dataset => {
            dataset.yData.push(dataset.func(augmint));
            if (dataset.yData.length > 365) {
                dataset.yData.shift();
            }
        });

        if (graph.xData.length > 365) {
            graph.xData.shift();
        }

        // redraw:
        graph.chart.update();
    });
}

module.exports = {
    init,
    update
};
