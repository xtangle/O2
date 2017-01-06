// globe.js
// Dependencies: jquery, lodash, socket.io, d3, d3.topojson, d3.queue

// Socket.io
var serverUrl = getCookieValue('Server-URL');
var socket = io(serverUrl);
socket.emit('subscribe', 'message-from-server');
socket.on('connect', function () {
  socket.on('message-from-server', function (data) {
    console.log(data);
    // Update the Market Name
    $('#transaction').text(data.transaction.transaction);
    // Update the Buy price
    $('#currency').text(data.transaction.currency);
    // Update the Sell price
    $('#amount').text(data.transaction.amount);
  });
});

// Cash balance parameters
const base_currency_code = 'EUR', base_currency_symbol = '€';
const conversion_rate_resource_url = '//api.fixer.io/latest?base=' + base_currency_code;
const cash_danger = -10000, cash_warn = -1000, cash_zero = 0, cash_ok = 100000, cash_excess = 1000000;

// Globe parameters
const width = 600, height = 500;
const sens_0 = 0.25, sens_adjust = 0.2;
const scale_0 = 245, scale_min = 150, scale_max = 1000;

var sens = sens_0;
var focused = false;

// Setting projection
var projection = d3.geo.orthographic()
  .scale(scale_0)
  .rotate([0, -90])
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
var countryList = d3.select('body').append('select').attr('name', 'countries');

queue()
  .defer(d3.json, 'globe/world-110m-withlakes.json')
  .defer(d3.tsv, 'globe/world-110m-country-currency-data.tsv')
  .defer(d3.json, conversion_rate_resource_url)
  .await(ready);

// Main function
function ready(error, world, countryCurrencyData, conversionRatesData) {
  if (error) {
    throw error;
  }

  var countryNames = {};
  var currencyNames = {};
  var currencyCodes = {};
  var currencySymbols = {};
  var cashBalances = {}; // Non-normalized cash balance amounts
  var conversionRates = conversionRatesData.rates;

  var countries = topojson.feature(world, world.objects.countries).features;
  var lakes = topojson.feature(world, world.objects.ne_110m_lakes).features;

  // Initialize data and adding countries to select
  countryCurrencyData.forEach(function (d) {
    countryNames[d.id] = d.name;
    currencyNames[d.id] = d.currency_name;
    currencyCodes[d.id] = d.currency_code;
    currencySymbols[d.id] = d.currency_symbol;

    var option = countryList.append('option');
    option.text(d.name);
    option.property('value', d.id);
  });

  // Initialize cash balances (for testing)
  (function initializeCashBalances() {
    function setCashBalancesForCurrency(currencyCode, cashBalance) {
      indicesOf(currencyCodes, currencyCode).forEach(function (i) {
        cashBalances[i] = cashBalance;
      });
    }
    setCashBalancesForCurrency('CAD', 80000);
    setCashBalancesForCurrency('USD', 600000);
    setCashBalancesForCurrency('INR', -80000);
    setCashBalancesForCurrency('EUR', 12000000);
    setCashBalancesForCurrency('GBP', 700000);
    setCashBalancesForCurrency('CNY', 0);
    setCashBalancesForCurrency('JPY', -50000);
  })();

  // Drawing countries on the globe
  countries.forEach(function (d) {
    var cashBalance = cashBalances[d.id];
    var currencyCode = currencyCodes[d.id];
    var normalizedCashBalance = getNormalizedCashBalance(cashBalance, currencyCode);
    var color = cashBalanceToColor(normalizedCashBalance);
    svg.selectAll('path#country-' + d.id)
      .data([d])
      .enter().append('path')
      .attr('class', 'land')
      .attr('d', path)
      .style('fill', 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')');
  });

  // Land events
  svg.selectAll('path.land')
  // Mouse events
    .on('mouseover', function (d) {
      var cashBalance = cashBalances[d.id];
      var currencySymbol = currencySymbols[d.id];
      var currencyName = currencyNames[d.id];
      var currencyCode = currencyCodes[d.id];
      countryTooltip.text(countryNames[d.id] +
        (_.isNil(cashBalance) || _.isNil(currencySymbol) ? '' : '\nAmount: ' + getAmountString(cashBalance, currencyCode, currencySymbol)) +
        (_.isNil(currencyName) ? '' : '\nCurrency: ' + currencyName))
        .style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px')
        .style('display', 'block')
        .style('opacity', 1);
    })
    .on('mouseout', function (d) {
      countryTooltip.style('opacity', 0)
        .style('display', 'none');
    })
    .on('mousemove', function (d) {
      countryTooltip.style('left', (d3.event.pageX + 7) + 'px')
        .style('top', (d3.event.pageY - 15) + 'px');
    });

  // Drawing lakes on the globe
  svg.selectAll('path.lake')
    .data(lakes)
    .enter().append('path')
    .attr('class', 'lake')
    .attr('d', path);

  // Globe events
  svg.selectAll('path')
  // Drag event
    .call(d3.behavior.drag()
      .origin(function () {
        var r = projection.rotate();
        return {x: r[0] / sens, y: -r[1] / sens};
      })
      .on('drag', function () {
        var rotate = projection.rotate();
        projection.rotate([d3.event.x * sens, -d3.event.y * sens, rotate[2]]);
        svg.selectAll('path.land').attr('d', path);
        svg.selectAll('path.lake').attr('d', path);
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

        svg.selectAll('path.land').attr('d', path);
        svg.selectAll('path.water').attr('d', path);
        svg.selectAll('path.lake').attr('d', path);
      }));

  // Country focus on option select
  d3.select('select').on('change', function () {
    var rotate = projection.rotate(),
      focusedCountry = country(countries, this),
      p = d3.geo.centroid(focusedCountry);

    svg.selectAll('.focused').classed('focused', focused = false);

    // Globe rotating
    (function transition() {
      d3.transition()
        .duration(2500)
        .tween('rotate', function () {
          var r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
          return function (t) {
            projection.rotate(r(t));
            svg.selectAll('path').attr('d', path)
              .classed('focused', function (d, i) {
                return d.id == focusedCountry.id ? focused = d : false;
              });
          };
        })
    })();
  });

  function country(cnt, sel) {
    for (var i = 0, l = cnt.length; i < l; i++) {
      if (cnt[i].id == sel.value) {
        return cnt[i];
      }
    }
  }

  // Set an interval to retrieve the latest conversion rates
  (function getConversionRates() {
    setTimeout(function () {
      d3.json(conversion_rate_resource_url, function (data) {
        conversionRatesData = data;
        conversionRates = conversionRatesData.rates;
        getConversionRates();
      });
    }, 10000);
  })();

  // Below are some helper functions

  function indicesOf(obj, value) {
    return _.keys(obj).filter(function (k) {
      return obj[k] === value;
    });
  }

  function cashBalanceToColor(cashBalance) {
    var r, g, b, f;
    if (_.isNil(cashBalance)) {
      r = g = b = 177;
    } else if (cashBalance < cash_danger) {
      r = 255;
      g = 0;
      b = 0;
    } else if (cashBalance < cash_warn) {
      f = Math.min(1, (cashBalance - cash_warn) / (cash_danger - cash_warn));
      r = 255;
      g = 127 - Math.floor(127 * f);
      b = 0;
    } else if (cashBalance < cash_zero) {
      f = Math.min(1, (cashBalance - cash_zero) / (cash_warn - cash_zero));
      r = 255;
      g = 255 - Math.floor(128 * f);
      b = 0;
    } else if (cashBalance < cash_ok) {
      f = Math.min(1, (cashBalance - cash_zero) / (cash_ok - cash_zero));
      r = 255 - Math.floor(255 * Math.sqrt(f));
      g = 255;
      b = 0;
    } else {
      f = Math.min(1, (cashBalance - cash_ok) / (cash_excess - cash_ok));
      r = 0;
      g = 255;
      b = Math.floor(255 * f);
    }
    return {r: r, g: g, b: b};
  }

  function getNormalizedCashBalance(cashBalance, currencyCode) {
    if (_.isNil(cashBalance) || _.isNil(currencyCode)) {
      return null;
    } else if (currencyCode === base_currency_code) {
      return cashBalance;
    } else {
      return Math.round(cashBalance / conversionRates[currencyCode]);
    }
  }

  function getAmountString(cashBalance, currencyCode, currencySymbol) {
    var amountString = '';
    var displayBaseCurrency = (currencyCode !== base_currency_code);
    var normalizedCashBalance;

    if (displayBaseCurrency) {
      normalizedCashBalance = getNormalizedCashBalance(cashBalance, currencyCode);
    }

    if (cashBalance < 0) {
      amountString += '-' + currencySymbol + (-cashBalance).toLocaleString() + ' ' + currencyCode;
      if (displayBaseCurrency) {
        amountString += ' (-' + base_currency_symbol + (-normalizedCashBalance).toLocaleString() + ' ' + base_currency_code + ')';
      }
    } else {
      amountString += currencySymbol + cashBalance.toLocaleString() + ' ' + currencyCode;
      if (displayBaseCurrency) {
        amountString += ' (' + base_currency_symbol + normalizedCashBalance.toLocaleString() + ' ' + base_currency_code + ')';
      }
    }
    return amountString;
  }

}

function getCookieValue(cookieName) {
  var cookieValue = null;
  document.cookie.split(';').forEach(function (cookie) {
    var a = cookie.split('=');
    if (a[0].trim() === cookieName) {
      cookieValue = a[1].trim();
    }
  });
  return cookieValue;
}