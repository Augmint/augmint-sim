'use strict';
const Chart = require('chart.js');
const PURPLE = 'rgba(139, 95, 191, 1)';
//const DARKGREEN = 'rgba(3, 71, 50, 1)';
const GREEN = 'rgba(0, 129, 72, 1)';
const YELLOW = 'rgba(198, 192, 19, 1)';
const ORANGE = 'rgba(239, 138, 23, 1)';
const RED = 'rgba(239, 41, 23, 1)';
const BLUE = 'rgba(41, 51, 155, 1)';

const DARKRED = 'rgba(141, 8, 1, 1)';

//const PURPLE_OPA = 'rgba(139, 95, 191, 0.2)';
const GREY_OPA = 'rgb(230, 88, 88)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
//const DARKGREEN_OPA = 'rgba(3, 71, 50, 0.2)';
const GREEN_OPA = 'rgba(0, 129, 72,  0.2)';
//const YELLOW_OPA = 'rgba(198, 192, 19,  0.2)';
const ORANGE_OPA = 'rgba(239, 138, 23,  0.2)';
//const RED_OPA = 'rgba(239, 41, 23,  0.2)';
const DARKRED_OPA = 'rgba(141, 8, 1,  0.2)';
const BLUE_OPA = 'rgba(41, 51, 155, 0.2)';

const DEFAULT_COLOR = RED;
const DEFAULT_COLOR_BG = GREY_OPA;
const ACD_SUPPLY_COLOR = BLUE;
const ACD_SUPPLY_COLOR_OPA = BLUE_OPA;
const LOCKED_ACD_COLOR = YELLOW;
//const LOCKED_ACD_COLOR_OPA = YELLOW_OPA;
const FLOATING_ACD_COLOR = ORANGE;
const FLOATING_ACD_COLOR_OPA = ORANGE_OPA;
const SYSTEM_ACC_COLOR = GREEN;
const SYSTEM_ACC_COLOR_OPA = GREEN_OPA;
const DEFAULTED_COLOR = DARKRED;
const DEFAULTED_COLOR_OPA = DARKRED_OPA;
const OPEN_LOANS_COLOR = PURPLE;
//const OPEN_LOANS_COLOR_OPA = PURPLE_OPA;

const DASHED_LINE = [5, 5];

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
    // {
    //     title: 'ETH/USD trend ',
    //     options: { scales: { yAxes: [ {ticks: { suggestedMax: 0.02, min: undefined } } ] } },
    //     datasets: [{
    //         func: augmint => { return Math.round(augmint.rates.ethToUsdTrend*1000); },
    //         options: { backgroundColor: TRANSPARENT}
    //     }]
    // },
    {
        title: 'Open ACD Demand \'000s',
        options: { scales: { yAxes: [ {ticks: { min: undefined } } ] } },
        datasets: [{
            func: augmint => { return Math.round(augmint.netAcdDemand / 1000);}
        }]
    },
    {
        title: 'Loan to Lock Ratio',
        options: {
            title: { display: false },
            scales: { yAxes: [ {ticks: { suggestedMin: 0.5, suggestedMax: 1.5 } } ] },
            legend: { display: true },
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },
        datasets: [
            {
            func: augmint => (1 + augmint.params.ltdDifferenceLimit),
                options: {
                        label: 'loan limit',
                        borderDash: DASHED_LINE,
                        borderColor: OPEN_LOANS_COLOR,
                        backgroundColor: TRANSPARENT
                    }
            },
            {
            func: augmint => ( 1 - augmint.params.ltdDifferenceLimit),
                options: {
                        label: 'lock limit',
                        borderDash: DASHED_LINE,
                        borderColor: LOCKED_ACD_COLOR,
                        backgroundColor: TRANSPARENT
                    }
            },
            {
            func: augmint => { return augmint.loanToDepositRatio; },
                options: {
                    label: 'current loan to lock ratio',
                    borderColor: DEFAULT_COLOR,
                    backgroundColor: TRANSPARENT
                }
        }]
    },
    {
        title: 'Open ACD user demand (% of total ACD)',
        options: { scales: { yAxes: [ {ticks: {min: undefined} }]}},
        datasets: [{
            func: augmint => {
                return Math.round(augmint.netAcdDemand / augmint.totalAcd * 100);
            },
            options: { backgroundColor: TRANSPARENT }
        }]
    },
    {
        title: 'Total ACD \'000s',
        datasets: [{
            func: augmint => { return Math.round(augmint.totalAcd / 1000); },
            options: {
                borderColor: ACD_SUPPLY_COLOR,
                backgroundColor: ACD_SUPPLY_COLOR_OPA
            }
        }]
    },
    {
        title: 'ACD Supply Distribution \'000s',
        options: {
            title: { display: false },
            legend: { display: true },
            scales: { yAxes: [{ stacked: true}]},
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },
        datasets: [
            {
                func: augmint => { return (augmint.systemAcd / 1000); },
                options: {
                    label: 'system',
                    borderColor: SYSTEM_ACC_COLOR,
                    backgroundColor: SYSTEM_ACC_COLOR
                }
            },
            {
                func: augmint => { return augmint.balances.lockedAcdPool / 1000; },
                options: {
                    label: 'locked',
                    borderColor: LOCKED_ACD_COLOR,
                    backgroundColor: LOCKED_ACD_COLOR
                }
            },
            {
                func: augmint => {
                    return augmint.floatingAcd / 1000;
                },
                options: {
                    label: 'floating',
                    borderColor: FLOATING_ACD_COLOR,
                    backgroundColor: FLOATING_ACD_COLOR
                }
            }
        ]
    },
    {
        title: 'floating ACD (accs + orders) \'000s',
        datasets: [{
            func: augmint => { return Math.round(augmint.floatingAcd / 1000); },
            options: {
                label: 'user',
                borderColor: FLOATING_ACD_COLOR,
                backgroundColor: FLOATING_ACD_COLOR_OPA
            }
        }]
    },
    {
        title: 'ACD Reserves \'000s',
        datasets: [{
            func: augmint => { return augmint.reserveAcd / 1000; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
        }]
    },
    {
        title: 'ETH Reserves (ETH)',
        datasets: [{
            func: augmint => { return augmint.reserveEth; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
        }]
    },
    {
        title: 'ETH Reserves (USD) \'000s',
        datasets: [{
            func: augmint => { return augmint.reserveEth * augmint.rates.ethToUsd / 1000; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
        }]
    },
    {
        title: 'Interest rates',
        options: {
            title: { display: false },
            scales: { yAxes: [ {ticks: {suggestedMax: 10} }]},
            legend: { display: true },
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },

        datasets: [{
            func: augmint => { return augmint.params.lockedAcdInterestPercentage * 100; },
            options: {
                    label: 'lock interest %',
                    borderColor: LOCKED_ACD_COLOR,
                    backgroundColor: TRANSPARENT
                }
            },
            {
            func: augmint => { return augmint.loanProducts[0].interestPt * 100; },
                options: {
                        label: 'loan interest %',
                        borderColor: OPEN_LOANS_COLOR,
                        backgroundColor: TRANSPARENT
                    }
            },
            {
            func: augmint => { return augmint.params.marketLockInterestRate * 100; },
                options: {
                    label: 'mkt lock %',
                    borderDash: DASHED_LINE,
                    borderColor: LOCKED_ACD_COLOR,
                    backgroundColor: TRANSPARENT
                }
            },
            {
            func: augmint => { return augmint.params.marketLoanInterestRate * 100; },
                options: {
                        label: 'mkt loan %',
                        borderDash: DASHED_LINE,
                        borderColor: OPEN_LOANS_COLOR,
                        backgroundColor: TRANSPARENT
                    }
            }
        ]
    },
    {
        title: 'Loan Collateral Ratio %',
        options: { scales: { yAxes: [ {ticks: { suggestedMax: 80, suggestedMin: 20 } } ] } },
        datasets: [{
            func: augmint => { return augmint.loanProducts[0].loanCollateralRatio * 100; },
            options: {
                borderColor: OPEN_LOANS_COLOR,
                backgroundColor: TRANSPARENT
            }
        }]
    },
    {
        title: 'Interest Earned (ACD)',
        datasets: [{
            func: augmint => { return augmint.balances.interestEarnedPool; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
        }]
    },
    {
        title: 'Max allowed lock/loan',
        options: {
            title: { display: false },
            legend: { display: true },
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },
        datasets: [{
            func: augmint => { return augmint.maxLockableAmount; },
            options: {
                    label: 'maxLockable',
                    borderColor: LOCKED_ACD_COLOR,
                    backgroundColor: TRANSPARENT
                }
        },
        {
            func: augmint => { return augmint.maxBorrowableAmount(0); },
            options: {
                label: 'maxBorrowable',
                borderColor: OPEN_LOANS_COLOR,
                backgroundColor: TRANSPARENT
            }
        }]
    },
    {
        title: 'ACD Locked',
        options: {
            title: { display: false },
            legend: { display: true },
            tooltips: { enabled: true , mode: 'index', intersect: false}
        },
        datasets: [{
            func: augmint => { return augmint.balances.lockedAcdPool; },
            options: {
                    label: 'locked',
                    borderColor: LOCKED_ACD_COLOR,
                    backgroundColor: TRANSPARENT
                }
        },
        {
            func: augmint => { return augmint.balances.openLoansAcd; },
            options: {
                label: 'loans',
                borderColor: OPEN_LOANS_COLOR,
                backgroundColor: TRANSPARENT
            }
        }]
    },
    {
        title: 'Total default Loans (ACD)',
        datasets: [{
            func: augmint => { return augmint.balances.defaultedLoansAcd; },
            options: {
                borderColor: DEFAULTED_COLOR,
                backgroundColor: DEFAULTED_COLOR_OPA
            }
        }]
    },

    {
        title: 'ACD fees earned',
        datasets: [{
            func: augmint => { return augmint.balances.acdFeesEarned; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
        }]
    },
    {
        title: 'ETH fees earned',
        datasets: [{
            func: augmint => { return augmint.balances.ethFeesEarned; },
            options: {
                borderColor: SYSTEM_ACC_COLOR,
                backgroundColor: SYSTEM_ACC_COLOR_OPA
            }
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
    Chart.defaults.global.elements.line.borderColor = DEFAULT_COLOR;
    Chart.defaults.global.elements.line.backgroundColor = DEFAULT_COLOR_BG;
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
        //canvas.width = 300;
        canvas.width =
            graph.title === 'ETH/USD' ||
            graph.title === 'Open ACD Demand \'000s' ||
            graph.title === 'Loan to Lock Ratio' ? 920 : 300;

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
            if (dataset.yData.length > 365 &&
                graph.title !== 'ETH/USD' &&
                graph.title !== 'Open ACD Demand \'000s' &&
                graph.title !== 'Loan to Lock Ratio') {
                    dataset.yData.shift();
            }
        });

        if (graph.xData.length > 365 &&
            graph.title !== 'ETH/USD' &&
            graph.title !== 'Open ACD Demand \'000s' &&
            graph.title !== 'Loan to Lock Ratio') {
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
