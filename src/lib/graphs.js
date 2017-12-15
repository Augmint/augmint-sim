'use strict';
/*  global Chart */

const ONE_DAY_IN_SECS = 24 * 60 * 60;

const graphs = [
    {
        title: 'Total ACD',
        func: augmint => {
            return Math.round(augmint.totalAcd);
        }
    },
    {
        title: 'Interest Earned (ACD)',
        func: augmint => {
            return augmint.balances.interestEarnedPool;
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
        title: 'ETH/USD',
        func: augmint => {
            return augmint.rates.ethToUsd;
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
                        data: graph.yData,
                        radius: 0,
                        borderColor: 'rgb(230, 88, 88)'
                    }
                ]
            },
            options: {
                title: { display: true, text: graph.title },
                responsive: false,
                maintainAspectRatio: true,
                tooltips: { enabled: false },
                animation: { duration: 0 },
                hover: { mode: null },
                legend: { display: false }
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
