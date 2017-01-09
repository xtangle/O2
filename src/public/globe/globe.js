// globe.js
// Dependencies: jquery, lodash, d3, d3.topojson, d3.queue, jquery.tablesorter, cashBalanceController.js

// ================================================================
// Parameter definitions

const base_url = location.protocol + '//' + location.hostname + (location.port && ':' + location.port) + '/';

// Globe parameters
const width = 600, height = 600;
const sens_0 = 0.25, sens_adjust = 0.2;
const scale_0 = 300, scale_min = 150, scale_max = 1200;

const rot_lambda_0 = 90, rot_phi_0 = -20, rot_gamma_0 = 0;
const rot_phi_limit = 90;
const rot_v_lambda = -0.2, rot_v_phi = 0, rot_v_gamma = 0;

const cash_bal_danger = -100000, cash_bal_warn = -10000, cash_bal_zero = 0, cash_bal_ok = 100000, cash_bal_excess = 1000000;
const color_trans_time_in_ms = 1000, color_trans_freq = 100;

var sens = sens_0;
var focused = false;
var animate = true;
var hoveredId;
var tableSorterInitialized = false;
var hasDragged = false;

var lastBalanceBeforeUpdate;

// ================================================================
// Globe setup

// Set base currency header in cash balance table
const cashBalanceTable = $('#cash-balance-table');
cashBalanceTable.find('.base-currency-header')
  .text('Cash Balance (' + cashBalCtrl.getBaseCurrencyCode() + ')');

// Setting projection
var projection = d3.geo.orthographic()
  .scale(scale_0)
  .rotate([rot_lambda_0, rot_phi_0, rot_gamma_0])
  .translate([width / 2, height / 2])
  .clipAngle(90);

var path = d3.geo.path()
  .projection(projection);

// SVG container
var svg = d3.select('#globe')
  .attr('width', width)
  .attr('height', height);

// Adding water
svg.append('path')
  .datum({type: 'Sphere'})
  .attr('class', 'water')
  .attr('d', path);

var countryTooltip = d3.select('body').append('div').attr('class', 'countryTooltip');

queue()
  .defer(d3.json, 'globe/world-110m-withlakes.json')
  .defer(cashBalCtrl.init)
  .await(ready);

// ================================================================
// Main function
function ready(error, world) {
  if (error) {
    throw error;
  }

  // ================================================================
  // Initializing the DOM and registering cash balance controller events

  var animateCheckbox = $('#animate');
  animateCheckbox.prop('checked', animate);
  animateCheckbox.on('click', function () {
    if (animate) {
      stopAnimation();
    } else {
      startAnimation();
    }
  });

  // Update transaction table when a new transaction is received
  cashBalCtrl.onNewTransaction(function (transaction) {
    $('#transaction-amount').text(Math.round(transaction.netSettlementAmount).toLocaleString());
    $('#transaction-currency').text(transaction.settlementCurrency);
    $('#transaction-date').text(transaction.receivedDateAndTime);

    // Record the old balance of the affected currency
    lastBalanceBeforeUpdate = _.defaultTo(
      cashBalCtrl.getCashBalanceForCurrency(transaction.settlementCurrency, {inBaseCurrency: true}), 0);
  });

  // Re-color the affected countries, update the tooltip, and the cash balances table when cash balance is updated
  cashBalCtrl.onCashBalanceUpdate(function (ids) {
    updateCashBalanceTable(ids[0]);
    updateTooltipText();

    // Color transition
    var oldBalance = lastBalanceBeforeUpdate;
    var newBalance = cashBalCtrl.getCashBalancesInBaseCurrency()[ids[0]];
    var refreshPeriod = color_trans_time_in_ms / color_trans_freq;

    var balanceIncr = (newBalance - oldBalance) / color_trans_freq;
    var balances = _.range(oldBalance + balanceIncr, newBalance + balanceIncr, balanceIncr);
    var countryElements = ids.map(function (id) {
      return svg.selectAll('path#country-' + id);
    });

    var i = 0;
    var intervalId = setInterval(function () {
      var color = cashBalanceToColor(balances[i]);
      countryElements.forEach(function (elem) {
        elem.style('fill', color);
      });
      if (++i === color_trans_freq) {
        window.clearInterval(intervalId);
      }
    }, refreshPeriod);
  });

  // ================================================================
  // Initializing the globe

  var countries = topojson.feature(world, world.objects.countries).features;
  var lakes = topojson.feature(world, world.objects.ne_110m_lakes).features;

  // Draw countries on the globe
  countries.forEach(function (d) {
    var color = cashBalanceToColor(cashBalCtrl.getCashBalancesInBaseCurrency()[d.id]);
    var idAttr = 'country-' + d.id;
    svg.selectAll('path#' + idAttr)
      .data([d])
      .enter().append('path')
      .attr('id', idAttr)
      .attr('class', 'land')
      .attr('d', path)
      .style('fill', color);
  });

  // Draw lakes on the globe
  svg.selectAll('path.lake')
    .data(lakes)
    .enter().append('path')
    .attr('class', 'lake')
    .attr('d', path);

  // Register mouse events when on land
  svg.selectAll('path.land')
    .on('mouseover', function (d) {
      countryTooltip
        .style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px')
    })
    .on('mouseenter', function (d) {
      hoveredId = d.id;
      updateTooltipText();
      countryTooltip.style('display', 'block')
        .style('opacity', 1);
    })
    .on('mouseout', function (d) {
      hoveredId = null;
      countryTooltip.style('display', 'none')
        .style('opacity', 0);
    })
    .on('mousemove', function (d) {
      countryTooltip.style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px');
    })
    .on('mousedown', function (d) {
      hasDragged = false;
    })
    .on('mouseup', function (d) {
      if (!hasDragged && cashBalCtrl.hasCashBalance(d.id)) {
        openTransactionSummaryPage(d.id);
      }
    });

  // Register globe events
  svg.selectAll('path')
  // Drag event
    .call(d3.behavior.drag()
      .origin(function () {
        var r = projection.rotate();
        return {x: r[0] / sens, y: -r[1] / sens};
      })
      .on('drag', function () {
        hasDragged = true;
        var rotate = projection.rotate();
        var lambda = d3.event.x * sens;
        var phi = -d3.event.y * sens;
        var gamma = rotate[2];
        //Restriction for rotating upside-down
        if (Math.abs(phi) > rot_phi_limit) {
          phi = Math.sign(phi) * rot_phi_limit;
        }
        projection.rotate([lambda, phi, gamma]);
        refresh();
        svg.selectAll('.focused').classed('focused', focused = false);
      }))
    // Zoom event
    .call(d3.behavior.zoom()
      .scale(projection.scale())
      .scaleExtent([scale_min, scale_max])
      .on('zoom', function () {
        var scale = d3.event.scale;
        projection.scale(scale);

        var scaleFactor = (scale - scale_0) / Math.max(scale_max - scale_0, scale_0 - scale_min);
        sens = sens_0 - sens_adjust * Math.sign(scaleFactor) * Math.sqrt(Math.abs(scaleFactor));
        refresh();
      }));

  if (animate) {
    startAnimation();
  }

  // ================================================================
  // Common globe functions

  // Redraw paths on the globe
  function refresh() {
    svg.selectAll('path.land').attr('d', path);
    svg.selectAll('path.water').attr('d', path);
    svg.selectAll('path.lake').attr('d', path);
  }

  // Update tooltip text
  function updateTooltipText() {
    if (!_.isNil(hoveredId)) {
      var currencyName = cashBalCtrl.getCurrencyNames()[hoveredId];
      var amountString = getAmountString(hoveredId);
      countryTooltip.text(cashBalCtrl.getCountryNames()[hoveredId] +
        (amountString === '' ? '' : '\nAmount: ' + amountString) +
        (_.isNil(currencyName) ? '' : '\nCurrency: ' + currencyName));
    }
  }

  function updateCashBalanceTable(id) {
    var currencyCode = cashBalCtrl.getCurrencyCodes()[id];
    var cashBalance = cashBalCtrl.getCashBalanceString(id);
    var cashBalanceInBaseCurrency = cashBalCtrl.getCashBalanceString(id, {inBaseCurrency: true});

    var rowClass = 'cash-balance-row-' + currencyCode;
    var currencyRow = cashBalanceTable.find('tbody tr.' + rowClass);

    if (currencyRow.length > 0) {
      currencyRow.find('.cash-balance').text(cashBalance);
      currencyRow.find('.cash-balance-base-currency').text(cashBalanceInBaseCurrency);
    } else {
      currencyRow = $('<tr>')
        .addClass(rowClass)
        .append($('<td>')
          .addClass('bold')
          .text(currencyCode))
        .append($('<td>')
          .addClass('cash-balance')
          .css('text-align', 'right')
          .text(cashBalance))
        .append($('<td>')
          .addClass('cash-balance-base-currency')
          .css('text-align', 'right')
          .text(cashBalanceInBaseCurrency));
      cashBalanceTable.find('tbody').append(currencyRow);
      cashBalanceTable.on('click', 'tr.' + rowClass, function () {
        openTransactionSummaryPage(id);
      });
    }

    if (!tableSorterInitialized) {
      // Initialize table sorter (needs to be here because table must have data first)
      cashBalanceTable.tablesorter({
        // Default sort
        sortList: [[2, 1]],
        // Remove commas from the string
        textExtraction: function (node) {
          return node.innerHTML.replace(/,/g, '');
        }
      });
      tableSorterInitialized = true;
    }

    cashBalanceTable.trigger('update');
    setTimeout(function () {
      // Sort the table again (after some delay so that the table contains the new balances)
      var sorting = cashBalanceTable.get(0).config.sortList;
      cashBalanceTable.trigger('sorton', [sorting]);
    }, 10);
  }

  // Start/stop animating the rotation of the globe
  function startAnimation() {
    animate = true;
    d3.timer(function () {
      var rotate = projection.rotate();
      projection.rotate([rotate[0] + rot_v_lambda, rotate[1] + rot_v_phi, rotate[2] + rot_v_gamma]);
      refresh();
      return !animate;
    });
  }

  function stopAnimation() {
    animate = false;
    refresh();
  }

  // Open transaction summary page for given currency id
  function openTransactionSummaryPage(id) {
    var currencyCode = cashBalCtrl.getCurrencyCodes()[id];
    var url = base_url + 'transactions?curr=' + currencyCode;
    window.open(url);
  }

  // ================================================================
  // Helper functions

  function cashBalanceToColor(cashBalance) {
    var r, g, b, f;
    if (_.isNil(cashBalance)) {
      return '#333333';
    } else if (cashBalance < cash_bal_danger) {
      r = 255;
      g = 0;
      b = 0;
    } else if (cashBalance < cash_bal_warn) {
      f = Math.min(1, (cashBalance - cash_bal_warn) / (cash_bal_danger - cash_bal_warn));
      r = 255;
      g = 127 - Math.floor(127 * f);
      b = 0;
    } else if (cashBalance < cash_bal_zero) {
      f = Math.min(1, (cashBalance - cash_bal_zero) / (cash_bal_warn - cash_bal_zero));
      r = 255;
      g = 255 - Math.floor(128 * f);
      b = 0;
    } else if (cashBalance < cash_bal_ok) {
      f = Math.min(1, (cashBalance - cash_bal_zero) / (cash_bal_ok - cash_bal_zero));
      r = 255 - Math.floor(255 * Math.sqrt(f));
      g = 255;
      b = 0;
    } else {
      f = Math.min(1, (cashBalance - cash_bal_ok) / (cash_bal_excess - cash_bal_ok));
      r = 0;
      g = 255;
      b = Math.floor(255 * f);
    }
    return '#' + [r, g, b].map(function (c) {
        return _.padStart(c.toString(16).toUpperCase(), 2, '0');
      }).join('');
  }

  function getAmountString(i) {
    var amountString = cashBalCtrl.getCashBalanceString(i, {withCurrencySymbol: true});
    if (cashBalCtrl.hasCashBalance(i) && !cashBalCtrl.isInBaseCurrency(i)) {
      amountString += ' (' + cashBalCtrl.getCashBalanceString(i, {
          withCurrencySymbol: true,
          inBaseCurrency: true
        }) + ')';
    }
    return amountString;
  }
}