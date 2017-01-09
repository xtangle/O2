// cashBalanceController.js
// Dependencies: jquery, lodash, d3, socket.io

var cashBalCtrl = (function () {

  // Private constants
  const base_currency_code = 'EUR';
  const base_currency_symbol = '€';
  const country_currency_data_file = 'globe/world-110m-country-currency-data.tsv';
  const conversion_rate_resource_url = '//api.fixer.io/latest?base=' + base_currency_code;
  const conversion_rate_update_period_in_ms = 60000;

  var cashBalances = {};
  var cashBalancesInBaseCurrency = {};

  var countryNames = {};
  var currencyNames = {};
  var currencyCodes = {};
  var currencySymbols = {};
  var conversionRates = {};

  var newTransactionCallback = _.noop();
  var cashBalanceUpdateCallback = _.noop();

  // Public interface
  const controller = {
    init: function (callback) {
      getCountryCurrencyData().then(function (data) {
        data.forEach(function (d) {
          countryNames[d.id] = d.name;
          currencyNames[d.id] = d.currency_name;
          currencyCodes[d.id] = d.currency_code;
          currencySymbols[d.id] = d.currency_symbol;
        });
        return getConversionRates();
      }).then(function (rates) {
        conversionRates = rates;

        // Initialize cash balances, for now set to false
        if (false) {
          var initialBalances = [['CAD', 100000], ['USD', 100000], ['INR', -80000], ['EUR', 100000],
            ['GBP', 70000], ['CNY', 0], ['JPY', -5000], ['AUD', 250000]];
          initialBalances.map(function (p) {
            setCashBalancesForCurrency(p[0], p[1], {inBaseCurrency: true});
          });
        }

        initializeSocketConnection();
        startUpdatingConversionRates();
        callback();
      });
    },

    getCountryNames: function () {
      return countryNames;
    },
    getCashBalances: function () {
      return cashBalances;
    },
    getCashBalancesInBaseCurrency: function () {
      return cashBalancesInBaseCurrency;
    },
    getCurrencyNames: function () {
      return currencyNames;
    },
    getCurrencyCodes: function () {
      return currencyCodes;
    },
    getCurrencySymbols: function () {
      return currencySymbols;
    },
    getConversionRates: function () {
      return conversionRates;
    },

    getBaseCurrencyCode: function () {
      return base_currency_code;
    },
    getBaseCurrencySymbol: function () {
      return base_currency_symbol;
    },
    hasCashBalance: function (i) {
      return !_.isNil(cashBalances[i]);
    },
    isInBaseCurrency: function (i) {
      return currencyCodes[i] === base_currency_code;
    },

    getCashBalanceString: function (i, options) {
      if (_.isNil(cashBalances[i])) {
        return '';
      }
      var cashBalString = Math.round(cashBalances[i]) < 0 ? '-' : '';
      if (_.get(options, 'inBaseCurrency')) {
        cashBalString += _.get(options, 'withCurrencySymbol') ? base_currency_symbol : '';
        cashBalString += Math.round(Math.abs(cashBalancesInBaseCurrency[i])).toLocaleString();
      } else {
        cashBalString += _.get(options, 'withCurrencySymbol') ? currencySymbols[i] : '';
        cashBalString += Math.round(Math.abs(cashBalances[i])).toLocaleString();
      }
      return cashBalString;
    },

    getCashBalanceForCurrency: function (currencyCode, options) {
      var id = _.findKey(currencyCodes, function(c) { return c === currencyCode; });
      return _.get(options, 'inBaseCurrency') ? cashBalancesInBaseCurrency[id] : cashBalances[id];
    },

    updateBalances: function (transaction) {
      var ids = indicesOf(currencyCodes, transaction.settlementCurrency);
      ids.forEach(function (i) {
        setCashBalance(i, _.defaultTo(cashBalances[i], 0) + transaction.netSettlementAmount);
      });
      cashBalanceUpdateCallback(ids);
    },

    onNewTransaction: function (callback) {
      newTransactionCallback = callback;
    },

    onCashBalanceUpdate: function (callback) {
      cashBalanceUpdateCallback = callback;
    }
  };

  // Private methods
  function convert(cashBalance, currencyCode, convertFunc) {
    if (_.isNil(cashBalance) || _.isNil(currencyCode)) {
      return null;
    } else if (currencyCode === base_currency_code) {
      return cashBalance;
    } else {
      return convertFunc(cashBalance, conversionRates[currencyCode]);
    }
  }

  function convertToBaseCurrency(cashBalance, currencyCode) {
    return convert(cashBalance, currencyCode, function (bal, rate) {
      return bal / rate;
    });
  }

  function convertToLocalCurrency(cashBalance, currencyCode) {
    return convert(cashBalance, currencyCode, function (bal, rate) {
      return bal * rate;
    });
  }

  function indicesOf(obj, value) {
    return _.keys(obj).filter(function (k) {
      return obj[k] === value;
    });
  }

  function setCashBalance(i, cashBalance, options) {
    if (_.get(options, 'inBaseCurrency')) {
      cashBalances[i] = convertToLocalCurrency(cashBalance, currencyCodes[i]);
      cashBalancesInBaseCurrency[i] = cashBalance;
    } else {
      cashBalances[i] = cashBalance;
      cashBalancesInBaseCurrency[i] = convertToBaseCurrency(cashBalance, currencyCodes[i]);
    }
  }

  function setCashBalancesForCurrency(currencyCode, cashBalance, options) {
    indicesOf(currencyCodes, currencyCode).forEach(function (i) {
      setCashBalance(i, cashBalance, options);
    });
  }

  function getCountryCurrencyData() {
    return new Promise(function (resolve, reject) {
      d3.tsv(country_currency_data_file, function (error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      })
    });
  }

  function getConversionRates() {
    return new Promise(function (resolve, reject) {
      // The random number appended to the url is to prevent caching
      var rand = Math.floor(Math.random() * 1000000);
      d3.json(conversion_rate_resource_url + '&r' + rand, function (error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data.rates);
        }
      });
    });
  }

  // Periodically retrieve the latest conversion rates
  function startUpdatingConversionRates() {
    setTimeout(function () {
      getConversionRates().then(function (rates) {
        conversionRates = rates;
        startUpdatingConversionRates();
      });
    }, conversion_rate_update_period_in_ms);
  }

  // Initialize socket connection to receive real time transaction updates
  function initializeSocketConnection() {
    var socket = io();
    socket.emit('subscribe', 'message-from-server');
    socket.on('connect', function () {
      socket.on('message-from-server', function (data) {
        newTransactionCallback(data.transaction);
        controller.updateBalances(data.transaction);
      });
    });
  }

  return controller;
})();