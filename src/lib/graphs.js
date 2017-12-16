'use strict';
const Chart = require('chart.js');

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const graphs = [
    {
        title: 'ETH/USD',
        func: augmint => {
            return augmint.rates.ethToUsd;
        }
    },
    {
        title: 'Net ACD Demand',
        func: augmint => {
            return Math.round(augmint.netAcdDemand);
        }
    },
    {
        title: 'ACD Demand (% of total ACD)',
        func: augmint => {
            return Math.round(augmint.netAcdDemand / augmint.totalAcd * 100) / 100;
        }
    },
    {
        title: 'Total ACD',
        func: augmint => {
            return Math.round(augmint.totalAcd);
        }
    },
    {
        title: 'ACD Reserves',
        func: augmint => {
            return augmint.actors.reserve.balances.acd;
        }
    },
    {
        title: 'ETH Reserves',
        func: augmint => {
            return augmint.actors.reserve.balances.eth;
        }
    },
    {
        title: 'Interest Earned (ACD)',
        func: augmint => {
            return augmint.balances.interestEarnedPool;
        }
    },
    {
        title: 'ACD Locked',
        func: augmint => {
            return augmint.balances.lockedAcdPool;
        }
    },
    {
        title: 'ACD in open Loans',
        func: augmint => {
            return augmint.balances.openLoansAcd;
        }
    },
    {
        title: 'Total default Loans (ACD)',
        func: augmint => {
            return augmint.balances.defaultedLoansAcd;
        }
    },

    {
        title: 'ACD fees earned',
        func: augmint => {
            return augmint.balances.acdFeesEarned;
        }
    },
    {
        title: 'ETH fees earned',
        func: augmint => {
            return augmint.balances.ethFeesEarned;
        }
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
    Chart.defaults.global.elements.line.borderColor = 'rgb(230, 88, 88)';
    Chart.defaults.global.elements.point.radius = 0;
    graphs.forEach(graph => {
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);

        canvas.height = 250;
        canvas.width = 300;

        graph.canvas = canvas;
        graph.ctx = canvas.getContext('2d');
        graph.xData = [];
        graph.yData = [];
        graph.chart = new Chart(graph.ctx, {
            type: 'line',
            data: {
                labels: graph.xData,
                datasets: [
                    {
                        label: graph.title,
                        data: graph.yData
                    }
                ]
            },
            options: {
                title: { text: graph.title }
            }
        });
    });
}

function update(timeInSecs, augmint) {
    graphs.forEach(graph => {
        // update data for graphs:
        graph.xData.push(Math.floor(timeInSecs / ONE_DAY_IN_SECS));
        graph.yData.push(graph.func(augmint));

        if (graph.xData.length > 365) {
            graph.xData.shift();
        }

        if (graph.yData.length > 365) {
            graph.yData.shift();
        }

        // redraw:
        graph.chart.update();
    });
}

module.exports = {
    init,
    update
};
